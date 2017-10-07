import assert from 'assert';
import crypto from 'crypto';
import { Schema, language } from '../src';

describe('Schema', function() {
    let s;

    beforeEach(() => {
        const containers = new language.SchemaParser().parse(`
            alias ObjectId = bytes[12];
            alias PostTitle = string[12];

            void : Void
            type User {
                user -> id: uint,
                        name: string,
                        photo?: Photo,
                        comments: Vector<uint>
                userBanned -> lastComment: Comment, banDate: uint
            }
            type Photo {
                photo -> id: uint
            }
            type Post {
                post -> id: ObjectId, title: PostTitle
                postCommented -> comments: Vector<Comment>
            }
            type Comment {
                comment -> id: uint
            }
            type File {
                file -> data: bytes
            }
        `);
        s = new Schema([{
            containers
        }]);
    });

    it('should replace non-buffer input automatically', function() {
        assert.deepEqual(s.decode({
            bytes: s.encode('file', {
                data: '1234567890'
            })
        }), {
            _name: 'file',
            _type: 'File',
            data: Buffer.from('1234567890', 'utf8'),
        });
    });

    it('should convert non-buffer input as hexadecimal string if the string start with 0x', function() {
        assert.deepEqual(s.decode({
            bytes: s.encode('post', {
                id: '0x59d837c3da2c3d001879d322',
                title: 'common title'
            })
        }), {
            _name: 'post',
            _type: 'Post',
            id: Buffer.from('59d837c3da2c3d001879d322', 'hex'),
            title: 'common title'
        });
    });

    it('should accept typedarray in non-buffer params', function() {
        const typedArray = new Uint8Array(12);
        const string = '59d837c3da2c3d001879d322';

        let j = 0;
        for(let i = 0; i < string.length; i++)
            typedArray[j++] = parseInt(string.substr(i, i + 2), 16);

        assert.deepEqual(s.decode({
            bytes: s.encode('post', {
                id: typedArray,
                title: 'common title'
            })
        }), {
            _name: 'post',
            _type: 'Post',
            id: Buffer.from(string, 'hex'),
            title: 'common title'
        });
    });

    it('should encode container with optional param', function() {
        assert.deepEqual(s.decode({
            bytes: s.encode('user', {
                id: 100,
                name: '',
                photo: { _name: 'photo', id: 939494 },
                comments: []
            })
        }), {
            _type: 'User',
            _name: 'user',
            id: 100,
            name: '',
            photo: {
                _type: 'Photo',
                _name: 'photo',
                id: 939494
            },
            comments: []
        });
    });

    it('should encode non generic param', function() {
        assert.deepEqual(s.decode({
            bytes: s.encode('userBanned', {
                lastComment: {
                    _name: 'comment',
                    id: 120
                },
                banDate: ~~(Date.now()/1000)
            })
        }), {
            _name: 'userBanned',
            _type: 'User',
            lastComment: {
                _type: 'Comment',
                _name: 'comment',
                id: 120
            },
            banDate: ~~(Date.now()/1000)
        });
    });

    it('should encode with first argument as string', function() {
        assert.deepEqual(s.encode('void'), s.encode({
            _name: 'void'
        }));
    });

    it('should encode simple containers', function() {
        assert.deepEqual(s.decode({
            bytes: s.encode({
                id: 139391,
                name: 'First user',
                _name: 'user',
                comments: [],
            })
        }), {
            id: 139391,
            name: 'First user',
            comments: [],
            _name: 'user',
            _type: 'User'
        });
    });

    it('should encode strict size types', function() {
        const randomBytes = crypto.randomBytes(12);
        assert.deepEqual(s.decode({
            bytes: s.encode({
                _name: 'post',
                id: randomBytes,
                title: 'common title'
            })
        }), {
            _name: 'post',
            _type: 'Post',
            id: randomBytes,
            title: 'common title'
        });
    });

    it('should encode vectors', function() {
        assert.deepEqual(s.decode({
            bytes: s.encode({
                _name: 'postCommented',
                comments: [{
                    _name: 'comment',
                    id: 0xffffff
                }]
            })
        }), {
            _type: 'Post',
            _name: 'postCommented',
            comments: [{
                _type: 'Comment',
                _name: 'comment',
                id: 0xffffff
            }]
        });
    });

    it('should encode vector of generics', function() {
        assert.deepEqual(s.decode({
            bytes: s.encode('user', {
                id: 2020,
                name: '',
                comments: [100300,399993]
            })
        }), {
            _type: 'User',
            _name: 'user',
            id: 2020,
            name: '',
            comments: [100300,399993]
        });
    });
});
