import {DataHelper} from './DataHelper';
import {IMessage, MessagesHelper, TypMessages} from './Protocol';

interface MessagesPacker{
	Pack(view:DataHelper, message:IMessage):void
	GetType():number;
}


export interface ProtocolInfo{
    MessagesHelper:typeof MessagesHelper;
    TypMessages:typeof TypMessages;
}



export type MessagesPackerList = {[k:string]:MessagesPacker};
