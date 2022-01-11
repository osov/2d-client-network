import {EventDispatcher} from 'three';
import {WsClient} from './WsClient';
import {DataHelper} from '../protocol/DataHelper';
import {MessagesHelper, TypMessages} from '../protocol/Protocol';
import * as protocol from '../protocol/Protocol';

import {ExponentialMovingAverage} from '../core/ExponentialMovingAverage';

export interface InitNetParams{
	idSession:string;
}

export class NetClient extends EventDispatcher{

	private batchInterval = 1/30;
	private minInterpolate = 50;
	private maxInterpolate = 500;
	public interpolateTime:number = 150;
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
	private viewerReader:DataHelper;
	private viewerWriter:DataHelper;
	private messagesHelper:typeof MessagesHelper;
	private initParams:InitNetParams;
	private eventCallbacks:{[k:string]:[]} = {};
	public isReady:boolean = false;
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
		this.viewerReader = new DataHelper();
		this.viewerWriter = new DataHelper();
		NetClient.instance = this;
	}

	init(params:InitNetParams)
	{
		this.initParams = params;
		this.socket.connect(this.url);
	}

	private onOpen(event:any)
	{
		this.messagesHelper.PackCsConnect(this.viewerWriter, {idSession:this.initParams.idSession});
		this.sendBuffer();
		this.isReady = true;
	}

	private onClose()
	{
		this.dispatchEvent({type:"onClose"});
		this.dispatchEvent({type:"onEnd"});
	}

	private onPack(event:any)
	{
		var buffer = new Uint8Array(event.data);
		var packs = this.messagesHelper.UnPackMessages(this.viewerReader, buffer);
		if (packs.length == 0)
			return;
		for (var i = 0; i < packs.length; i++)
		{
			var pack = packs[i];
			this.onMessage(pack.typ, pack.message);
		}
	}

	private onMessage(typ:number, srcMessage:protocol.IMessage)
	{
		var isSystem = false;
		// init
		if (typ == protocol.MessageScInit.GetType())
		{
			isSystem = true;
			let message = srcMessage as protocol.IScInit;
			this.startServerTime = Number(message.serverStartTime);
			this.sendPing();
			console.log("Подключение успешно");
		}
		// close
		else if (typ == protocol.MessageScClose.GetType())
		{
			isSystem = true;
			this.socket.stop();
			console.log("Закрыли соединение");
			this.dispatchEvent({type:"onEnd"});
		}
		// pong
		else if (typ == protocol.MessageScPong.GetType())
		{
			isSystem = true;
			this.onPong(srcMessage as protocol.IScPong)
		}
		// timestamp
		else if (typ == protocol.MessageScTimestamp.GetType())
		{
			isSystem = true;
			let message = srcMessage as protocol.IScTimestamp;
			this.lastRecvServerTime = this.startServerTime + message.offsetTime; // восстанавливаем время которое было на сервере в момент отправки
		}
		this.dispatchEvent({type:'message', typ:typ, message:srcMessage, system:isSystem});
	}

	private updateInterpolateTime()
	{
		var now = this.now();
		if (now < this.lastInterpolateTime + 500)
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
				if (this.interpolateTime > this.maxInterpolate)
					this.interpolateTime = this.maxInterpolate;
				if (this.interpolateTime < this.minInterpolate)
					this.interpolateTime = this.minInterpolate;
				console.log("Уменьшаем время интерполяции:", Number(old.toFixed(2)), " -> ", Number(this.interpolateTime.toFixed(2)));
			}
		}
		// интерполяция не успевает, т.к. обновления приходят с большей задержкой
		else
		{
			this.interpolateTime = calcInterp * 1.2; // берем 120% от рассчетной
			if (this.interpolateTime > this.maxInterpolate)
				this.interpolateTime = this.maxInterpolate;
			if (this.interpolateTime < this.minInterpolate)
				this.interpolateTime = this.minInterpolate;
			console.log("Увеличиваем время интерполяции:", Number(old.toFixed(2)), " -> ", Number(this.interpolateTime.toFixed(2)));
		}
	}

	now()
	{
		return Date.now();
	}

	// время которое было на сервере в момент отправки пакета(самый первый пакет в событии onSocketUpdate и до пакета IScWorldStateUpdate)
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
		this.messagesHelper.PackCsPing(this.viewerWriter, {clientTime:BigInt(this.now())});
		this.sendBuffer();
	}

	private onPong(message:protocol.IScPong)
	{
		this.cntPong++;
		if (this.cntPong == 20)
			this.pingFrequency = 2000;

		var now = this.now();
		var newRtt = now - Number(message.clientTime);
		this.rtt.add(newRtt);
		if (newRtt < this.bestRtt)
		{
			this.bestRtt = newRtt;
			this.lastRecvServerTime = this.startServerTime + message.offsetTime; // восстанавливаем время которое было на сервере в момент отправки
			this.localServerTime = this.lastRecvServerTime + newRtt * 0.5;
			this.localStartTime = now;
			//console.log("Best RTT:", this.bestRtt + "/st:"+ this.localServerTime+"/lt:"+ this.localStartTime);
		}
		//this.updateInterpolateTime();
		setTimeout(this.sendPing.bind(this), this.pingFrequency);
	}

	sendMessage(idMessage:number, message:protocol.IMessage, typMessages:typeof TypMessages)
	{
		var messagePacker:any = typMessages[idMessage as keyof protocol.IMessage];
		messagePacker.Pack(this.viewerWriter, message);
		return this.sendBuffer();
	}

	sendBuffer()
	{
		var data = this.viewerWriter.toArray();
		if (data.byteLength > 0)
		{
			this.socket.send(data);
			this.viewerWriter.startWriting();
		}
		else
			console.warn("Нет данных для отправки");
	}





}


