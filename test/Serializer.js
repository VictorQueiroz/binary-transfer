import Long from 'long';
import crypto from 'crypto';
import assert from 'assert';
import {Deserializer, Serializer} from '../src';

describe('Serializer', function() {
    let serializer,
        deserializer;

    beforeEach(() => {
        serializer = new Serializer();
    });

    describe('writeInt()', function() {
        it('should write simple int32 integer', function() {
            serializer.writeInt(1000);

            deserializer = new Deserializer(serializer.getBuffer());
            assert.equal(1000, deserializer.readInt());
        });

        it('should write negative numbers', function() {
            serializer.writeInt(-12032940);

            deserializer = new Deserializer(serializer.getBuffer());
            assert.equal(-12032940, deserializer.readInt());
        });

        it('should write max 32 bit safe integer', function() {
            serializer.writeInt(2147483647);

            deserializer = new Deserializer(serializer.getBuffer());
            assert.equal(2147483647, deserializer.readInt());
        });

        it('should throw an error if we try to write above 2147483647', function() {
            assert.throws(function() {
                serializer.writeInt(2147483647 + 1);
            });
        });
    });

    describe('writeLong()', function() {
        it('should encode native integer into long int', function() {
            serializer.writeLong(255);

            deserializer = new Deserializer(serializer.getBuffer());
            assert.equal('0x00000000000000ff', deserializer.readLong());
        });

        it('should encode negative integers', function() {
            serializer.writeLong(-123);

            deserializer = new Deserializer(serializer.getBuffer());
            assert.equal('0xffffffffffffff85', deserializer.readLong());
        });

        it('should encode max long unsigned value', function() {
            serializer.writeLong(Long.MAX_UNSIGNED_VALUE);

            deserializer = new Deserializer(serializer.getBuffer());
            assert.equal('0xffffffffffffffff', deserializer.readLong());
        });

        it('should encode max long signed value', function() {
            serializer.writeLong(Long.MAX_VALUE);

            deserializer = new Deserializer(serializer.getBuffer());
            assert.equal('0x7fffffffffffffff', deserializer.readLong());
        });
    });

    describe('writeBytes()', function() {
        let bytes1,
            bytes2;

        beforeEach(() => {
            bytes1 = crypto.randomBytes(64);
            bytes2 = crypto.randomBytes(64);
        });

        it('should write bytes', function() {
            serializer.writeBytes(bytes1);
            serializer.writeBytes(bytes2);

            deserializer = new Deserializer(serializer.getBuffer());
            assert.ok(deserializer.readBytes().equals(bytes1));
            assert.ok(deserializer.readBytes().equals(bytes2));
        });

        it('should add padding for bytes', function() {
            serializer.writeBytes(Buffer.alloc(9));
            assert.ok(serializer.buffers[2].equals(Buffer.alloc(1)));
            assert.equal(14, serializer.offset);
        });
    });

    describe('writeString()', function() {
        it('should encode emojis correctly', function() {
            serializer.writeString('message: 🎱');

            deserializer = new Deserializer(serializer.getBuffer());
            assert.equal('message: 🎱', deserializer.readString());
        });
    });
});
