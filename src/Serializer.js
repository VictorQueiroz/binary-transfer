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

    writeLong(long) {
        if(isNumber(long)) {
            return this.writeLong(Long.fromInt(long, false));
        }

        if(isString(long)) {
            // radix = 16
            if(long.substring(0, 2) == '0x') {
                return this.writeLong(Long.fromString(long, false, 16));
            }

            // radix = 10
            return this.writeLong(Long.fromString(long, false, 10));
        }

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
        const lengthBytes = Buffer.alloc(4);
        lengthBytes.writeUInt32LE(bytes.byteLength);

        this.addBuffer(lengthBytes);
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
