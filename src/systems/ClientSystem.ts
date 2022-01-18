import {BaseSystem} from 'ecs-threejs';
import {NetClient, InitNetParams} from '../network/NetClient';
import {IMessage} from '../protocol/Protocol';
import * as protocol from '../protocol/Protocol';
import {MessagesPackerList, ProtocolInfo} from '../protocol/TypesHelper';
import {TimeSystem} from './TimeSystem';

type ValueOf<T> = T[keyof T];

type CallbackEvent = (data:any) => void;

interface CallbackInfo{
	handler:CallbackEvent;
	isTimeEvent:boolean;
}

export class ClientSystem extends BaseSystem{

	public idLocalEntity:number = -1;
	private idLocalUser:number = -1;
	private net:NetClient;
	private timeSystem:TimeSystem;
	private typMessages:MessagesPackerList;
	private eventCallbacks:{[k:string]:CallbackInfo[]} = {};

	constructor(url:string, protocolInfo:ProtocolInfo)
	{
		super();
		this.net = new NetClient(url, protocolInfo.MessagesHelper);
		this.timeSystem = new TimeSystem();
		this.typMessages = protocolInfo.TypMessages;
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
		if (event.typ == protocol.IdMessages.IScInit)
		{
			let message = event.message as protocol.IScInit;
			this.idLocalUser = message.idUser;
			event.system = true;
		}
		// join
		else if (event.typ == protocol.IdMessages.IScJoin)
		{
			let message = event.message as protocol.IScJoin;
			const isLocal = message.idUser == this.idLocalUser;
			if (isLocal)
				this.idLocalEntity = message.idEntity;
			event.system = true;
			this.dispatchEvent({type:'userJoin', idUser:message.idUser, idEntity:message.idEntity, isLocal:isLocal});
		}
		// leave
		else if (event.typ == protocol.IdMessages.IScLeave)
		{
			let message = event.message as protocol.IScLeave;
			var isLocal = message.idUser == this.idLocalUser;
			if (isLocal)
				this.idLocalEntity = -1;
			event.system = true;
			this.dispatchEvent({type:'userLeave', idUser:message.idUser, isLocal:isLocal});
		}
		// world state
		else if (event.typ == protocol.IdMessages.IScWorldStateUpdate)
		{
			let message = event.message as protocol.IScWorldStateUpdate;
			event.system = true;
			this.dispatchEvent({type:'worldState', list:message.list});
		}
		else
		{
			if (event.typ == protocol.IdMessages.IScRemoveEntity)
			{
				let message = event.message as protocol.IScRemoveEntity;
				if (message.idEntity == this.idLocalEntity)
					this.idLocalEntity = -1;
			}
			if (!event.system)
				this.callRegisterMessages(event.typ, event.message);
		}
		if (!event.system || !true){
			var cl:any = this.typMessages[event.typ as keyof IMessage];
			//console.log('Server ->', cl.GetName(), e.message);
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

	private getIdMessage(message:ValueOf<MessagesPackerList>)
	{
		const id = this.typMessages[message.GetType() as keyof protocol.IMessage];
		return (id === undefined) ? -1 : message.GetType();
	}

	private registerMessage(message:ValueOf<MessagesPackerList>, callback:CallbackEvent, isTimeEvent:boolean)
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

	registerMessageEvent(message:ValueOf<MessagesPackerList>, callback:CallbackEvent)
	{
		return this.registerMessage(message, callback, false);
	}

	//registerTimeMessageEvent<T extends ValueOf<MessagesPackerList>>(message: T, callback:(arg: T) => void)
	registerTimeMessageEvent(message:ValueOf<MessagesPackerList>, callback:CallbackEvent)
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