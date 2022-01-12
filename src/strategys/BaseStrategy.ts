import {Vector2} from 'three';
import {BaseComponent, BaseEntity} from 'ecs-threejs';
import {NetClient} from '../network/NetClient';

export interface IStatePosRot{
	position:Vector2;
	velocity:Vector2;
	angle:number;
	serverTime:number;
}

export enum TypPack{
	Pos, PosAngle, PosAngleVel
}


export class BaseStrategy extends BaseComponent{

	protected worldSize:Vector2 = new Vector2();
	protected worldWrap:boolean = true;
	protected net:NetClient;
	protected addedServerTime:number;
	protected startPos:Vector2;
	protected lastPackTime:number;
	protected lastPackTyp:TypPack;
	protected lastPack:IStatePosRot = {position:new Vector2(), velocity:new Vector2(), angle:0, serverTime:0};
	protected state:IStatePosRot = {position:new Vector2(), velocity:new Vector2(), angle:0, serverTime:0};
	private firstPack:boolean = true;

	constructor()
	{
		super();
		this.net = NetClient.getInstance();
	}


	onAddedComponent(e:BaseEntity)
	{
		super.onAddedComponent(e);
		this.worldSize = e.wrapConfig.worldSize;
		this.worldWrap = e.wrapConfig.worldWrap;
		this.addedServerTime = this.net.getLastServerTime();
		var pos = this.entity.getPosition();
		this.startPos = new Vector2(pos.x, pos.y);
	}

	addData(serverTime:number, typ:TypPack, pos:Vector2, angle:number = 0, velocity:Vector2 = new Vector2())
	{
		this.lastPackTime = this.net.now();
		if (typ == TypPack.Pos)
			this.lastPack.position = pos;
		else if (typ == TypPack.PosAngle)
		{
			this.lastPack.position = pos;
			this.lastPack.angle = angle;
		}
		else if (typ == TypPack.PosAngleVel)
		{
			this.lastPack.position = pos;
			this.lastPack.angle = angle;
			this.lastPack.velocity = velocity;
		}
		this.lastPack.serverTime = serverTime;
		this.lastPackTyp = typ;
		if (this.firstPack)
		{
			this.firstPack = false;
			this.state.position.copy(this.lastPack.position);
			this.state.velocity.copy(this.lastPack.velocity);
			this.state.angle = this.lastPack.angle;
		}
	}

	doUpdate(deltaTime:number)
	{
		if (!this.getState(deltaTime))
			return;
		this.entity.setPosition(this.state.position);
		this.entity.setRotationDeg(this.state.angle);
		this.entity.setVelocity(this.state.velocity);
	}

	getState(deltaTime:number)
	{
		return true;
	}

	protected currentServerTime()
	{
		return this.net.getServerTime() - this.net.interpolateTime;
	}


}