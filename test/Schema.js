import assert from 'assert';
import crypto from 'crypto';
import { Schema, language } from '../src';

describe('Schema', function() {
    let s;

    beforeEach(() => {
        const containers = new language.SchemaParser().parse(`
            alias ObjectId = bytes[12];
            alias PostTitle = string[12];
            type User {
                user -> id: uint, firstName: string
                userEmpty
            }
            type Post {
                post -> id: ObjectId, title: PostTitle
                postCommented -> comments: Vector<Comment>
            }
            type Comment {
                comment -> id: uint
            }
        `);
        s = new Schema([{
            containers
        }]);
    });

    it('should encode simple containers', function() {
        const obj = {
            _name: 'user',
            id: 139391,
            firstName: 'First user'
        };
        assert.deepEqual(s.decode({
            bytes: s.encode(obj)
        }), obj);
    });

    it('should encode strict size types', function() {
        const obj = {
            _name: 'post',
            id: crypto.randomBytes(12),
            title: 'common title'
        };
        assert.deepEqual(s.decode({
            bytes: s.encode(obj)
        }), obj);
    });

    it('should encode vectors', function() {
        const obj = {
            _name: 'postCommented',
            comments: [{
                _name: 'comment',
                id: 0xffffff
            }]
        };
        assert.deepEqual(s.decode({ bytes: s.encode(obj) }), obj);
    });
});
