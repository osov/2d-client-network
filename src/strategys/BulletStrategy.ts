import {BaseStrategy} from './BaseStrategy';
import {vectorToRange} from '../core/utils';

export class BulletStrategy extends BaseStrategy{

	getState(deltaTime:number)
	{
		var offset = this.currentServerTime() - this.lastPack.serverTime;
		this.state.position.copy(this.startPos).add(this.lastPack.velocity.clone().multiplyScalar(offset));
		// используем vectorToRange, а не просто getWrapPos из-за того getWrapPos рассчитает позицию при небольшом выходе за границы мира
		// а здесь выход будет значительным, больше 2х * WorldScale поэтому позиция будет не правильная при обычном рассчете.
		if (this.worldWrap)
			this.state.position = vectorToRange(this.state.position, this.worldSize);
		return true;
	}
}