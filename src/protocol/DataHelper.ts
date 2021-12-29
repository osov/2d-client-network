const emptyByteArray = new Uint8Array(0);

export class DataHelper {
	private static writeBuffer: Uint8Array = new Uint8Array(256);
	private static writeBufferView: DataView = new DataView(DataHelper.writeBuffer.buffer);
	private static instance: DataHelper;
	public static getInstance(): DataHelper {
		if (!DataHelper.instance)
			DataHelper.instance = new DataHelper();
		return DataHelper.instance;
	}

	private buffer: Uint8Array;
	private view: DataView;
	index: number; // read pointer
	length: number; // write pointer

	private constructor(){
		this.buffer = DataHelper.writeBuffer;
		this.view = DataHelper.writeBufferView;
		this.index = 0;
		this.length = 0;
	}

	startReading(buffer: Uint8Array): void {
		this.buffer = buffer;
		this.view = new DataView(this.buffer.buffer, this.buffer.byteOffset, this.buffer.byteLength);
		this.index = 0;
		this.length = buffer.length;
	}

	startWriting(): void {
		this.buffer = DataHelper.writeBuffer;
		this.view = DataHelper.writeBufferView;
		this.index = 0;
		this.length = 0;
	}

	private guaranteeBufferLength(length: number): void {
		if (length > this.buffer.length) {
			const data = new Uint8Array(length << 1);
			data.set(this.buffer);
			this.buffer = data;
			this.view = new DataView(data.buffer);
		}
	}

	private growBy(amount: number): void {
		this.length += amount;
		this.guaranteeBufferLength(this.length);
	}

	skip(amount: number) {
		this.index += amount;
	}

	toArray(): Uint8Array {
		return this.buffer.subarray(0, this.length);
	}

	readByte():    number { return this.buffer[this.index++]; }
	readUint16():  number { const result = this.view.getUint16(this.index, true);    this.index += 2; return result; }
	readInt16():   number { const result = this.view.getInt16(this.index, true);     this.index += 2; return result; }
	readUint32():  number { const result = this.view.getUint32(this.index, true);    this.index += 4; return result; }
	readInt32():   number { const result = this.view.getInt32(this.index, true);     this.index += 4; return result; }
	readUint64():  bigint { const result = this.view.getBigUint64(this.index, true); this.index += 8; return result; }
	readInt64():   bigint { const result = this.view.getBigInt64(this.index, true);  this.index += 8; return result; }
	readFloat32(): number { const result = this.view.getFloat32(this.index, true);   this.index += 4; return result; }
	readFloat64(): number { const result = this.view.getFloat64(this.index, true);   this.index += 8; return result; }

	writeByte(value: number):    void { const index = this.length; this.growBy(1); this.buffer[index] = value; }
	writeUint16(value: number):  void { const index = this.length; this.growBy(2); this.view.setUint16(index, value, true); }
	writeInt16(value: number):   void { const index = this.length; this.growBy(2); this.view.setInt16(index, value, true); }
	writeUint32(value: number):  void { const index = this.length; this.growBy(4); this.view.setUint32(index, value, true); }
	writeInt32(value: number):   void { const index = this.length; this.growBy(4); this.view.setInt32(index, value, true); }
	writeUint64(value: bigint):  void { const index = this.length; this.growBy(8); this.view.setBigUint64(index, value, true); }
	writeInt64(value: bigint):   void { const index = this.length; this.growBy(8); this.view.setBigInt64(index, value, true); }
	writeFloat32(value: number): void { const index = this.length; this.growBy(4); this.view.setFloat32(index, value, true); }
	writeFloat64(value: number): void { const index = this.length; this.growBy(8); this.view.setFloat64(index, value, true); }

	readBytes(): Uint8Array {
		const length = this.readUint32();
		if (length === 0) {
			return emptyByteArray;
		}
		const start = this.index, end = start + length;
		this.index = end;
		return this.buffer.subarray(start, end);
	}

	writeBytes(value: Uint8Array): void {
		const byteCount = value.length;
		this.writeUint32(byteCount);
		if (byteCount === 0) {
			return;
		}
		const index = this.length;
		this.growBy(byteCount);
		this.buffer.set(value, index);
	}

	writeVariant(value: number): number {
		var len = 0;
		while (value > 127) {
			this.writeByte((value & 127) | 128);
			value /= 128;
			len++;
		}
		this.writeByte(value & 127);
		len++;
		return len;
	}


	readVariant():number{
		var pos = 0, result = 0, rpos = this.index;
		while (pos != 8) {
			var c = this.readByte();
			result += (c & 127) * Math.pow(128, pos);
			++pos;
			++rpos;
			if (c < 128) {
				if (result > Number.MAX_SAFE_INTEGER) break;
				return result;
			}
			if (rpos == this.length){
				throw new Error("readVariant EOF");
				return -1;
			}
		}
		return -1;
	}

	/**
	* Reads a length-prefixed UTF-8-encoded string.
	*/
	readString(): string {
		const lengthBytes = this.readUint32();
		if (lengthBytes === 0)
			return '';


		const end = this.index + lengthBytes;
		let result = "";
		let codePoint: number;
		while (this.index < end) {
			// decode UTF-8
			const a = this.buffer[this.index++];
			if (a < 0xC0) {
				codePoint = a;
			} else {
				const b = this.buffer[this.index++];
				if (a < 0xE0) {
					codePoint = ((a & 0x1F) << 6) | (b & 0x3F);
				} else {
					const c = this.buffer[this.index++];
					if (a < 0xF0) {
						codePoint = ((a & 0x0F) << 12) | ((b & 0x3F) << 6) | (c & 0x3F);
					} else {
						const d = this.buffer[this.index++];
						codePoint = ((a & 0x07) << 18) | ((b & 0x3F) << 12) | ((c & 0x3F) << 6) | (d & 0x3F);
					}
				}
			}

			// encode UTF-16
			if (codePoint < 0x10000) {
				result += String.fromCharCode(codePoint);
			} else {
				codePoint -= 0x10000;
				result += String.fromCharCode((codePoint >> 10) + 0xD800, (codePoint & ((1 << 10) - 1)) + 0xDC00);
			}
		}

		// Damage control, if the input is malformed UTF-8.
		this.index = end;

		return result;
	}

	/**
	* Writes a length-prefixed UTF-8-encoded string.
	*/
	writeString(value: string): void {

		// The number of characters in the string
		const stringLength = value.length;
		// If the string is empty avoid unnecessary allocations by writing the zero length and returning.
		if (stringLength === 0) {
			this.writeUint32(0);
			return;
		}
		// value.length * 3 is an upper limit for the space taken up by the string:
		// https://developer.mozilla.org/en-US/docs/Web/API/TextEncoder/encodeInto#Buffer_Sizing
		// We add 4 for our length prefix.
		const maxBytes = 4 + stringLength * 3;

		// Reallocate if necessary, then write to this.length + 4.
		this.guaranteeBufferLength(this.length + maxBytes);

		// Start writing the string from here:
		let w = this.length + 4;
		const start = w;

		let codePoint: number;

		for (let i = 0; i < stringLength; i++) {
			// decode UTF-16
			const a = value.charCodeAt(i);
			if (i + 1 === stringLength || a < 0xD800 || a >= 0xDC00) {
				codePoint = a;
			} else {
				const b = value.charCodeAt(++i);
				codePoint = (a << 10) + b + (0x10000 - (0xD800 << 10) - 0xDC00);
			}

			// encode UTF-8
			if (codePoint < 0x80) {
				this.buffer[w++] = codePoint;
			} else {
				if (codePoint < 0x800) {
					this.buffer[w++] = ((codePoint >> 6) & 0x1F) | 0xC0;
				} else {
					if (codePoint < 0x10000) {
						this.buffer[w++] = ((codePoint >> 12) & 0x0F) | 0xE0;
					} else {
						this.buffer[w++] = ((codePoint >> 18) & 0x07) | 0xF0;
						this.buffer[w++] = ((codePoint >> 12) & 0x3F) | 0x80;
					}
					this.buffer[w++] = ((codePoint >> 6) & 0x3F) | 0x80;
				}
				this.buffer[w++] = (codePoint & 0x3F) | 0x80;
			}
		}

		// Count how many bytes we wrote.
		const written = w - start;

		// Write the length prefix, then skip over it and the written string.
		this.view.setUint32(this.length, written, true);
		this.length += 4 + written;
	}
}
