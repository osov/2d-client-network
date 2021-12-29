import {EventDispatcher} from 'three';
import {NetClient} from '../network/NetClient';

type CallbackTime = (data:any, offset:number) => void;

interface CallbackInfo{
	handler:CallbackTime;
	data:any;
	addTime:number;
	isLocal:boolean;
}

export class TimeSystem extends EventDispatcher{

	private events:CallbackInfo[] = [];
	private net:NetClient;

	constructor()
	{
		super();
		this.net = NetClient.getInstance();
	}

	addDelayEvent(delay:number, handler:CallbackTime, data:any = null)
	{
		this.events.push({handler:handler, data:data, addTime:this.net.now() + delay, isLocal:true});
	}

	addInterpolateEvent(handler:CallbackTime, data:any = null)
	{
		var addTime = this.net.getLastServerTime() + this.net.interpolateTime;
		var delta = this.net.getServerTime() - addTime;
		if (delta > 0)
			return handler(data, delta);
		this.events.push({handler:handler, data:data, addTime:addTime, isLocal:false});
	}

	update(deltaTime:number)
	{
		var tmp = [];
		for (var i = 0; i < this.events.length; i++)
		{
			var event = this.events[i];
			var timeOffset;
			if (event.isLocal)
				timeOffset = this.net.now() - event.addTime;
			else
				timeOffset = this.net.getServerTime() - event.addTime;
			if (timeOffset >= 0)
			{
				event.handler(event.data, timeOffset);
				tmp.push(i);
			}
		}

		for (var i = tmp.length - 1; i >= 0; i--)
		{
			this.events.splice(tmp[i], 1);
		}
	}


}