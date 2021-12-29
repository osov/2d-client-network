import {EventDispatcher} from 'three';
import {WsClient} from './WsClient';
import {MessagesHelper, IMessage, MessageScInit, IScInit, MessageScClose, IScClose,  MessageScPong, IScPong, MessageScTimestamp, IScTimestamp} from '../protocol/Protocol';
import {ExponentialMovingAverage} from '../core/ExponentialMovingAverage';

export interface InitNetParams{
	idSession:string;
}

export class NetClient extends EventDispatcher{

	private batchInterval = 1/30;
	private maxInterpolate = 0.5;
	public interpolateTime:number = 0.15;
	private socket:WsClient;
	private url:string;
	private localServerTime:number = 0;
	private localStartTime:number = 0;
	private lastPing:number = 1E10;
	private bestPing:number = 1E10;
	private cntPong:number = 0;
	private pingFrequency:number = 200;
	private bestRtt:number = 1E10;
	private lastInterpolateTime:number;
	private rtt:ExponentialMovingAverage = new ExponentialMovingAverage(10); // экспоненциально скользящая средняя
	private startServerTime:number;
	private lastRecvServerTime:number;
	private messagesHelper:typeof MessagesHelper;
	private initParams:InitNetParams;
	private eventCallbacks:{[k:string]:[]} = {};
	private static instance: NetClient;
	public static getInstance(): NetClient
	{
		if (!NetClient.instance)
			console.error("Клиент не создан !");
		return NetClient.instance;
	}


	constructor(url:string, messagesHelper:typeof MessagesHelper)
	{
		super();
		this.url = url;
		this.socket = new WsClient();
		this.socket.addEventListener('message', this.onPack.bind(this));
		this.socket.addEventListener('open', this.onOpen.bind(this));
		this.socket.addEventListener('close', this.onClose.bind(this));
		this.messagesHelper = messagesHelper;
		NetClient.instance = this;
	}

	init(params:InitNetParams)
	{
		this.initParams = params;
		this.socket.connect(this.url);
	}

	private onOpen(event:any)
	{
		this.messagesHelper.PackCsConnect({idSession:this.initParams.idSession});
	}

	private onClose()
	{
		this.dispatchEvent({type:"onClose"});
		this.dispatchEvent({type:"onEnd"});
	}

	private onPack(event:any)
	{
		var buffer = new Uint8Array(event.data);
		var packs = this.messagesHelper.UnPackMessages(buffer);
		if (packs.length == 0)
			return;
		for (var i = 0; i < packs.length; i++)
		{
			var pack = packs[i];
			this.onMessage(pack.typ, pack.message);
		}
	}

	private onMessage(typ:number, srcMessage:IMessage)
	{
		var isSystem = false;
		// init
		if (typ == MessageScInit.GetType())
		{
			isSystem = true;
			let message = srcMessage as IScInit;
			this.startServerTime = Number(message.serverStartTime);
			this.sendPing();
			console.log("Подключение успешно");
		}
		// close
		else if (typ == MessageScClose.GetType())
		{
			isSystem = true;
			this.socket.stop();
			console.log("Закрыли соединение");
			this.dispatchEvent({type:"onEnd"});
		}
		// pong
		else if (typ == MessageScPong.GetType())
		{
			isSystem = true;
			this.onPong(srcMessage as IScPong)
		}
		// timestamp
		else if (typ == MessageScTimestamp.GetType())
		{
			isSystem = true;
			let message = srcMessage as IScTimestamp;
			this.lastRecvServerTime = this.startServerTime + message.offsetTime;
		}
		this.dispatchEvent({type:'message', typ:typ, message:srcMessage, system:isSystem});
	}

	private updateInterpolateTime()
	{
		var now = this.now();
		if (now < this.lastInterpolateTime + 5)
			return;
		this.lastInterpolateTime = now;
		var maxOffsetServer = (this.batchInterval + 1 / 60) * 1.5;
		var calcInterp = Math.max(maxOffsetServer, this.rtt.get());
		var old = this.interpolateTime;
		// интерполяция сейчас успевает обрабатывать пакеты
		if (this.interpolateTime > calcInterp)
		{
			var perc = 100 - calcInterp / this.interpolateTime * 100;
			// но можно и чуть лучше сделать если есть запас
			if (perc > 30)
			{
				this.interpolateTime = calcInterp * 1.2;
				console.log("Уменьшаем время интерполяции:", (old * 1000), " -> ", (this.interpolateTime * 1000));
			}
		}
		// интерполяция не успевает, т.к. обновления приходят с большей задержкой
		else
		{
			this.interpolateTime = calcInterp * 1.2; // берем 120% от рассчетной
			if (this.interpolateTime > this.maxInterpolate)
				this.interpolateTime = this.maxInterpolate;
			console.log("Увеличиваем время интерполяции:", (old * 1000), " -> ", (this.interpolateTime * 1000));
		}
	}

	now()
	{
		return Date.now();
	}

	getLastServerTime()
	{
		return this.lastRecvServerTime;
	}

	getServerTime()
	{
		return (this.localServerTime + this.now() - this.localStartTime);
	}

	private sendPing()
	{
		this.messagesHelper.PackCsPing({clientTime:BigInt(this.now())});
		this.sendBuffer();
	}

	private onPong(message:IScPong)
	{
		this.cntPong++;
		if (this.cntPong == 20)
			this.pingFrequency = 2;

		var now = this.now();
		var newRtt = now - Number(message.clientTime);
		this.rtt.add(newRtt);

		if (newRtt < this.bestRtt)
		{
			this.bestRtt = newRtt;
			this.lastRecvServerTime = this.startServerTime + message.offsetTime;
			this.localServerTime = this.lastRecvServerTime + newRtt * 0.5;
			this.localStartTime = now;
			//console.log("Best RTT:", this.bestRtt + "/st:"+ this.localServerTime+"/lt:"+ this.localStartTime);
		}
		this.updateInterpolateTime();
		setTimeout(this.sendPing.bind(this), this.pingFrequency);
	}

	sendBuffer()
	{
		var data = this.messagesHelper.GetPackedArray();
		if (data.byteLength > 0)
			this.socket.send(data);
		else
			console.warn("Нет данных для отправки");
	}





}


