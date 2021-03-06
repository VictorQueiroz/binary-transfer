import Long from 'long';
import { Buffer } from 'buffer';
import * as utils from './utils';
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

    writeBool(value) {
        const buffer = Buffer.allocUnsafe(1);
        buffer.writeUInt8(value ? 1 : 0);

        this.addBuffer(buffer);
    }

    /**
     * Encode string into bytes
     * @param  {String} string String to be encoded
     * @return {Buffer}        UTF-8 encoded buffer
     */
    _encodeString(string) {
        const sUTF8 = escape(string);
        const ii = sUTF8.length;
        const bytes = Buffer.allocUnsafe(ii);

        for(let i = 0; i < ii; i++) {
            const cp = sUTF8.charCodeAt(i);

            bytes.writeUInt8(cp, i);
        }

        return bytes;
    }

    _formatLong(long, unsigned) {
        if(isNumber(long)) {
            return this._formatLong(Long.fromNumber(long, unsigned, 10));
        }

        if(isString(long)) {
            // radix = 16
            if(long.substring(0, 2) == '0x') {
                if((long.length % 2) != 0) {
                    throw new Error('Invalid hex string');
                }
                return this._formatLong(Long.fromString(long.substring(2), unsigned, 16));
            }

            // radix = 10
            return this._formatLong(Long.fromString(long, unsigned, 10));
        }

        return long;
    }

    writeULong(i) {
        const long = this._formatLong(i, true);
        let buffer = Buffer.from(long.toBytesLE());

        buffer = utils.trimBytesLE(buffer, 8);
        buffer = utils.addPaddingLE(buffer, 8);

        this.addBuffer(buffer);
    }

    writeLong(i) {
        const long = this._formatLong(i, false);
        let buffer = Buffer.from(long.toBytesLE());

        buffer = utils.trimBytesLE(buffer, 8);
        buffer = utils.addPaddingLE(buffer, 8);

        this.addBuffer(buffer);
    }

    writeString(string) {
        this.writeBytes(this._encodeString(string));
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
