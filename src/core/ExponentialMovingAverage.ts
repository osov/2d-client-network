export class ExponentialMovingAverage
{
	private alpha:number;
	private initialized = false;
	private value:number;
	private _var:number;

	constructor(n:number)
	{
		// standard N-day EMA alpha calculation
		this.alpha = 2.0 / (n + 1);
	}

	add(newValue:number)
	{
		// simple algorithm for EMA described here:
		if (this.initialized)
		{
			var delta = newValue - this.value;
			this.value += this.alpha * delta;
			this._var = (1 - this.alpha) * (this._var + this.alpha * delta * delta);
		}
		else
		{
			this.value = newValue;
			this.initialized = true;
		}
	}

	get()
	{
		return this.value;
	}
}