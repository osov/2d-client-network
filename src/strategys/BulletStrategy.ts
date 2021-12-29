import {Vector2} from 'three';
import {BaseStrategy} from './BaseStrategy';
import {vectorToRange} from '../core/utils';

export class BulletStrategy extends BaseStrategy{

	getState(deltaTime:number)
	{
		var offset = this.currentServerTime() - this.addedServerTime;
		this.state.position.copy(this.startPos).add(this.lastPack.velocity.clone().multiplyScalar(offset));
		if (this.worldWrap)
			this.state.position = vectorToRange(this.state.position, this.worldSize);
		return true;
	}
}