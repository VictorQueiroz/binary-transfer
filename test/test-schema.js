import _ from 'lodash';
import assert from 'assert';
import { Deserializer } from '../src';
import { test, Vector } from '../build';

describe('TestSchema', function() {
    let deserializer;

    afterEach(() => {
        deserializer = null;
    });

    describe('Vector', function() {
        it('should deserialize vectors', function() {
            const vector = new Vector({
                type: 'int',
                items: [1,2,3,4,5,6,7]
            });
            const bytes = vector.serialize();

            assert(Vector.encode(vector).equals(bytes));
        });
    });

    describe('toJSON()', function() {
        it('should transform into plain object', function() {
            const account = new test.Account({
                id: 100,
                email: 'a@b.c.',
                username: '1234567'
            });
            assert.deepEqual(account.toJSON(), {
                id: 100,
                email: 'a@b.c.',
                username: '1234567'
            });

            assert.equal(JSON.stringify(account), JSON.stringify({
                id: 100,
                username: '1234567',
                email: 'a@b.c.'
            }));
        });
    });

    describe('serialize()', function() {
        it('should serialize constructor properties into buffer', function() {
            const bytes = new test.Account({
                id: 100,
                email: 'victor@nice.com',
                username: 'victorqueiroz'
            }).serialize();
        });
    });

    describe('static: encode()', function() {
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

        it('should decode vector inside constructors', function() {
            const bytes = test.players.PlayersList.encode({
                players: Vector.encode({
                    type: 'test.players.Player',
                    items: [test.players.Player.encode({
                        id: 100
                    })]
                })
            });

            const result = test.players.PlayersList.decode(new Deserializer(bytes));

            result.players.forEach(player => {
                assert.equal(player.id, 100);
            });
        });
    });

    describe('static: decode()', function() {
        it('should decode simple constructors', function() {
            const bytes = test.Account.encode({
                id: 100,
                username: 'victorqueiroz',
                email: 'queiroz@messenger.im'
            });

            const account = test.Account.decode(new Deserializer(bytes));

            assert.equal(account.id, 100);
            assert.equal(account.username, 'victorqueiroz',);
            assert.equal(account.email, 'queiroz@messenger.im');
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

            const post = test.Post.decode(new Deserializer(bytes));

            assert.equal(post.id, 20);
            assert.equal(post.body, 'xxxx');

            _.forEach({
                id: 100,
                email: 'xxxx@xxxx.xxxx',
                username: 'xxxx'
            }, function(value, key) {
                assert.equal(post.author[key], value);
            });
        });
    });

    it('should encode Vector<players.Player>', function() {
        const bytes = Vector.encode({
            type: 'test.players.Player',
            items: [test.players.Player.encode({
                id: 100
            })]
        });

        deserializer = new Deserializer(bytes);
        assert.equal(Vector._id, deserializer._readBytes(4).readUInt32LE(0));
        assert.equal(1, deserializer.readUInt());
        assert.equal(test.players.Player._id, deserializer._readBytes(4).readUInt32LE(0));
        assert.equal(100, deserializer.readInt());
    });

    it('should decode Vector<players.Player>', function() {
        const bytes = Vector.encode({
            type: 'test.players.Player',
            items: [test.players.Player.encode({
                id: 100
            })]
        });

        const result = Vector.decode({
            type: 'test.players.Player',
            buffer: bytes
        });

        result.forEach(item => {
            assert.equal(item.id, 100);
        });
    });

    it('should encode Vector<int>', function() {
        const bytes = Vector.encode({
            type: 'int',
            items: [1,2,3,4,5]
        });

        deserializer = new Deserializer(bytes);
        assert.ok(Vector._id, deserializer._readBytes(4).readUInt32LE(0));
        assert.equal(5, deserializer.readUInt());
        assert.equal(1, deserializer.readInt());
        assert.equal(2, deserializer.readInt());
        assert.equal(3, deserializer.readInt());
        assert.equal(4, deserializer.readInt());
        assert.equal(5, deserializer.readInt());
    });

    it('should decode Vector<int>', function() {
        const items = [1,2,3,4,5];
        const bytes = Vector.encode({
            type: 'int',
            items: items
        });

        const vector = Vector.decode({
            type: 'int',
            buffer: bytes
        });

        items.forEach((n, i) => {
            assert.equal(vector.get(i), n);
        });
    });

    it('should encode Vector<long>', function() {
        const vector = new Vector({
            type: 'long',
            items: [255, -255, -64]
        });

        assert(vector.serialize().equals(Vector.decode({
            type: 'long',
            buffer: vector.serialize()
        }).serialize()));
    });

    it('should encode Vector<string>', function() {
        const bytes = Vector.encode({
            type: 'string',
            items: ['a', 'b', 'c', 'd', 'e']
        });

        deserializer = new Deserializer(bytes);
        assert.equal(Vector._id, deserializer._readBytes(4).readUInt32LE(0));
        assert.equal(5, deserializer.readUInt());
        assert.equal('a', deserializer.readString());
        assert.equal('b', deserializer.readString());
        assert.equal('c', deserializer.readString());
        assert.equal('d', deserializer.readString());
        assert.equal('e', deserializer.readString());
    });

    it('should decode Vector<string>', function() {
        const items = ['a', 'b', 'c', 'd', 'e'];
        const bytes = Vector.encode({
            type: 'string',
            items: items
        });

        const vector = Vector.decode({
            type: 'string',
            buffer: bytes
        });

        items.forEach((item, i) => {
            assert.equal(vector.get(i), item);
        });
    });
});
