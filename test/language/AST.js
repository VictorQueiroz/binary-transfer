import { deepEqual } from 'assert';
import { AST, Syntax } from '../../src/language';

describe('AST', function() {
    let ast;

    beforeEach(() => {
        ast = new AST();
    });

    describe('ast()', function() {
        it('should support optional params', function() {
            const schema = ast.ast('user : User -> id: uint, photo?: Photo');

            deepEqual(schema, {
                type: Syntax.Schema,
                body: [{
                    type: Syntax.TypeDeclaration,
                    name: {
                        type: Syntax.Identifier,
                        name: 'User'
                    },
                    ctor: {
                        name: 'user',
                        type: Syntax.Identifier
                    },
                    body: [{
                        type: Syntax.TypeProperty,
                        optional: false,
                        key: {
                            type: Syntax.Identifier,
                            name: 'id'
                        },
                        optional: false,
                        returnType: {
                            type: Syntax.Identifier,
                            name: 'uint'
                        }
                    }, {
                        type: Syntax.TypeProperty,
                        key: {
                            type: Syntax.Identifier,
                            name: 'photo'
                        },
                        optional: true,
                        returnType: {
                            name: 'Photo',
                            type: Syntax.Identifier
                        }
                    }]
                }]
            });
        });

        it('should deal with quick namespacing', function() {
            const schema = ast.ast(`
                namespace user {
                    user : User {
                        id: uint;
                    }
                }
            `);

            deepEqual(schema, {
                type: Syntax.Schema,
                body: [{
                    type: Syntax.Namespace,
                    body: [ast.ast('User user -> id: uint').body[0]],
                    name: {
                        type: Syntax.Identifier,
                        name: 'user'
                    }
                }]
            });
        });

        it('should support strict size types', function() {
            const schema = ast.ast(`
                alias ObjectId = bytes[12]

                type Post {
                    post -> id: ObjectId
                }
            `);
            deepEqual(schema, {
                type: Syntax.Schema,
                body: [{
                    type: Syntax.GenericAlias,
                    aliasName: {
                        type: Syntax.Identifier,
                        name: 'ObjectId'
                    },
                    genericTarget: {
                        type: Syntax.TypeSizeSpecification,
                        name: {
                            type: Syntax.Identifier,
                            name: 'bytes'
                        },
                        size: {
                            type: Syntax.Literal,
                            value: 12
                        }
                    }
                }, {
                    type: Syntax.TypeGroup,
                    body: [{
                        type: Syntax.TypeGroupContainer,
                        name: {
                            type: Syntax.Identifier,
                            name: 'post'
                        },
                        body: [{
                            type: Syntax.TypeProperty,
                            key: {
                                name: 'id',
                                type: Syntax.Identifier
                            },
                            optional: false,
                            returnType: {
                                type: Syntax.Identifier,
                                name: 'ObjectId'
                            }
                        }]
                    }],
                    traits: [],
                    name: {
                        type: Syntax.Identifier,
                        name: 'Post'
                    }
                }]
            });
        });

        it('should support generic types alias', function() {
            const schema = ast.ast(`
                alias ObjectId = bytes;

                type Post {
                    post -> id: ObjectId
                }
            `);
            deepEqual(schema, {
                type: Syntax.Schema,
                body: [{
                    type: Syntax.GenericAlias,
                    aliasName: {
                        type: Syntax.Identifier,
                        name: 'ObjectId'
                    },
                    genericTarget: {
                        type: Syntax.Identifier,
                        name: 'bytes'
                    }
                }, {
                    type: Syntax.TypeGroup,
                    traits: [],
                    body: [{
                        type: Syntax.TypeGroupContainer,
                        name: {
                            type: Syntax.Identifier,
                            name: 'post'
                        },
                        body: [{
                            type: Syntax.TypeProperty,
                            key: {
                                name: 'id',
                                type: Syntax.Identifier
                            },
                            optional: false,
                            returnType: {
                                type: Syntax.Identifier,
                                name: 'ObjectId'
                            }
                        }]
                    }],
                    name: {
                        type: Syntax.Identifier,
                        name: 'Post'
                    }
                }]
            });
        });

        it('should support comments inside quick container group typing', function() {
            deepEqual(ast.ast(`
                type Post {
                    /* default post */
                    postDefault;

                    /* removed post */
                    postRemoved -> removeDate: uint;
                }
            `), {
                type: Syntax.Schema,
                body: [{
                    type: Syntax.TypeGroup,
                    traits: [],
                    name: {
                        type: Syntax.Identifier,
                        name: 'Post'
                    },
                    body: [{
                        type: Syntax.CommentBlock,
                        lines: [' default post ']
                    }, {
                        type: Syntax.TypeGroupContainer,
                        name: {
                            type: Syntax.Identifier,
                            name: 'postDefault'
                        },
                        body: []
                    }, {
                        type: Syntax.CommentBlock,
                        lines: [' removed post ']
                    }, {
                        type: Syntax.TypeGroupContainer,
                        name: {
                            type: Syntax.Identifier,
                            name: 'postRemoved'
                        },
                        body: [{
                            type: Syntax.TypeProperty,
                            key: {
                                type: Syntax.Identifier,
                                name: 'removeDate'
                            },
                            optional: false,
                            returnType: {
                                type: Syntax.Identifier,
                                name: 'uint'
                            }        
                        }]
                    }]
                }]
            });
        });

        it('should support deep namespacing', function() {
            const schema = ast.ast(`
                namespace user {
                    namespace register {
                        createAccountEmail : CreateAccount
                        createAccountPhone : CreateAccount
                    }
                    namespace update {
                        updateUsername : UpdateUser -> username: string
                    }
                }
            `);

            deepEqual(schema, {
                type: Syntax.Schema,
                body: [{
                    name: {
                        type: Syntax.Identifier,
                        name: 'user'
                    },
                    body: [{
                        type: Syntax.Namespace,
                        name: {
                            type: Syntax.Identifier,
                            name: 'register'
                        },
                        body: [
                            ast.ast('createAccountEmail : CreateAccount').body[0],
                            ast.ast('createAccountPhone : CreateAccount').body[0],
                        ]
                    }, {
                        type: Syntax.Namespace,
                        name: {
                            type: Syntax.Identifier,
                            name: 'update'
                        },
                        body: [
                            ast.ast('updateUsername : UpdateUser -> username: string').body[0],
                        ]
                    }],
                    type: Syntax.Namespace
                }]
            });
        });

        it('should support comments inside container', function() {
            const schema = ast.ast(`
                user : User {
                    /* user name */
                    name: string;
                }
            `);

            deepEqual(schema, {
                type: Syntax.Schema,
                body: [{
                    body: [{
                        type: Syntax.CommentBlock,
                        lines: [' user name ']
                    }, {
                        key: {
                            type: Syntax.Identifier,
                            name: 'name'
                        },
                        optional: false,
                        returnType: {
                            type: Syntax.Identifier,
                            name: 'string'
                        },
                        type: Syntax.TypeProperty
                    }],
                    ctor: {
                        type: Syntax.Identifier,
                        name: 'user'
                    },
                    name: {
                        type: Syntax.Identifier,
                        name: 'User'
                    },
                    type: Syntax.TypeDeclaration
                }]
            });
        });

        it('should deal with container group of one type', function() {
            const schema = ast.ast(`
                namespace user {
                    type User {
                        userDeleted;
                        userBanned -> bannedAt: uint;
                    }
                }
            `);
            deepEqual(schema, {
                type: Syntax.Schema,
                body: [{
                    type: Syntax.Namespace,
                    name: {
                        type: Syntax.Identifier,
                        name: 'user'
                    },
                    body: [{
                        type: Syntax.TypeGroup,
                        traits: [],
                        name: {
                            type: Syntax.Identifier,
                            name: 'User'
                        },
                        body: [{
                            type: Syntax.TypeGroupContainer,
                            name: {
                                type: Syntax.Identifier,
                                name: 'userDeleted'
                            },
                            body: []
                        }, {
                            type: Syntax.TypeGroupContainer,
                            name: {
                                type: Syntax.Identifier,
                                name: 'userBanned'
                            },
                            body: [{
                                type: Syntax.TypeProperty,
                                key: {
                                    type: Syntax.Identifier,
                                    name: 'bannedAt'
                                },
                                optional: false,
                                returnType: {
                                    type: Syntax.Identifier,
                                    name: 'uint'
                                }
                            }]
                        }]
                    }]
                }]
            });
        });

        it('should deal with namespaces', function() {
            const schema = ast.ast(`
                users.User users.user;
                Msg messages.message;
            `);

            deepEqual(schema, {
                type: Syntax.Schema,
                body: [{
                    type: Syntax.TypeDeclaration,
                    ctor: {
                        type: Syntax.TypeIdentifier,
                        property: {
                            type: Syntax.Identifier,
                            name: 'user'
                        },
                        namespace: {
                            type: Syntax.Identifier,
                            name: 'users'
                        }
                    },
                    name: {
                        type: Syntax.TypeIdentifier,
                        property: {
                            type: Syntax.Identifier,
                            name: 'User'
                        },
                        namespace: {
                            type: Syntax.Identifier,
                            name: 'users'
                        }
                    },
                    body: []
                }, {
                    type: Syntax.TypeDeclaration,
                    name: {
                        type: Syntax.Identifier,
                        name: 'Msg'
                    },
                    ctor: {
                        type: Syntax.TypeIdentifier,
                        property: {
                            type: Syntax.Identifier,
                            name: 'message'
                        },
                        namespace: {
                            type: Syntax.Identifier,
                            name: 'messages'
                        }
                    },
                    body: []
                }]
            });
        });

        it('should support constructor name first like "flow"', function() {
            deepEqual(ast.ast('user : User -> id: uint;'), {
                type: Syntax.Schema,
                body: [{
                    type: Syntax.TypeDeclaration,
                    body: [{
                        type: Syntax.TypeProperty,
                        key: {
                            type: Syntax.Identifier,
                            name: 'id'
                        },
                        optional: false,
                        returnType: {
                            name: 'uint',
                            type: Syntax.Identifier
                        }
                    }],
                    ctor: {
                        type: Syntax.Identifier,
                        name: 'user'
                    },
                    name: {
                        type: Syntax.Identifier,
                        name: 'User'
                    },
                    type: Syntax.TypeDeclaration
                }]
            });
        });

        it('should support vector type', function() {
            const schema = ast.ast(`
                UserList userList {
                    users: Vector<User>;
                }
            `);

            deepEqual(schema, {
                type: Syntax.Schema,
                body: [{
                    type: Syntax.TypeDeclaration,
                    ctor: {
                        type: Syntax.Identifier,
                        name: 'userList'
                    },
                    name: {
                        type: Syntax.Identifier,
                        name: 'UserList'
                    },
                    body: [{
                        type: Syntax.TypeProperty,
                        key: {
                            type: Syntax.Identifier,
                            name: 'users'
                        },
                        optional: false,
                        returnType: {
                            type: Syntax.Vector,
                            vectorType: {
                                type: Syntax.Identifier,
                                name: 'User'
                            }
                        }
                    }]
                }]
            });
        });

        it('should support short body without comma at the end', function() {
            deepEqual(ast.ast('player : Player -> id: uint'), ast.ast(`
                player : Player -> id: uint;
            `));
        });

        it('should support short body type declaration', function() {
            const schema = ast.ast(`
                Player player -> id: uint, name: string;
            `);

            deepEqual(schema, ast.ast(`player : Player {
                id: uint;
                name: string;
            }`));
        });

        it('should parse empty body definitions', function() {
            deepEqual(ast.ast('Layer layer;'), {
                type: Syntax.Schema,
                body: [{
                    type: Syntax.TypeDeclaration,
                    body: [],
                    ctor: {
                        type: Syntax.Identifier,
                        name: 'layer'
                    },
                    name: {
                        type: Syntax.Identifier,
                        name: 'Layer'
                    }
                }]
            });
        });

        it('should support comments', function() {
            deepEqual(ast.ast('/* constructors */'), {
                type: Syntax.Schema,
                body: [{
                    type: Syntax.CommentBlock,
                    lines: [' constructors ']
                }]
            });
            deepEqual(ast.ast('/* methods */'), {
                type: Syntax.Schema,
                body: [{
                    type: Syntax.CommentBlock,
                    lines: [' methods ']
                }]
            });
        });

        it('should support trait declaration', function() {
            deepEqual(ast.ast(`
                trait Request {

                }

                namespace post {
                    type GetPostsResponse implements Request {
                        getPosts
                    }
                }

                type InvokeWithPermission {
                    invokeWithPermission {
                        payload: Request;
                    }
                }
            `), {
                type: Syntax.Schema,
                body: [{
                    type: Syntax.TraitDeclaration,
                    body: [],
                    name: {
                        type: Syntax.Identifier,
                        name: 'Request'
                    }
                }, {
                    type: Syntax.Namespace,
                    name: {
                        type: Syntax.Identifier,
                        name: 'post'
                    },
                    body: [{
                        type: Syntax.TypeGroup,
                        body: [{
                            type: Syntax.TypeGroupContainer,
                            name: {
                                name: 'getPosts',
                                type: Syntax.Identifier
                            },
                            body: []
                        }],
                        name: {
                            type: Syntax.Identifier,
                            name: 'GetPostsResponse'
                        },
                        traits: [{
                            type: Syntax.Identifier,
                            name: 'Request'
                        }]
                    }]
                }, {
                    type: Syntax.TypeGroup,
                    traits: [],
                    name: {
                        type: Syntax.Identifier,
                        name: 'InvokeWithPermission'
                    },
                    body: [{
                        type: Syntax.TypeGroupContainer,
                        name: {
                            type: Syntax.Identifier,
                            name: 'invokeWithPermission'
                        },
                        body: [{
                            type: Syntax.TypeProperty,
                            key: {
                                name: 'payload',
                                type: Syntax.Identifier
                            },
                            optional: false,
                            returnType: {
                                type: Syntax.Identifier,
                                name: 'Request'
                            }
                        }]
                    }]
                }]
            });
        });

        it('should parse type definition', function() {
            const schema = ast.ast(`
                User user {
                    id: long;
                    firstName: string;
                    lastName: string;
                }
            `);

            deepEqual(schema, {
                type: Syntax.Schema,
                body: [{
                    type: Syntax.TypeDeclaration,
                    ctor: {
                        type: Syntax.Identifier,
                        name: 'user'
                    },
                    name: {
                        type: Syntax.Identifier,
                        name: 'User'
                    },
                    body: [{
                        type: Syntax.TypeProperty,
                        key: {
                            type: Syntax.Identifier,
                            name: 'id'
                        },
                        optional: false,
                        returnType: {
                            type: Syntax.Identifier,
                            name: 'long'
                        }
                    }, {
                        type: Syntax.TypeProperty,
                        key: {
                            type: Syntax.Identifier,
                            name: 'firstName'
                        },
                        optional: false,
                        returnType: {
                            type: Syntax.Identifier,
                            name: 'string'
                        }
                    }, {
                        type: Syntax.TypeProperty,
                        key: {
                            type: Syntax.Identifier,
                            name: 'lastName'
                        },
                        optional: false,
                        returnType: {
                            type: Syntax.Identifier,
                            name: 'string'
                        }
                    }]
                }]
            });
        });
    });
});
