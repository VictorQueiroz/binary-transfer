import Long from 'long';
import { createMessage } from './utils';
import { escape, isUndefined } from 'lodash';

class Deserializer {
    constructor(buffer, offset = 0) {
        this.buffer = buffer;
        this.offset = offset;
    }

    onError(...args) {
        throw new Error(createMessage.apply(null, args));
    }

    readUInt() {
        const bytes = this._readBytes(4);

        return bytes.readUInt32LE(0);
    }

    readInt() {
        const bytes = this._readBytes(4);

        return bytes.readInt32LE(0);
    }

    readShort() {
        const bytes = this._readBytes(2);

        return bytes.readInt16LE(0);
    }

    readUShort() {
        const bytes = this._readBytes(2);

        return bytes.readUInt16LE(0);
    }

    readFloat() {
        const bytes = this._readBytes(4);

        return bytes.readFloatLE(0);
    }

    readDouble() {
        const bytes = this._readBytes(8);

        return bytes.readDoubleLE(0);
    }

    readString() {
        let sUTF8 = '';
        const bytes = this.readBytes();

        for(let i = 0; i < bytes.byteLength; i++) {
            sUTF8 += String.fromCodePoint(bytes[i]);
        }

        return decodeURIComponent(escape(sUTF8));
    }

    _readBytes(byteLength) {
        if(isUndefined(byteLength)) {
            this.onError('"%s" argument is mandatory', 'byteLength');
            return false;
        }

        const end = this.offset + byteLength;

        if(end > this.buffer.length) {
            this.onError('Byte length (value: %s) is larger than the given buffer, aborting (buffer length: %s, measured end: %s)',
                byteLength,
                this.buffer.length,
                end);
        }

        const buffer = this.buffer.slice(this.offset, end);
        this.offset = end;

        return buffer;
    }

    readBytes() {
        const length = this.readUInt();
        const bytes = this._readBytes(length);

        this.offset += length % 4;

        return bytes;
    }

    readLong() {
        const bytes = this._readBytes(8);

        const low = bytes.readInt32LE(0);
        const high = bytes.readInt32LE(4);

        const long = new Long(low, high, false);
        return '0x' + Buffer.from(long.toBytesBE()).toString('hex');
    }

    readULong() {
        const bytes = this._readBytes(8);

        const low = bytes.readUInt32LE(0);
        const high = bytes.readUInt32LE(4);

        const long = new Long(low, high, true);
        return '0x' + Buffer.from(long.toBytesBE()).toString('hex');
    }
}

export default Deserializer;
