import crypto from 'crypto';
import assert from 'assert';
import { Serializer, Deserializer } from '../src';

describe('Deserializer', function() {
    let serializer,
        deserializer;

    beforeEach(() => {
        serializer = new Serializer();
    });
    afterEach(() => {
        deserializer = null;
    });

    describe('readBytes()', function() {
        let bytes1,
            bytes_3_length;

        beforeEach(() => {
            bytes1 = crypto.randomBytes(8);
            bytes_3_length = crypto.randomBytes(3);
        });

        it('should ignore padding', function() {
            serializer.writeBytes(bytes_3_length);
            serializer.writeBytes(bytes1);

            deserializer = new Deserializer(serializer.getBuffer());
            assert.ok(deserializer.readBytes().equals(bytes_3_length));
            assert.ok(deserializer.readBytes().equals(bytes1));
            assert.equal(deserializer.offset, deserializer.buffer.byteLength);
        });
    });

    describe('readBool()', function() {
        it('should throw if unexpected value is give for bools', function() {
            const buffer = Buffer.alloc(1);
            buffer.writeUInt8(2, 0);

            deserializer = new Deserializer(buffer);
            assert.throws(function() {
                deserializer.readBool();
            });
        });
    });
});
