import Long from 'long';
import { Buffer } from 'buffer';
import { isNumber, isString, unescape } from 'lodash';

class Serializer {
    constructor() {
        this.offset = 0;
        this.buffers = [];
    }

    writeInt(int) {
        const buffer = Buffer.allocUnsafe(4);
        buffer.writeInt32LE(int, 0);

        this.addBuffer(buffer);
    }

    writeUInt(int) {
        const buffer = Buffer.allocUnsafe(4);
        buffer.writeUInt32LE(int);

        this.addBuffer(buffer);
    }

    writeShort(int) {
        const buffer = Buffer.allocUnsafe(2);
        buffer.writeInt16LE(int, 0);

        this.addBuffer(buffer);
    }

    writeUShort(int) {
        const buffer = Buffer.allocUnsafe(2);
        buffer.writeUInt16LE(int, 0);

        this.addBuffer(buffer);
    }

    writeFloat(int) {
        const buffer = Buffer.allocUnsafe(4);

        buffer.writeFloatLE(int, 0);
        this.addBuffer(buffer);
    }

    writeDouble(int) {
        const buffer = Buffer.allocUnsafe(8);

        buffer.writeDoubleLE(int, 0);
        this.addBuffer(buffer);
    }

    _formatLong(long, unsigned) {
        if(isNumber(long)) {
            return this._formatLong(Long.fromNumber(long, unsigned, 10));
        }

        if(isString(long)) {
            // radix = 16
            if(long.substring(0, 2) == '0x') {
                return this._formatLong(Long.fromString(long.substring(2), unsigned, 16));
            }

            // radix = 10
            return this._formatLong(Long.fromString(long, unsigned, 10));
        }

        return long;
    }

    writeULong(i) {
        const long = this._formatLong(i, true);
        const buffer = Buffer.from(long.toBytesLE());

        this.addBuffer(buffer);
    }

    writeLong(i) {
        const long = this._formatLong(i, false);
        const buffer = Buffer.from(long.toBytesLE());

        this.addBuffer(buffer);
    }

    writeString(string) {
        const sUTF8 = unescape(encodeURIComponent(string));
        const bytes = Buffer.allocUnsafe(sUTF8.length);

        for(let i = 0; i < sUTF8.length; i++) {
            bytes.writeUInt8(sUTF8.codePointAt(i), i);
        }

        this.writeBytes(bytes);
    }

    writeBytes(bytes) {
        this.writeUInt(bytes.byteLength);
        this.addBuffer(bytes);

        const padding = Buffer.alloc(bytes.byteLength % 4);

        if(padding.byteLength > 0) {
            this.addBuffer(padding);
        }
    }

    addBuffer(buffer) {
        this.buffers.push(buffer);
        this.offset += buffer.byteLength;
    }

    getBuffer() {
        return Buffer.concat(this.buffers);
    }
}

export default Serializer;
