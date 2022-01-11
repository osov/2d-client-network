import {Vector2} from 'three';
import {BaseStrategy, TypPack, IStatePosRot} from './BaseStrategy';
import {interpolateWithWrapping, interpolateVectorWithWrap} from '../core/utils';

export enum TypeInStrategy{
	PosAngle,
	PosAngleVelServer,
	PosAngleVelCalc
}

/*
	проблема при переходе границ, резкий рывок возникает из-за того что происходит смена стратегии при включенной Exp с сервера
	на обычный lerp потому что между ними возникло большое расхождение
	для решения этого нужно грамотно подобрать коэф-т expCoef
	а также рывок возникает из-за различия в скорости для камеры
*/

export class InterpolateStrategy extends BaseStrategy{
	public typStrategy:TypeInStrategy = TypeInStrategy.PosAngle;
	private buffer:IStatePosRot[] = [];
	private isBlink:boolean;
	private blinkTime:number;
	private rate:number = 0.01;
	private expCoef:number = 136; // коэф-т зависит от системы мира, если пиксели, то х100, иначе обычно 0.136 подходил

	constructor(typStrategy:TypeInStrategy)
	{
		super();
		this.typStrategy = typStrategy;
	}

	private getBaseUpdate()
	{
		const serverTime = this.currentServerTime();
		for (var i = this.buffer.length - 1; i >= 0; i--)
		{
			if (this.buffer[i].serverTime <= serverTime)
				return i;
		}
		return -1;
	}

	addData(serverTime:number, typ:TypPack, pos:Vector2, angle:number = 0, velocity:Vector2 = new Vector2())
	{
		super.addData(serverTime, typ, pos, angle, velocity);

		this.buffer.push({...this.lastPack});
		const base = this.getBaseUpdate();
		if (base > 0)
			this.buffer.splice(0, base);
	}

	private getExpCoef()
	{
		return this.expCoef;
	}

	getState(deltaTime:number)
	{
		if (this.buffer.length == 0)
			return false;
		const base = this.getBaseUpdate();
		var serverTime = this.currentServerTime();
		if (base < 0)
		{
			//console.warn("Buffer empty");
			return false;
		}
		else if (base == this.buffer.length - 1)
		{
			// если будем постоянно экстраполировать, а на сервере объект неподвижен -> не передает информацию о позиции, т.к. стоит в одной позиции
			// а на клиенте из-за экстраполяции мы уйдем слишком далеко и будем видеть то, чего нет на этом месте.
			if (this.lastPackTime + 1 > this.net.now())
				this.state.position.add(this.state.velocity.clone().multiplyScalar(deltaTime)); // Экстраполяция когда опаздывают обновления; todo для локального игрока в идеале бы и вращение
			else
				this.state.position.copy(this.lastPack.position);
			//console.warn("Buffer old", this.entity.idEntity);
			return true;
		}
		else
		{
			const last = this.buffer[base];
			const next = this.buffer[base + 1];
			const r = (serverTime - last.serverTime) / (next.serverTime - last.serverTime);
			this.state.angle = interpolateWithWrapping(last.angle, next.angle, r, 0, 360);

			if (this.worldWrap)
			{
				var tp_len = this.worldSize.x * 0.5;
				var is_blink = Math.abs(this.state.position.x - next.position.x) > tp_len ||
				Math.abs(this.state.position.y - next.position.y) > tp_len;
				if (is_blink && !this.isBlink)
				{
					this.isBlink = true;
					this.blinkTime = this.net.now() + 300;
					//console.log("Blink..");
				}
			}

			if (this.isBlink)
			{
				this.isBlink = this.net.now() < this.blinkTime;
				this.state.position = interpolateVectorWithWrap(last.position, next.position, r, this.worldSize);
				return true;
			}

			if (this.typStrategy == TypeInStrategy.PosAngle)
			{
				this.state.position.copy(last.position).lerp(next.position, r);
				var ft = next.serverTime - last.serverTime;
				this.state.velocity.copy(next.position).sub(last.position).divideScalar(ft);
			}

			else if (this.typStrategy == TypeInStrategy.PosAngleVelServer)
			{
				var curPos = this.state.position.clone();
				this.state.position.copy(last.position).lerp(next.position, r);
				this.state.velocity.copy(last.velocity).lerp(next.velocity, r);
				this.state.position.add(this.state.velocity.clone().multiplyScalar(this.getExpCoef()));
				var t = Math.pow(2, -this.rate * deltaTime);
				this.state.position.lerp(curPos, t);
			}
			else if (this.typStrategy == TypeInStrategy.PosAngleVelCalc)
			{
				var curPos = this.state.position.clone();
				this.state.position.copy(last.position).lerp(next.position, r);
				var ft = next.serverTime - last.serverTime;
				var velocity = next.position.clone().sub(last.position).divideScalar(ft);
				this.state.position.add(velocity.multiplyScalar(this.getExpCoef()));
			}

			return true;
		}

	}

}