import { escape, isUndefined } from 'lodash';

class Deserializer {
    constructor(buffer, offset = 0) {
        this.buffer = buffer;
        this.offset = offset;
    }

    readInt() {
        const int32 = this.buffer.readInt32LE(this.offset);
        this.offset += 4;

        return int32;
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
        const length = this.buffer.readUInt32LE(this.offset);
        this.offset += 4;

        const bytes = this._readBytes(length);
        this.offset += length % 4;

        return bytes;
    }

    readLong() {
        const bytes = this._readBytes(8);

        return '0x' + bytes.reverse().toString('hex');
    }
}

export default Deserializer;
