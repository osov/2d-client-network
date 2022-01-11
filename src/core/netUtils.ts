import {Vector2, Vector3} from 'three';
import {rangeAngle} from './utils';

export function byteToDeg(byte:number)
{
	return byte / 255 * 360;
}

export function degToByte(deg:number)
{
	return rangeAngle(deg)/360*255;
}

export function vec2FloatToInt(vec2:Vector2|Vector3, multipler:number = 1, offset:number = 0)
{
	return new Vector2(Math.round(vec2.x * multipler), Math.round(vec2.y * multipler));
}

export function vec2IntToFloat(vec2:Vector2|Vector3, divider:number = 1, offset:number = 0)
{
	return new Vector2(vec2.x / divider, vec2.y / divider);
}

export function convertRange(val:number, from_min:number, from_max:number, to_min:number, to_max:number, inverse = false):number
{
	if (inverse)
		return convertRange(val, to_min, to_max, from_min, from_max, false);
	const s1 = (from_max - from_min);
	const s2 = (to_max - to_min);
	const n = (val - from_min);
	const z = s2 / s1;
	return to_min + n * z;
}

export function toRange(value:number, type:string, min:number, max:number, decode = false)
{
	const ranges:{[k:string]:number[]} = {'uint8':[0, 255], 'int8':[-128, 127], 'uint16':[0, 65535], 'int16':[-32768, 32767]};
	var range2 = ranges[type];
	if (!range2)
	{
		range2 = ranges['uint8'];
		console.error("Не определен диапазон:", type);
	}
	if (!decode)
	{
		if (value < min)
			value *= -1;
		value = Math.round(convertRange(value, min, max, range2[0], range2[1], decode));
	}
	else
	{
		value = convertRange(value, min, max, range2[0], range2[1], decode);
	}
	return value;
}

export function toRangeVec2(value:Vector2, type:string, min:number, max:number, decode = false)
{
	return new Vector2(toRange(value.x, type, min, max, decode), toRange(value.y, type, min, max,  decode));
}