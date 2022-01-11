import {EventDispatcher} from 'three';
import {NetClient, InitNetParams} from '../network/NetClient';
import {MessagesHelper, IMessage, TypMessages} from '../protocol/Protocol';
import * as protocol from '../protocol/Protocol';
import {TimeSystem} from './TimeSystem';

type ValueOf<T> = T[keyof T];

type CallbackEvent = (data:any) => void;

interface CallbackInfo{
	handler:CallbackEvent;
	isTimeEvent:boolean;
}


export class ClientSystem extends EventDispatcher{

	public idLocalEntity:number = -1;
	private idLocalUser:number = -1;
	private net:NetClient;
	private timeSystem:TimeSystem;
	private typMessages:typeof TypMessages;
	private eventCallbacks:{[k:string]:CallbackInfo[]} = {};

	constructor(url:string, messagesHelper:typeof MessagesHelper, typMessages:typeof TypMessages)
	{
		super();
		this.net = new NetClient(url, messagesHelper);
		this.timeSystem = new TimeSystem();
		this.typMessages = typMessages;
	}

	init(params:InitNetParams)
	{
		this.net.init(params);
		this.net.addEventListener('message', this.onMessage.bind(this));
	}

	isReady()
	{
		return this.net.isReady;
	}

	private onMessage(e:any)
	{
		var event:{typ:number,message:any, system:boolean} = e;
		// init
		if (event.typ == protocol.MessageScInit.GetType())
		{
			let message = event.message as protocol.IScInit;
			this.idLocalUser = message.idUser;
		}
		// join
		else if (event.typ == protocol.MessageScJoin.GetType())
		{
			let message = event.message as protocol.IScJoin;
			this.idLocalEntity = message.idEntity;
			this.dispatchEvent({type:'userJoin', idUser:message.idUser, idEntity:message.idEntity, isLocal:message.idUser == this.idLocalUser});
		}
		// leave
		else if (event.typ == protocol.MessageScLeave.GetType())
		{
			let message = event.message as protocol.IScLeave;
			var isLocal = message.idUser == this.idLocalUser;
			if (isLocal)
				this.idLocalUser = -1;
			this.dispatchEvent({type:'userLeave', idUser:message.idUser, isLocal:isLocal});
		}
		// world state
		else if (event.typ == protocol.MessageScWorldStateUpdate.GetType())
		{
			let message = event.message as protocol.IScWorldStateUpdate;
			event.system = true;
			this.dispatchEvent({type:'worldState', list:message.list});
		}
		else
		{
			if (!event.system)
				this.callRegisterMessages(event.typ, event.message);
		}
		if (!event.system){
			var cl:any = this.typMessages[event.typ as keyof IMessage];
			console.log('Server ->', cl.GetName(), e.message);
		}
	}

	private callRegisterMessages(typ:number, message:IMessage)
	{
		if (this.eventCallbacks[typ] === undefined)
			return console.warn("Не зарегистрированное сообщение:", typ, message);
		var list = this.eventCallbacks[typ];
		for (var i = 0; i < list.length; ++i)
		{
			var ed = list[i];
			if (!ed.isTimeEvent)
				ed.handler(message);
			else
				this.timeSystem.addInterpolateEvent(ed.handler, message);
		}
	}

	private getIdMessage(message:ValueOf<typeof TypMessages>)
	{
		for (var k in this.typMessages)
		{
			var m:any = this.typMessages[k as keyof IMessage];
			if (m.GetType()  === message.GetType())
				return m.GetType();
		}
		return -1;
	}

	//private registerMessage<T extends ValueOf<typeof TypMessages>>(message: T, callback:(arg: T) => void, isTimeEvent:boolean)
	private registerMessage(message:ValueOf<typeof TypMessages>, callback:CallbackEvent, isTimeEvent:boolean)
	{
		var id = this.getIdMessage(message);
		if (id == -1)
		{
			console.warn("Сообщение для регистрации не найдено:", message);
			return false;
		}
		if (this.eventCallbacks[id] === undefined)
			this.eventCallbacks[id] = [];
		this.eventCallbacks[id].push({handler:callback, isTimeEvent:isTimeEvent});
		return true;
	}

	//registerMessageEvent<T extends ValueOf<typeof TypMessages>>(message: T, callback:(arg: T) => void)
	registerMessageEvent(message:ValueOf<typeof TypMessages>, callback:CallbackEvent)
	{
		return this.registerMessage(message, callback, false);
	}

	registerTimeMessageEvent(message:ValueOf<typeof TypMessages>, callback:CallbackEvent)
	{
		return this.registerMessage(message, callback, true);
	}

	sendMessage(idMessage:number, message:protocol.IMessage)
	{
		return this.net.sendMessage(idMessage, message, this.typMessages);
	}

	update(deltaTime:number)
	{
		this.timeSystem.update(deltaTime);
	}


}