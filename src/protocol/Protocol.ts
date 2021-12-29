// Code generated by protgen; DO NOT EDIT.
import {DataHelper} from './DataHelper';





export interface IMessage{}

export interface IMessageData{
	typ:number;
	message:IMessage;
}

export interface ICsConnect extends IMessage{
	readonly idSession : string;	
}

export const MessageCsConnect = {

	Pack(message:ICsConnect): number {
		const view = DataHelper.getInstance();
		view.writeByte(MessageCsConnect.GetType());
		var len = this.PackMessage(message, view);
		return 1 + len;
	},

	PackMessage(message:ICsConnect, view:DataHelper):number {
		var a;
		const before = view.length;

		view.writeString(message.idSession);

		const after = view.length;
		return after - before;
	},

	UnPackMessage(view:DataHelper): ICsConnect {

		var prop_idSession = view.readString();

		var message:ICsConnect = {
				idSession : prop_idSession,
		};
		return message;
	},

	GetType(){
		return 100;
	}
}


export interface IScClose extends IMessage{	
}

export const MessageScClose = {

	Pack(message:IScClose): number {
		const view = DataHelper.getInstance();
		view.writeByte(MessageScClose.GetType());
		var len = this.PackMessage(message, view);
		return 1 + len;
	},

	PackMessage(message:IScClose, view:DataHelper):number {
		var a;
		const before = view.length;

		const after = view.length;
		return after - before;
	},

	UnPackMessage(view:DataHelper): IScClose {

		var message:IScClose = {
		};
		return message;
	},

	GetType(){
		return 101;
	}
}


export interface ICsPing extends IMessage{
	readonly clientTime : bigint;	
}

export const MessageCsPing = {

	Pack(message:ICsPing): number {
		const view = DataHelper.getInstance();
		view.writeByte(MessageCsPing.GetType());
		var len = this.PackMessage(message, view);
		return 1 + len;
	},

	PackMessage(message:ICsPing, view:DataHelper):number {
		var a;
		const before = view.length;

		if (message.clientTime < 0)
				throw new Error('protogen: protocol.cs_ping.client_time out of reach: '+ message.clientTime);
		if (message.clientTime > Number.MAX_SAFE_INTEGER)
			throw new Error('protogen: protocol.cs_ping.client_time exceeds Number.MAX_SAFE_INTEGER');
		view.writeUint64(message.clientTime);

		const after = view.length;
		return after - before;
	},

	UnPackMessage(view:DataHelper): ICsPing {

		var prop_clientTime = view.readUint64();

		var message:ICsPing = {
				clientTime : prop_clientTime,
		};
		return message;
	},

	GetType(){
		return 102;
	}
}


export interface IScPong extends IMessage{
	readonly clientTime : bigint;
	readonly offsetTime : number;	
}

export const MessageScPong = {

	Pack(message:IScPong): number {
		const view = DataHelper.getInstance();
		view.writeByte(MessageScPong.GetType());
		var len = this.PackMessage(message, view);
		return 1 + len;
	},

	PackMessage(message:IScPong, view:DataHelper):number {
		var a;
		const before = view.length;

		if (message.clientTime < 0)
				throw new Error('protogen: protocol.sc_pong.client_time out of reach: '+ message.clientTime);
		if (message.clientTime > Number.MAX_SAFE_INTEGER)
			throw new Error('protogen: protocol.sc_pong.client_time exceeds Number.MAX_SAFE_INTEGER');
		view.writeUint64(message.clientTime);

		if (message.offsetTime > 4294967295 || message.offsetTime < 0)
			throw new Error('protogen: protocol.sc_pong.offset_time out of reach: '+ message.offsetTime);
		view.writeUint32(message.offsetTime);

		const after = view.length;
		return after - before;
	},

	UnPackMessage(view:DataHelper): IScPong {

		var prop_clientTime = view.readUint64();

		var prop_offsetTime = view.readUint32();

		var message:IScPong = {
				clientTime : prop_clientTime,
				offsetTime : prop_offsetTime,
		};
		return message;
	},

	GetType(){
		return 103;
	}
}


export interface IScTimestamp extends IMessage{
	readonly offsetTime : number;	
}

export const MessageScTimestamp = {

	Pack(message:IScTimestamp): number {
		const view = DataHelper.getInstance();
		view.writeByte(MessageScTimestamp.GetType());
		var len = this.PackMessage(message, view);
		return 1 + len;
	},

	PackMessage(message:IScTimestamp, view:DataHelper):number {
		var a;
		const before = view.length;

		if (message.offsetTime > 4294967295 || message.offsetTime < 0)
			throw new Error('protogen: protocol.sc_timestamp.offset_time out of reach: '+ message.offsetTime);
		view.writeUint32(message.offsetTime);

		const after = view.length;
		return after - before;
	},

	UnPackMessage(view:DataHelper): IScTimestamp {

		var prop_offsetTime = view.readUint32();

		var message:IScTimestamp = {
				offsetTime : prop_offsetTime,
		};
		return message;
	},

	GetType(){
		return 104;
	}
}


export interface IScInit extends IMessage{
	readonly serverStartTime : bigint;
	readonly offsetTime : number;
	readonly idUser : number;
	readonly data : string;	
}

export const MessageScInit = {

	Pack(message:IScInit): number {
		const view = DataHelper.getInstance();
		view.writeByte(MessageScInit.GetType());
		var len = this.PackMessage(message, view);
		return 1 + len;
	},

	PackMessage(message:IScInit, view:DataHelper):number {
		var a;
		const before = view.length;

		if (message.serverStartTime < 0)
				throw new Error('protogen: protocol.sc_init.server_start_time out of reach: '+ message.serverStartTime);
		if (message.serverStartTime > Number.MAX_SAFE_INTEGER)
			throw new Error('protogen: protocol.sc_init.server_start_time exceeds Number.MAX_SAFE_INTEGER');
		view.writeUint64(message.serverStartTime);

		if (message.offsetTime > 4294967295 || message.offsetTime < 0)
			throw new Error('protogen: protocol.sc_init.offset_time out of reach: '+ message.offsetTime);
		view.writeUint32(message.offsetTime);

		if (message.idUser > 4294967295 || message.idUser < 0)
			throw new Error('protogen: protocol.sc_init.id_user out of reach: '+ message.idUser);
		view.writeUint32(message.idUser);

		view.writeString(message.data);

		const after = view.length;
		return after - before;
	},

	UnPackMessage(view:DataHelper): IScInit {

		var prop_serverStartTime = view.readUint64();

		var prop_offsetTime = view.readUint32();

		var prop_idUser = view.readUint32();

		var prop_data = view.readString();

		var message:IScInit = {
				serverStartTime : prop_serverStartTime,
				offsetTime : prop_offsetTime,
				idUser : prop_idUser,
				data : prop_data,
		};
		return message;
	},

	GetType(){
		return 105;
	}
}


export const TypMessages = {
	100: MessageCsConnect,
	101: MessageScClose,
	102: MessageCsPing,
	103: MessageScPong,
	104: MessageScTimestamp,
	105: MessageScInit,
}

export const TypIMessages = {
	ICsConnect: 100,
	IScClose: 101,
	ICsPing: 102,
	IScPong: 103,
	IScTimestamp: 104,
	IScInit: 105,
}

export const MessagesHelper = {
	Reset(){
		const view = DataHelper.getInstance();
		view.startWriting();
	},


	PackCsConnect(message:ICsConnect): number{
		return MessageCsConnect.Pack(message);
	},

	PackScClose(message:IScClose): number{
		return MessageScClose.Pack(message);
	},

	PackCsPing(message:ICsPing): number{
		return MessageCsPing.Pack(message);
	},

	PackScPong(message:IScPong): number{
		return MessageScPong.Pack(message);
	},

	PackScTimestamp(message:IScTimestamp): number{
		return MessageScTimestamp.Pack(message);
	},

	PackScInit(message:IScInit): number{
		return MessageScInit.Pack(message);
	},

	GetPackedArray(): Uint8Array {
		const view = DataHelper.getInstance();
		return view.toArray();
	},

	UnPackMessages(buffer:Uint8Array):Array<IMessageData>{
		var messages:Array<IMessageData> = [];
		const view = DataHelper.getInstance();
		view.startReading(buffer);
		while(view.index < view.length){
			var _typ = view.readByte();
			var packer:any = TypMessages[_typ as keyof IMessage];
			if (packer === undefined)
				throw new Error('protogen: packer not found:'+_typ);
			var _message = packer.UnPackMessage(view);
			messages.push({typ:_typ, message:_message});
		}
		return messages;
	}
}
