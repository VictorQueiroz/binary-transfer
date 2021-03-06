import fs from 'fs';
import assert from 'assert';
import { language, enums } from '../../src';

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

    it('should get containers from inside namespace even if there is more defined namespaces', function(){
        assert.deepEqual(schemaParser.parse(`
            namespace user {
                type User {
                    user -> id: uint, posts: Vector<Post>;
                }
                type Post {
                    post -> id: uint;
                }

                namespace filter {
                    type UserFilter {
                        userFilter -> skip: uint, limit: uint
                    }
                }
            }
        `), [{
            id: 3069954460,
            doc: [],
            name: 'user.user',
            params: [{
                doc: [],
                genericType: 'uint',
                name: 'id',
                type: ParamEnum.GENERIC
            }, {
                doc: [],
                name: 'posts',
                type: ParamEnum.VECTOR,
                vectorOf: 'user.Post'
            }],
            traits: [],
            type: 'user.User'
        }, {
            doc: [],
            id: 2800232608,
            name: 'user.post',
            params: [{
                doc: [],
                genericType: 'uint',
                name: 'id',
                type: ParamEnum.GENERIC
            }],
            traits: [],
            type: 'user.Post'
        }, {
            id: 2984324565,
            doc: [],
            name: 'user.filter.userFilter',
            params: [{
                doc: [],
                genericType: 'uint',
                name: 'skip',
                type: ParamEnum.GENERIC
            }, {
                doc: [],
                genericType: 'uint',
                name: 'limit',
                type: ParamEnum.GENERIC
            }],
            traits: [],
            type: 'user.filter.UserFilter'
        }]);
    });

    it('should support traits as a container type', function() {
        assert.deepEqual(schemaParser.parse(`
            trait Request;

            type SendMessage implements Request {
                sendMessage
            }

            type InvokeWithLayer {
                invokeWithLayer {
                    version: uint;
                    request: Request;
                }
            }
        `), [{
            id: 96066025,
            traits: ['Request'],
            name: 'sendMessage',
            type: 'SendMessage',
            doc: [],
            params: []
        }, {
            id: 2235139409,
            doc: [],
            params: [{
                type: ParamEnum.GENERIC,
                genericType: 'uint',
                name: 'version',
                doc: []
            }, {
                type: ParamEnum.NON_GENERIC,
                containerReference: 'Request',
                doc: [],
                name: 'request'
            }],
            traits: [],
            name: 'invokeWithLayer',
            type: 'InvokeWithLayer'
        }]);
    });

    it('should support optional param', function() {
        assert.deepEqual(schemaParser.parse(`
            photo : Photo -> id: uint;
            user : User {
                id: uint;
                photo?: Photo;
            }
        `), [{
            doc: [],
            id: 1069932124,
            traits: [],
            name: 'photo',
            params: [{
                doc: [],
                genericType: 'uint',
                type: ParamEnum.GENERIC,
                name: 'id'
            }],
            type: 'Photo'
        }, {
            id: 2244306929,
            doc: [],
            name: 'user',
            traits: [],
            params: [{
                doc: [],
                genericType: 'uint',
                name: 'id',
                type: ParamEnum.GENERIC
            }, {
                doc: [],
                containerReference: 'Photo',
                name: 'photo',
                type: ParamEnum.NON_GENERIC | ParamEnum.OPTIONAL
            }],
            type: 'User'
        }]);
    });

    it('should handle generic aliases', function() {
        assert.deepEqual(schemaParser.parse(`
            alias ObjectId = bytes

            type Post {
                post -> id: ObjectId
            }
        `), [{
            id: 2048757241,
            doc: [],
            traits: [],
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

    it('should support deep namespacing', function() {
        assert.deepEqual(schemaParser.parse(`
            // photo container
            photo : Photo -> id: uint;

            namespace admin {
                namespace user {
                    type SetProfilePhotoResponse {
                        // set user profile picture
                        SetProfilePhoto -> photo: Photo
                    }
                }
            }
        `), [{
            doc: [' photo container'],
            id: 1069932124,
            name: 'photo',
            traits: [],
            params: [{
                doc: [],
                genericType: 'uint',
                name: 'id',
                type: ParamEnum.GENERIC
            }],
            type: 'Photo'
        }, {
            doc: [' set user profile picture'],
            id: 588240056,
            name: 'admin.user.SetProfilePhoto',
            traits: [],
            params: [{
                containerReference: 'Photo',
                doc: [],
                name: 'photo',
                type: ParamEnum.NON_GENERIC
            }],
            type: 'admin.user.SetProfilePhotoResponse'
        }]);
    });

    it('should handle strict size generic type aliases', function() {
        assert.deepEqual(schemaParser.parse(`
            alias ObjectId = bytes[12]

            post : Post -> id: ObjectId
        `), [{
            id: 3178530016,
            doc: [],
            name: 'post',
            traits: [],
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
            id: 2318995921,
            doc: [],
            traits: [],
            params: [{
                doc: [],
                type: ParamEnum.GENERIC,
                name: 'body',
                genericType: 'string',
            }],
            type: 'posts.Comment',
            name: 'posts.comment'
        }, {
            id: 3029264984,
            doc: [],
            traits: [],
            params: [{
                doc: [],
                type: ParamEnum.GENERIC,
                genericType: 'uint',
                name: 'deleteDate'
            }],
            type: 'posts.Comment',
            name: 'posts.commentDeleted'
        }, {
            id: 4168132268,
            name: 'posts.post',
            traits: [],
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

    it('should catch all blocks of comments before container', function() {
        assert.deepEqual(schemaParser.parse(`
            type Post {
                /* A */
                /* B */
                /* C */
                /* D */
                postEmpty
            }
            // E
            // F
            // G
            // H
            user : User
        `), [{
            id: 3519479065,
            traits: [],
            doc: [
                ' A ',
                ' B ',
                ' C ',
                ' D '
            ],
            name: 'postEmpty',
            params: [],
            type: 'Post'
        }, {
            id: 2648436498,
            traits: [],
            doc: [
                ' E',
                ' F',
                ' G',
                ' H'
            ],
            name: 'user',
            params: [],
            type: 'User'
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
            traits: [],
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
            id: 2115106932,
            doc: [],
            name: 'post.post',
            traits: [],
            params: [{
                doc: [],
                type: ParamEnum.VECTOR,
                vectorOf: 'post.comment',
                name: 'comments'
            }],
            type: 'post.Post'
        }, {
            id: 2733325657,
            doc: [],
            traits: [],
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
            id: 33940583,
            name: 'posts.post',
            doc: [],
            traits: [],
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
            traits: [],
            doc: [],
            name: 'post',
            type: 'Post'
        }, {
            id: 1050142408,
            name: 'postEdited',
            traits: [],
            doc: [],
            params: [],
            type: 'Post'
        }, {
            id: 3428278400,
            name: 'postDeleted',
            traits: [],
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
            traits: [],
            type: 'User'
        }, {
            id: 2071494210,
            doc: [],
            name: 'userDeleted',
            traits: [],
            params: [],
            type: 'User'
        }, {
            id: 1321802668,
            doc: [],
            traits: [],
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
            id: 112001971,
            doc: [],
            name: 'user.user',
            traits: [],
            params: [{
                doc: [],
                type: ParamEnum.GENERIC,
                genericType: 'uint',
                name: 'id'
            }],
            type: 'user.User'
        }, {
            id: 2018556925,
            doc: [],
            name: 'posts.post',
            traits: [],
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
            traits: [],
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
            traits: [],
            type: 'Post',
            name: 'postDefault'
        }, {
            id: 3970390829,
            traits: [],
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
            traits: [],
            doc: [],
            name: 'posts.postDefault',
            type: 'posts.Post',
            params: []
        }, {
            id: 3062764745,
            traits: [],
            doc: [],
            name: 'posts.postRemoved',
            type: 'posts.Post',
            params: []
        }, {
            id: 3817071662,
            doc: [],
            traits: [],
            name: 'posts.postDeleted',
            type: 'posts.Post',
            params: []
        }, {
            id: 2589134390,
            doc: [],
            traits: [],
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
            traits: [],
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
            id: 2158046050,
            doc: [],
            traits: [],
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
            traits: [],
            params: [],
            name: 'void'
        }]);
    });

    it('should parse namespaced constructors', function() {
        assert.deepEqual(schemaParser.parse(`
            namespace user {
                type User {
                    userRegular -> id: int
                }
            }
        `), [{
            id: 2167712555,
            doc: [],
            type: 'user.User',
            traits: [],
            params: [{
                genericType: 'int',
                type: ParamEnum.GENERIC,
                name: 'id',
                doc: []
            }],
            name: 'user.userRegular'
        }]);
    });

    it('should transform multi line comments into a nice readable container comment', function() {
        assert.deepEqual(schemaParser.parse(`
            type User {
                /**
                 * Lorem ipsum dolor sit amet, consectetur adipiscing elit. Fusce molestie 
                 * congue nibh. Fusce ac enim semper, pellentesque est et, varius quam. 
                 * Aliquam tortor felis, congue vulputate nibh ac, lacinia bibendum mauris. 
                 * Ut tristique egestas mollis. Integer ac justo sit amet ligula iaculis 
                 * viverra. Mauris euismod ac dui sed rhoncus. Suspendisse molestie tempus 
                 * dapibus.
                 */
                user
            }
        `), [{
            id: 2648436498,
            doc: [
                'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Fusce molestie ',
                'congue nibh. Fusce ac enim semper, pellentesque est et, varius quam. ',
                'Aliquam tortor felis, congue vulputate nibh ac, lacinia bibendum mauris. ',
                'Ut tristique egestas mollis. Integer ac justo sit amet ligula iaculis ',
                'viverra. Mauris euismod ac dui sed rhoncus. Suspendisse molestie tempus ',
                'dapibus.'
            ],
            name: 'user',
            params: [],
            traits: [],
            type: 'User'
        }]);
    });

    it('should support another container requiring a previously defined container', function() {
        assert.deepEqual(schemaParser.parse(`
            namespace admin {
                type User {
                    user -> posts: Vector<Post>
                }
                type Post {
                    post -> id: uint
                }
            }
            namespace admin2 {
                type User {
                    user -> posts: Vector<Post>
                }
            }
        `), [{
            id: 2409565204,
            doc: [],
            name: 'admin.user',
            traits: [],
            params: [{
                doc: [],
                name: 'posts',
                type: ParamEnum.VECTOR,
                vectorOf: 'admin.Post'
            }],
            type: 'admin.User'
        }, {
            doc: [],
            id: 1849907555,
            traits: [],
            name: 'admin.post',
            params: [{
                doc: [],
                genericType: 'uint',
                name: 'id',
                type: ParamEnum.GENERIC
            }],
            type: 'admin.Post'
        }, {
            id: 931914302,
            doc: [],
            traits: [],
            name: 'admin2.user',
            params: [{
                name: 'posts',
                type: ParamEnum.VECTOR,
                vectorOf: 'Post',
                doc: []
            }],
            type: 'admin2.User'
        }]);
    });
});
