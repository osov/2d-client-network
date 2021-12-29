import {EventDispatcher} from 'three';
import {NetClient, InitNetParams} from '../network/NetClient';
import {MessagesHelper, IMessage, TypMessages} from '../protocol/Protocol';
import {TimeSystem} from './TimeSystem';

type ValueOf<T> = T[keyof T];

type CallbackEvent = (data:any) => void;

interface CallbackInfo{
	handler:CallbackEvent;
	isTimeEvent:boolean;
}


export class ClientSystem extends EventDispatcher{

	private net:NetClient;
	private timeSystem:TimeSystem;
	private messagesHelper:typeof MessagesHelper;
	private eventCallbacks:{[k:string]:CallbackInfo[]} = {};

	constructor(url:string, messagesHelper:typeof MessagesHelper)
	{
		super();
		this.net = new NetClient(url, messagesHelper);
		this.timeSystem = new TimeSystem();
		this.messagesHelper = messagesHelper;
	}

	init(params:InitNetParams)
	{
		this.net.init(params);
		this.net.addEventListener('message', this.onMessage.bind(this));
	}

	private onMessage(e:any)
	{
		var event:{typ:number,message:any, system:boolean} = e;
		if (event.system)
			return;
		this.callRegisterMessages(event.typ, event.message);
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
		for (var k in TypMessages)
		{
			var m = TypMessages[k as keyof IMessage];
			if (m  === message)
				return k;
		}
		return -1;
	}

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

	registerMessageEvent(message:ValueOf<typeof TypMessages>, callback:CallbackEvent)
	{
		return this.registerMessage(message, callback, false);
	}

	registerTimeMessageEvent(message:ValueOf<typeof TypMessages>, callback:CallbackEvent)
	{
		return this.registerMessage(message, callback, true);
	}

	update(deltaTime:number)
	{
		this.timeSystem.update(deltaTime);
	}


}