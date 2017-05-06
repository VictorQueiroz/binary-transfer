import fs from 'fs';
import assert from 'assert';
import { language } from '../src';

describe('SchemaParser', function() {
    let testSchema,
        schemaParser;

    beforeEach(() => {
        testSchema = fs.readFileSync('./test/test-schema.txt');
        schemaParser = new language.SchemaParser();
    });

    it('should parse vector inside namespace', function() {
        assert.deepEqual(schemaParser.parse(`
            namespace posts {
                type Comment {
                    comment -> body: string
                    commentDeleted -> deleteDate: uint
                }
                type Post {
                    post {
                        name: string;
                        comments: Vector<Comment>;
                    }
                }
            }
        `), [{
            id: 3858428844,
            params: [{
                type: 'string',
                name: 'body'
            }],
            type: 'posts.Comment',
            name: 'posts.comment'
        }, {
            id: 3660060063,
            params: [{
                type: 'uint',
                name: 'deleteDate'
            }],
            type: 'posts.Comment',
            name: 'posts.commentDeleted'
        }, {
            id: 3650725341,
            name: 'posts.post',
            params: [{
                type: 'string',
                name: 'name'
            }, {
                type: 'Vector<posts.Comment>',
                name: 'comments'
            }],
            type: 'posts.Post'
        }]);
    });

    it('should not match vector if constructor is not find inside namespace', function() {
        assert.deepEqual(schemaParser.parse(`
            namespace posts {
                type Post {
                    post {
                        name: string;
                        comments: Vector<Comment>;
                    }
                }
            }
        `), [{
            id: 4144526986,
            name: 'posts.post',
            params: [{
                type: 'string',
                name: 'name'
            }, {
                type: 'Vector<Comment>',
                name: 'comments'
            }],
            type: 'posts.Post'
        }]);
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
            doc: [],
            name: 'post',
            type: 'Post'
        }, {
            id: 4067641446,
            name: 'postEdited',
            doc: [],
            params: [],
            type: 'Post'
        }, {
            id: 1962839665,
            name: 'postDeleted',
            doc: [],
            params: [],
            type: 'Post'
        }]);
    });

    it('should add documentation notation for container properties', function() {
        assert.deepEqual(schemaParser.parse(`
            type User {
                user
                userDeleted
                userMoved {
                    // new user id
                    userId: uint;
                }
            }
        `), [{
            id: 997141463,
            doc: [],
            name: 'user',
            params: [],
            type: 'User'
        }, {
            id: 988423833,
            doc: [],
            name: 'userDeleted',
            params: [],
            type: 'User'
        }, {
            id: 1994514502,
            doc: [],
            name: 'userMoved',
            params: [{
                type: 'uint',
                name: 'userId',
                doc: [' new user id']
            }],
            type: 'User'
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

    it('should parse comments of constructors inside quick container group typing', function() {
        assert.deepEqual(schemaParser.parse(`
            type Post {
                /* default post */
                postDefault;

                /* removed post */
                postRemoved -> removeDate: uint;
            }
        `), [{
            id: 3712632172,
            doc: [' default post '],
            params: [],
            type: 'Post',
            name: 'postDefault'
        }, {
            id: 2402650323,
            params: [{
                type: 'uint',
                name: 'removeDate',
                doc: []
            }],
            doc: [' removed post '],
            type: 'Post',
            name: 'postRemoved'
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
            // types
            Account account -> id: int, username: string, email: string;
            Void void;
        `), [{
            id: 186715902,
            type: 'Account',
            params: [{
                type: 'int',
                name: 'id',
                doc: []
            }, {
                type: 'string',
                name: 'username',
                doc: []
            }, {
                name: 'email',
                type: 'string',
                doc: []
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
                name: 'id',
                doc: []
            }],
            name: 'user.userRegular'
        }]);
    });
});
