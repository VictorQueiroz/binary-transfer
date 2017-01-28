import assert from 'assert';
import { Deserializer } from '../src';
import { test, vector } from '../build';

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

        it('should decode vector inside constructors', function() {
            const bytes = test.players.PlayersList.encode({
                players: vector.encode({
                    type: 'test.players.Player',
                    items: [test.players.Player.encode({
                        id: 100
                    })]
                })
            });

            const result = test.players.PlayersList.decode(bytes);
            assert.deepEqual(result, {
                _: 'test.players.playersList',
                players: [{
                    _: 'test.players.player',
                    id: 100
                }]
            });
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

    it('should encode Vector<players.Player>', function() {
        const bytes = vector.encode({
            type: 'test.players.Player',
            items: [test.players.Player.encode({
                id: 100
            })]
        });

        deserializer = new Deserializer(bytes);
        assert.equal(vector._id, deserializer._readBytes(4).readUInt32LE(0));
        assert.equal(1, deserializer.readInt());
        assert.equal(test.players.Player._id, deserializer._readBytes(4).readUInt32LE(0));
        assert.equal(100, deserializer.readInt());
    });

    it('should decode Vector<players.Player>', function() {
        const bytes = vector.encode({
            type: 'test.players.Player',
            items: [test.players.Player.encode({
                id: 100
            })]
        });

        const result = vector.decode({
            type: 'test.players.Player',
            buffer: bytes
        });

        assert.deepEqual(result, [{
            _: 'test.players.player',
            id: 100
        }]);
    });

    it('should encode Vector<int>', function() {
        const bytes = vector.encode({
            type: 'int',
            items: [1,2,3,4,5]
        });

        deserializer = new Deserializer(bytes);
        assert.ok(vector._id, deserializer._readBytes(4).readUInt32LE(0));
        assert.equal(5, deserializer.readInt());
        assert.equal(1, deserializer.readInt());
        assert.equal(2, deserializer.readInt());
        assert.equal(3, deserializer.readInt());
        assert.equal(4, deserializer.readInt());
        assert.equal(5, deserializer.readInt());
    });

    it('should decode Vector<int>', function() {
        const bytes = vector.encode({
            type: 'int',
            items: [1,2,3,4,5]
        });
        assert.deepEqual([1,2,3,4,5], vector.decode({
            type: 'int',
            buffer: bytes
        }));
    });

    it('should encode Vector<string>', function() {
        const bytes = vector.encode({
            type: 'string',
            items: ['a', 'b', 'c', 'd', 'e']
        });

        deserializer = new Deserializer(bytes);
        assert.equal(vector._id, deserializer._readBytes(4).readUInt32LE(0));
        assert.equal(5, deserializer.readInt());
        assert.equal('a', deserializer.readString());
        assert.equal('b', deserializer.readString());
        assert.equal('c', deserializer.readString());
        assert.equal('d', deserializer.readString());
        assert.equal('e', deserializer.readString());
    });

    it('should decode Vector<string>', function() {
        const bytes = vector.encode({
            type: 'string',
            items: ['a', 'b', 'c', 'd', 'e']
        });

        assert.deepEqual(['a', 'b', 'c', 'd', 'e'], vector.decode({
            type: 'string',
            buffer: bytes
        }));
    });
});
