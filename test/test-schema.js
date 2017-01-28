import { test } from '../build';
import assert from 'assert';
import { Deserializer } from '../src';

describe('TestSchema', function() {
    let deserializer;

    afterEach(() => {
        deserializer = null;
    });

    describe('encode()', function() {
        it('should encode simple constructors', function() {
            const bytes = test.Account.encode({
                id: 100,
                username: 'victorqueiroz',
                email: 'queiroz@messenger.im'
            });

            deserializer = new Deserializer(bytes);

            assert.equal(test.Account._header.readUInt32LE(0), deserializer._readBytes(4).readUInt32LE(0));
            assert.equal(100, deserializer.readInt());
            assert.equal('victorqueiroz', deserializer.readString());
            assert.equal('queiroz@messenger.im', deserializer.readString());
            assert.equal(deserializer.offset, deserializer.buffer.byteLength);
        });

        it('should encode complex constructors', function() {
            const bytes = test.Post.encode({
                id: 20,
                body: 'xxxx',
                author: test.Account.encode({
                    id: 100,
                    username: 'xxxx',
                    email: 'xxxx@xxxx.xxxx',
                })
            });

            deserializer = new Deserializer(bytes);

            assert.equal(test.Post._header.readUInt32LE(0), deserializer._readBytes(4).readUInt32LE(0));
            assert.equal(20, deserializer.readInt());

            // attr: author
            assert.equal(test.Account._header.readUInt32LE(0), deserializer._readBytes(4).readUInt32LE(0));
            assert.equal(100, deserializer.readInt());
            assert.equal('xxxx', deserializer.readString());
            assert.equal('xxxx@xxxx.xxxx', deserializer.readString());

            // attr: body
            assert.equal('xxxx', deserializer.readString());
        });
    });

    describe('decode()', function() {
        it('should decode simple constructors', function() {
            const bytes = test.Account.encode({
                id: 100,
                username: 'victorqueiroz',
                email: 'queiroz@messenger.im'
            });

            assert.deepEqual(test.Account.decode(bytes), {
                _: 'test.account',
                id: 100,
                username: 'victorqueiroz',
                email: 'queiroz@messenger.im'
            });
        });

        it('should decode complex constructors', function() {
            const bytes = test.Post.encode({
                id: 20,
                body: 'xxxx',
                author: test.Account.encode({
                    id: 100,
                    username: 'xxxx',
                    email: 'xxxx@xxxx.xxxx',
                })
            });

            assert.deepEqual(test.Post.decode(bytes), {
                _: 'test.post',
                id: 20,
                body: 'xxxx',
                author: {
                    _: 'test.account',
                    id: 100,
                    username: 'xxxx',
                    email: 'xxxx@xxxx.xxxx',
                }
            });
        });
    });
});
