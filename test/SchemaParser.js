import fs from 'fs';
import assert from 'assert';
import {language} from '../src';

describe('SchemaParser', function() {
    let testSchema,
        schemaParser;

    beforeEach(() => {
        testSchema = fs.readFileSync('./test/test-schema.txt');
        schemaParser = new language.SchemaParser();
    });

    it('should parse container type group', function() {
        assert.deepEqual(schemaParser.parse(`
            type Post {
                post
                postEdited
                postDeleted
            }
        `), [{
            id: 3530048371,
            params: [],
            name: 'post',
            type: 'Post'
        }, {
            id: 4067641446,
            name: 'postEdited',
            params: [],
            type: 'Post'
        }, {
            id: 1962839665,
            name: 'postDeleted',
            params: [],
            type: 'Post'
        }]);
    });

    it('should parse namespaces', function() {
        assert.deepEqual(schemaParser.parse(`
            namespace user {
                user : User -> id: uint
            }
            namespace posts {
                post : Post -> author: user.User, account: accounts.Account
            }
            namespace accounts {
                account : Account
            }
        `), [{
            id: 3738258975,
            name: 'user.user',
            params: [{type: 'uint', name: 'id'}],
            type: 'user.User'
        }, {
            id: 360725528,
            name: 'posts.post',
            params: [{
                type: 'user.User',
                name: 'author'
            }, {
                type: 'accounts.Account',
                name: 'account'
            }],
            type: 'posts.Post'
        }, {
            id: 3950322327,
            name: 'accounts.account',
            params: [],
            type: 'accounts.Account'
        }]);
    });

    it('should parse mix up of namespace > type', function() {
        assert.deepEqual(schemaParser.parse(`
            namespace posts {
                type Post {
                    postDefault
                    postRemoved
                    postDeleted
                    postCommented -> comment: Comment
                }
                comment : Comment
            }
        `), [{
            id: 3033453801,
            name: 'posts.postDefault',
            type: 'posts.Post',
            params: []
        }, {
            id: 2353734871,
            name: 'posts.postRemoved',
            type: 'posts.Post',
            params: []
        }, {
            id: 494542836,
            name: 'posts.postDeleted',
            type: 'posts.Post',
            params: []
        }, {
            id: 1836829228,
            params: [{
                type: 'posts.Comment',
                name: 'comment'
            }],
            name: 'posts.postCommented',
            type: 'posts.Post'
        }, {
            id: 85418714,
            name: 'posts.comment',
            params: [],
            type: 'posts.Comment'
        }]);
    });

    it('should parse schema constructors', function() {
        assert.deepEqual(schemaParser.parse(`
            --- types ---
            Account account -> id: int, username: string, email: string;
            Void void;
        `), [{
            id: 186715902,
            type: 'Account',
            params: [{
                type: 'int',
                name: 'id'
            }, {
                type: 'string',
                name: 'username'
            }, {
                name: 'email',
                type: 'string'
            }],
            name: 'account'
        }, {
            id: 2178958158,
            type: 'Void',
            params: [],
            name: 'void'
        }]);
    });

    it('should parse namespaced constructors', function() {
        assert.deepEqual(schemaParser.parse('user.User user.userRegular -> id: int;'), [{
            id: 4060771189,
            type: 'user.User',
            params: [{
                type: 'int',
                name: 'id'
            }],
            name: 'user.userRegular'
        }]);
    });
});
