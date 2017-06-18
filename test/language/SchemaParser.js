import fs from 'fs';
import assert from 'assert';
import { language, enums } from '../src';

const { ParamEnum } = enums;

describe('SchemaParser', function() {
    let testSchema,
        schemaParser;

    beforeEach(() => {
        testSchema = fs.readFileSync('./test/test-schema.txt');
        schemaParser = new language.SchemaParser();
    });

    it('should not allow double definition of generic aliases', function() {
        assert.throws(function() {
            schemaParser,parse(`
                alias A = string[12];
                alias A = string[12];
            `);
        });
    });

    it('should handle generic aliases', function() {
        assert.deepEqual(schemaParser.parse(`
            alias ObjectId = bytes

            type Post {
                post -> id: ObjectId
            }
        `), [{
            id: 1292630130,
            doc: [],
            name: 'post',
            params: [{
                type: ParamEnum.GENERIC,
                doc: [],
                name: 'id',
                genericType: 'bytes'
            }],
            type: 'Post'
        }]);
    });

    it('should handle strict size generic type aliases', function() {
        assert.deepEqual(schemaParser.parse(`
            alias ObjectId = bytes[12]

            post : Post -> id: ObjectId
        `), [{
            id: 1899171769,
            doc: [],
            name: 'post',
            params: [{
                genericType: 'bytes',
                size: 12,
                doc: [],
                type: ParamEnum.STRICT_SIZE | ParamEnum.GENERIC,
                name: 'id'
            }],
            type: 'Post'
        }]);
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
            id: 2993745826,
            doc: [],
            params: [{
                doc: [],
                type: ParamEnum.GENERIC,
                name: 'body',
                genericType: 'string',
            }],
            type: 'posts.Comment',
            name: 'posts.comment'
        }, {
            id: 2063531210,
            doc: [],
            params: [{
                doc: [],
                type: ParamEnum.GENERIC,
                genericType: 'uint',
                name: 'deleteDate'
            }],
            type: 'posts.Comment',
            name: 'posts.commentDeleted'
        }, {
            id: 3702544615,
            name: 'posts.post',
            doc: [],
            params: [{
                doc: [],
                type: ParamEnum.GENERIC,
                genericType: 'string',
                name: 'name'
            }, {
                doc: [],
                type: ParamEnum.VECTOR,
                vectorOf: 'posts.Comment',
                name: 'comments'
            }],
            type: 'posts.Post'
        }]);
    });

    it('should support comments for containers inside namespaces', function() {
        assert.deepEqual(schemaParser.parse(`
            namespace post {
                /* default post */
                post : Post
            }
        `), [{
            id: 3528988256,
            doc: [" default post "],
            params: [],
            type: 'post.Post',
            name: 'post.post'
        }]);
    });

    it('should not match container type reference', function() {
        assert.deepEqual(schemaParser.parse(`
            namespace post {
                type Post {
                    post {
                        comments: Vector<comment>;
                    }
                }
                type Comment {
                    comment -> id: uint
                }
            }
        `), [{
            id: 1122210879,
            doc: [],
            name: 'post.post',
            params: [{
                doc: [],
                type: ParamEnum.VECTOR,
                vectorOf: 'post.comment',
                name: 'comments'
            }],
            type: 'post.Post'
        }, {
            id: 2098008278,
            doc: [],
            name: 'post.comment',
            params: [{
                doc: [],
                name: 'id',
                type: ParamEnum.GENERIC,
                genericType: 'uint'
            }],
            type: 'post.Comment'
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
            id: 2821083026,
            name: 'posts.post',
            doc: [],
            params: [{
                doc: [],
                type: ParamEnum.GENERIC,
                name: 'name',
                genericType: 'string',
            }, {
                doc: [],
                type: ParamEnum.VECTOR,
                vectorOf: 'Comment',
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
            id: 1960609718,
            params: [],
            doc: [],
            name: 'post',
            type: 'Post'
        }, {
            id: 1050142408,
            name: 'postEdited',
            doc: [],
            params: [],
            type: 'Post'
        }, {
            id: 3428278400,
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
            id: 2648436498,
            doc: [],
            name: 'user',
            params: [],
            type: 'User'
        }, {
            id: 2071494210,
            doc: [],
            name: 'userDeleted',
            params: [],
            type: 'User'
        }, {
            id: 1055426487,
            doc: [],
            name: 'userMoved',
            params: [{
                type: ParamEnum.GENERIC,
                genericType: 'uint',
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
            id: 2566007917,
            doc: [],
            name: 'user.user',
            params: [{
                doc: [],
                type: ParamEnum.GENERIC,
                genericType: 'uint',
                name: 'id'
            }],
            type: 'user.User'
        }, {
            id: 1784606433,
            doc: [],
            name: 'posts.post',
            params: [{
                doc: [],
                type: ParamEnum.NON_GENERIC,
                name: 'author',
                containerReference: 'user.User',
            }, {
                doc: [],
                type: ParamEnum.NON_GENERIC,
                name: 'account',
                containerReference: 'accounts.Account'
            }],
            type: 'posts.Post'
        }, {
            id: 342777446,
            doc: [],
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
            id: 1224281048,
            doc: [' default post '],
            params: [],
            type: 'Post',
            name: 'postDefault'
        }, {
            id: 2125313560,
            params: [{
                type: ParamEnum.GENERIC,
                genericType: 'uint',
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
            id: 2788488578,
            doc: [],
            name: 'posts.postDefault',
            type: 'posts.Post',
            params: []
        }, {
            id: 3062764745,
            doc: [],
            name: 'posts.postRemoved',
            type: 'posts.Post',
            params: []
        }, {
            id: 3817071662,
            doc: [],
            name: 'posts.postDeleted',
            type: 'posts.Post',
            params: []
        }, {
            id: 341424683,
            doc: [],
            params: [{
                doc: [],
                type: ParamEnum.NON_GENERIC,
                containerReference: 'posts.Comment',
                name: 'comment'
            }],
            name: 'posts.postCommented',
            type: 'posts.Post'
        }, {
            id: 3723934202,
            doc: [],
            name: 'posts.comment',
            params: [],
            type: 'posts.Comment'
        }]);
    });

    it('should parse schema constructors', function() {
        assert.deepEqual(schemaParser.parse(`
            Account account -> id: int, username: string, email: string;
            Void void;
        `), [{
            id: 313154873,
            doc: [],
            type: 'Account',
            params: [{
                genericType: 'int',
                type: ParamEnum.GENERIC,
                name: 'id',
                doc: []
            }, {
                genericType: 'string',
                type: ParamEnum.GENERIC,
                name: 'username',
                doc: []
            }, {
                name: 'email',
                genericType: 'string',
                type: ParamEnum.GENERIC,
                doc: []
            }],
            name: 'account'
        }, {
            id: 659851147,
            doc: [],
            type: 'Void',
            params: [],
            name: 'void'
        }]);
    });

    it('should parse namespaced constructors', function() {
        assert.deepEqual(schemaParser.parse('user.User user.userRegular -> id: int;'), [{
            id: 2192379313,
            doc: [],
            type: 'user.User',
            params: [{
                genericType: 'int',
                type: ParamEnum.GENERIC,
                name: 'id',
                doc: []
            }],
            name: 'user.userRegular'
        }]);
    });
});
