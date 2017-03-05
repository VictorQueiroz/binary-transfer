import _ from 'lodash';
import assert from 'assert';
import { Deserializer } from '../src';
import { test, Vector, decode } from '../build';

describe('TestSchema', function() {
    let deserializer;

    afterEach(() => {
        deserializer = null;
    });

    it('should decode any type', function() {
        assert(decode(test.BoolTrue.encode()).serialize().equals(test.BoolTrue.encode()));
    });

    it('should support bool = true param', function() {
        const userStatus = test.UserStatus.decode(new Deserializer(test.UserStatus.encode({
            online: true
        })));

        assert.equal(userStatus.online, true);
    });

    it('should support bool = true param', function() {
        const userStatus = test.UserStatus.decode(new Deserializer(test.UserStatus.encode({
            online: false
        })));

        assert.equal(userStatus.online, false);
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

        it('should support direct pointing to a constructor', function() {
            const vector = new Vector({
                type: 'test.account',
                items: [new test.Account({
                    id: 100,
                    email: 'a@b.c',
                    username: '1234567'
                })]
            });

            assert(Vector.decode({
                type: 'test.account',
                buffer: vector.serialize()
            }).serialize().equals(vector.serialize()));
        });

        it('should handle empty vectors', function() {
            const vector = new Vector({
                type: 'test.Account',
                items: []
            });

            assert.ok(Vector.decode({
                type: 'test.Account',
                buffer: vector.serialize()
            }).serialize().equals(vector.serialize()));
        });

        describe('toJSON()', function() {
            it('should transform Vector<int> to JSON', function() {
                assert.equal(JSON.stringify(new Vector({
                    type: 'int',
                    items: [1,2,3,4]
                })), '[1,2,3,4]');
            });

            it('should transform Vector<test.Account> into JSON', function() {
                const vector = new Vector({
                    type: 'test.Account',
                    items: [new test.Account({
                        id: 100,
                        email: 'a@b.c',
                        username: '1234567'
                    })]
                });

                assert.equal(JSON.stringify(vector), JSON.stringify([{
                    id: 100,
                    username: '1234567',
                    email: 'a@b.c'
                }]));
            });
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

        it('should validate vector type using schema prefix for non-generic types', function() {
            new test.players.PlayersList({
                players: new Vector({
                    type: 'test.players.Player',
                    items: [new test.players.Player({
                        id: 31848
                    })]
                })
            });
        });

        it('should throw if invalid vector type is given', function() {
            assert.throws(function() {
                new test.players.PlayersList({
                    players: new Vector({
                        type: 'test.players.player',
                        items: []
                    })
                });
            }, /invalid vector type for param players. expected test.players.Player but got test.players.player instead/);
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

    it('should encode Vector<double>', function() {
        const vector = Vector.decode({
            type: 'double',
            buffer: Vector.encode({
                type: 'double',
                items: [
                    -33.398824,
                    12.31388
                ]
            })
        });

        assert.deepEqual(vector.items, [-33.398824, 12.31388]);
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
            assert.equal(vector.nth(i), n);
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

    it('should encode Vector<test.Post> using serialize()', function() {
        const vector = new Vector({
            type: 'test.Post',
            items: [new test.Post({
                id: 100,
                body: '',
                author: new test.Account({
                    id: 100,
                    email: '100@100.100',
                    username: '100'
                })
            }),
            new test.Post({
                id: 200,
                body: '',
                author: new test.Account({
                    id: 200,
                    email: '200@200.200',
                    username: '200'
                })
            })]
        });

        assert(vector.serialize().equals(Vector.encode({
            type: 'test.Post',
            items: [test.Post.encode({
                id: 100,
                body: '',
                author: test.Account.encode({
                    id: 100,
                    email: '100@100.100',
                    username: '100'
                })
            }),
            test.Post.encode({
                id: 200,
                body: '',
                author: test.Account.encode({
                    id: 200,
                    email: '200@200.200',
                    username: '200'
                })
            })]
        })));
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
            assert.equal(vector.nth(i), item);
        });
    });

    it('should throw an error if you instantiate a constructor with a missing param', function() {
        assert.throws(function() {
            new test.Account({

            });
        }, /missing property \"id\" for \"test.account\" constructor/);
    });

    it('should throw if found a invalid header for non-generic param type', function() {
        const bytes = test.Post.encode({
            id: 100,
            author: test.Account.encode({
                id: 100,
                username: 'xxxxxx',
                email: 'xxxxx'
            }),
            body: ''
        });

        assert.equal(bytes.readUInt32LE(8), test.Account._id);
        bytes.writeUInt32LE(Vector._id, 8);

        assert.throws(function() {
            test.Post.decode(new Deserializer(bytes));
        }, /invalid header for param \"author\". expected 3133324573 but got 460212315 instead/);
    });

    it('should throw if give an invalid param type is given', function() {
        assert.throws(function() {
            new test.players.CreatePlayer({
                online: new test.players.CreatePlayer({
                    online: new test.BoolTrue()
                })
            });
        }, /invalid type for param "online". expected test.Bool but got test.players.CreatePlayerResponse instead/);
    });

    it('should support direct linking to constructor', function(){
        const book = new test.Book({
            id: 23771,
            author: new test.players.Player({
                id: 3881
            })
        });
        const bytes = book.serialize();

        assert(test.Book.decode(new Deserializer(bytes)).serialize().equals(bytes));
    });

    it('should throw if a different than the expected constructor is given', function() {
        assert.throws(function() {
            new test.Book({
                id: 3881,
                author: new test.BoolTrue()
            });
        }, /invalid constructor for param "author". expected test.players.player but got test.boolTrue instead/);

        assert.throws(function() {
            test.Book.decode(new Deserializer(test.Book.encode({
                id: 37731,
                author: test.BoolTrue.encode()
            })));
        }, new RegExp(`invalid header for param \"author\". expected ${test.players.Player._id} but got ${test.BoolTrue._id} instead`));
    });
});
