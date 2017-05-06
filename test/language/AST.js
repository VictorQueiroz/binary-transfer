import { deepEqual } from 'assert';
import { AST, Syntax } from '../../src/language';

describe('AST', function() {
    let ast;

    beforeEach(() => {
        ast = new AST();
    });

    describe('ast()', function() {
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

        xit('should support comments inside container', function() {
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
                        blocks: ['user name']
                    }, {
                        key: {
                            type: Syntax.Identifier,
                            name: 'name'
                        },
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
            deepEqual(ast.ast('--- constructors ---'), {
                type: Syntax.Schema,
                body: [{
                    type: Syntax.CommentBlock,
                    blocks: ['constructors']
                }]
            });
            deepEqual(ast.ast('/* methods */'), {
                type: Syntax.Schema,
                body: [{
                    type: Syntax.CommentBlock,
                    blocks: ['methods']
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
                        returnType: {
                            type: Syntax.Identifier,
                            name: 'string'
                        }
                    }]
                }]
            })
        });
    });
});
