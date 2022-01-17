import { BaseSystem } from 'ecs-threejs';

export class WsClient extends BaseSystem
{
	private socketTimer = 0;
	private stopped = false;
	private url = '';
	private socket:WebSocket;

	constructor()
	{
		super();
	}

	socketOnMessage(message:MessageEvent)
	{
		this.dispatchEvent({type:'message', data: message.data});
	}

	send(data:ArrayBufferLike)
	{
		if (this.socket && typeof this.socket.readyState !== "undefined" && this.socket.readyState === WebSocket.OPEN)
			this.socket.send(data);
		else
			console.error("Socket != Open");
	};

	socketOnOpen(m:Event)
	{
		this.dispatchEvent({type:'open', client: this});
	}

	socketOnError(m:Event)
	{

	}

	stop()
	{
		this.stopped = true;
		this.socket.close();
	}

	socketOnClose(m:Event)
	{
		if (this.stopped)
			return;
		this.dispatchEvent({type:'close', client:this});
		if (this.socketTimer != 0)
		{
			clearTimeout(this.socketTimer);
			this.socketTimer = 0;
		}
		this.socketTimer = setTimeout(this.connect.bind(this), 3000) as any as number;
		console.warn("Socket disconnect...");
	}

	connect(url:string)
	{
		if (url !== undefined)
			this.url = url;
		this.socket = new WebSocket(this.url);
		this.socket.binaryType = 'arraybuffer';
		this.socket.onopen  = this.socketOnOpen.bind(this);
		this.socket.onmessage = this.socketOnMessage.bind(this);
		this.socket.onerror  = this.socketOnError.bind(this);
		this.socket.onclose  = this.socketOnClose.bind(this);
	};
}

