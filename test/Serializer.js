import _ from 'lodash';
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

    describe('writeBool()', function() {
        it('should encode true value', function() {
            serializer.writeBool(true);

            deserializer = new Deserializer(serializer.getBuffer());
            assert.equal(deserializer.readBool(), true);
        });

        it('should encode false value', function() {
            serializer.writeBool(false);

            deserializer = new Deserializer(serializer.getBuffer());
            assert.equal(deserializer.readBool(), false);
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

        const longs = [{
            number: 9223372036854776000,
            long: Long.MAX_VALUE
        }];

        _.forEach(longs, function({ number, long }) {
            it(`should encode "${number}" number`, function() {
                serializer.writeLong(number);

                deserializer = new Deserializer(serializer.getBuffer());
                const hex = deserializer.readLong();

                assert(Long.fromString(hex, false, 16).equals(long));
            });
        });

        it('should encode hex into long', function() {
            serializer.writeLong('0xff');

            deserializer = new Deserializer(serializer.getBuffer());
            assert.equal(deserializer.readLong(), '0x00000000000000ff');
        });
    });

    describe('writeULong()', function() {
        it('should write unsigned 64-bit long', function() {
            serializer.writeULong(Long.MAX_UNSIGNED_VALUE);

            deserializer = new Deserializer(serializer.getBuffer());
            assert.equal(deserializer.readULong(), '0x' + Long.MAX_UNSIGNED_VALUE.toString(16));
        });
    });

    describe('writeUInt()', function() {
        it('should write unsigned 32-bit integer', function() {
            serializer.writeUInt(0xFFFFFFFF);

            deserializer = new Deserializer(serializer.getBuffer());
            assert.equal(deserializer.readUInt(), 0xFFFFFFFF);
        });

        _.forEach([-0xFFFFFFFF, -1, -100, -1000], function(int) {
            it(`should throw when try to encode ${int} signed integer`, function() {
                assert.throws(function() {
                    serializer.writeUInt(int);
                });
            });
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

        it('should encode 2048 length string', function() {
            const string = crypto.randomBytes(1024).toString('hex');

            serializer.writeString(string);
            deserializer = new Deserializer(serializer.getBuffer());
            assert.equal(deserializer.readString(), string);
        });
    });

    describe('writeFloat()', function() {
        it('should encode 32-bit integer into float', function() {
            serializer.writeFloat(2.387939260590663e-38);

            deserializer = new Deserializer(serializer.getBuffer());

            assert.equal(deserializer.readFloat(), 2.387939260590663e-38);
        });
    });

    describe('writeDouble()', function() {
        it('should encode double integer', function() {
            serializer.writeDouble(-38.5824766);

            deserializer = new Deserializer(serializer.getBuffer());

            assert.equal(deserializer.readDouble(), -38.5824766);
        });
    });

    describe('writeShort()', function() {
        it('should encode 16-bit integer', function() {
            serializer.writeShort(32767);

            deserializer = new Deserializer(serializer.getBuffer());
            assert.equal(deserializer.readShort(), 32767);
        });
    });

    describe('writeUShort()', function() {
        it('should encode 16-bit unsigned integer', function() {
            serializer.writeUShort(65535);

            deserializer = new Deserializer(serializer.getBuffer());
            assert.equal(deserializer.readUShort(), 65535);
        });
    });
});
