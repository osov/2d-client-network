import {Vector2} from 'three';


export function interpolateDeltaWithWrapping(start:number, end:number, percent:number, wrapMin:number, wrapMax:number) {
	let wrapTest = wrapMax - wrapMin;
	if (start - end > wrapTest / 2) end += wrapTest;
	else if (end - start > wrapTest / 2) start += wrapTest;
	if (Math.abs(start - end) > wrapTest / 3){
		//console.log('wrap interpolation is close to limit.  Not sure which edge to wrap to.', start, end, wrapTest);
	}
	return (end - start) * percent;
}

export function interpolateWithWrapping(start:number, end:number, percent:number, wrapMin:number, wrapMax:number, is_range = false) {
	let interpolatedVal = start + interpolateDeltaWithWrapping(start, end, percent, wrapMin, wrapMax);
	if (is_range)
	{
		let wrapLength = (wrapMax - wrapMin) / 2;
		if (interpolatedVal >=  wrapLength) interpolatedVal -= 2*wrapLength;
		if (interpolatedVal <= -wrapLength) interpolatedVal += 2*wrapLength;
	}
	else
	{
		let wrapLength = wrapMax - wrapMin;
		if (interpolatedVal >= wrapLength) interpolatedVal -= wrapLength;
		if (interpolatedVal < 0) interpolatedVal += wrapLength;
	}
	return interpolatedVal;
}

export function interpolateVectorWithWrap(src:Vector2, dst:Vector2, t:number, wrap:Vector2)
{
	return new Vector2(
		interpolateWithWrapping(src.x, dst.x, t, -wrap.x/2, wrap.x/2, true),
		interpolateWithWrapping(src.y, dst.y, t, -wrap.y/2, wrap.y/2, true)
		);
}

export function toRange(val:number, min:number, max:number)
{
	while (true)
	{
		if (val > max)
			val -= max - min;
		else if (val < min)
			val += max - min;
		else
			return val;
	}
}

export function rangeAngle(angle:number)
{
	return toRange(angle, 0, 360)
}

export function vectorToRange(vec:Vector2, wrap:Vector2)
{
	vec.set(toRange(vec.x, -wrap.x/2, wrap.x/2), toRange(vec.y, -wrap.y/2, wrap.y/2));
	return vec;
}

export function mergeBuffer(buffer1:Uint8Array, buffer2:Uint8Array)
{
	var tmp = new Uint8Array(buffer1.byteLength + buffer2.byteLength);
	tmp.set(new Uint8Array(buffer1), 0);
	tmp.set(new Uint8Array(buffer2), buffer1.byteLength);
	return tmp;
}

export function copyBuffer(buffer:Uint8Array)
{
	return buffer.slice(0);
}

export function getCookie(name:string)
{
	const value = `; ${document.cookie}`;
	const parts = value.split(`; ${name}=`);
	if (parts.length === 2)
	{
		var p = parts.pop();
		if (p !== undefined)
			return p.split(';').shift() + '';
		else
			return '';
	}
	return '';
}