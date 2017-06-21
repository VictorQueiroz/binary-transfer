import _ from 'lodash';
import crc from 'crc';
import { Buffer } from 'buffer';
import { ParamEnum } from '../enums';
import { AST, Syntax } from './AST';
import { createMessage } from '../utils';

const genericTypes = require('../../generics');

class SchemaParser {
    constructor() {
        this.ast = new AST();
        this.aliases = {};
        this.containers = [];
    }

    parse(schema) {
        this.aliases = [];
        this.containers = [];

        if(Buffer.isBuffer(schema)) {
            schema = schema.toString('utf8');
        }

        this.parseAst(this.ast.ast(schema));

        return this.containers;
    }

    shiftNextComment(ctx) {
        let comment;

        if(ctx.hasOwnProperty('comments')) {
            comment = ctx.comments.shift();
        }

        return comment || [];
    }

    collectComments(body) {
        const comments = [];
        const _comments = [];

        function clearGroup() {
            if(_comments.length > 0) {
                comments.push(_comments.splice(0, _comments.length));
            }
        }

        for(let i = 0; i < body.length; i++) {
            if(body[i].type !== Syntax.CommentBlock) {
                clearGroup();
                continue;
            }

            _comments.push(this.parseAst(body[i]));
        }

        clearGroup();

        return comments;
    }

    parseAst(ast, ctx = {}) {
        switch(ast.type) {
        case Syntax.Schema:
            const comments = this.collectComments(ast.body);

            ast.body.forEach(node => {
                const result = this.parseAst(node, { comments });

                switch(node.type) {
                case Syntax.GenericAlias:
                case Syntax.CommentBlock:
                    break;
                case Syntax.TypeDeclaration:
                    this.containers.push(result);
                    break;
                case Syntax.TypeGroup:
                case Syntax.Namespace:
                    result.forEach(container => {
                        this.containers.push(container);
                    });
                    break;
                default:
                    throw new Error(`unhandled ast type -> ${node.type}`);
                }
            });
            break;
        case Syntax.GenericAlias: {
            const aliasName = this.parseAst(ast.aliasName);

            if(this.aliases.hasOwnProperty(aliasName)) {
                this.throwError('double definition of generic alias -> %s', aliasName);
                return false;
            }

            this.aliases[aliasName] = ast.genericTarget;
            break;
        }
        case Syntax.TypeGroup: {
            const body = ast.body;
            const comments = this.collectComments(body);
            const groupName = this.parseAst(ast.name);
            const containers = [];

            for(let i = 0; i < body.length; i++) {
                if(body[i].type === Syntax.CommentBlock) {
                    continue;
                }
                containers.push(this.parseAst(body[i], {
                    comments
                }));
            }
            const ii = containers.length;

            for(let i = 0; i < ii; i++) {
                containers[i].type = groupName;

                this.crc(containers[i]);
            }

            return containers;
        }
        case Syntax.TypeGroupContainer: {
            const body = ast.body;
            const result = {
                doc: this.shiftNextComment(ctx),
                name: this.parseAst(ast.name),
                params: []
            };
            const comments = this.collectComments(body);
            const ii = body.length;

            for(let i = 0; i < ii; i++) {
                if(body[i].type === Syntax.CommentBlock) {
                    continue;
                }

                result.params.push(this.parseAst(body[i], {
                    comments
                }));
            }

            return result;
        }
        case Syntax.Namespace: {
            const body = ast.body;
            const namespace = this.parseAst(ast.name);
            const containers = [];

            const ii = body.length;
            const comments = this.collectComments(body);

            for(let i = 0; i < ii; i++) {
                const result = this.parseAst(body[i], {
                    comments
                });

                switch(body[i].type) {
                case Syntax.CommentBlock:
                    break;
                case Syntax.TypeGroup:
                    result.forEach(container => {
                        containers.push(container);
                    });
                    break;
                case Syntax.TypeDeclaration:
                    containers.push(result);
                    break;
                default:
                    throw new Error(`Invalid ast type for namespace parsing -> ${body[i].type}`);
                }
            }

            const _c = _.cloneDeep(containers);

            for(let i = 0; i < _c.length; i++) {
                const container = _c[i];
                const { params } = container;
                const jj = params.length;

                for(let j = 0; j < jj; j++) {
                    const param = params[j];

                    if(param.type & ParamEnum.GENERIC) {
                        continue;
                    }

                    if(param.type & ParamEnum.VECTOR) {
                        const foundInContext = containers.some(container => {
                            return container.name === param.vectorOf ||
                                    container.type === param.vectorOf;
                        });

                        if(foundInContext) {
                            _c[i].params[j].name = param.name;
                            _c[i].params[j].vectorOf = namespace + '.' + param.vectorOf;
                        }
                        continue;
                    }

                    if(param.type & ParamEnum.NON_GENERIC) {
                        const reference = param.containerReference;
                        const foundInContext = containers.some(container => {
                            return container.name === reference ||
                                    container.type === reference;
                        });

                        if(foundInContext) {
                            _.update(_c, `${i}.params[${j}].containerReference`, reference => {
                                return namespace + '.' + reference;
                            });
                        }
                    }
                }

                _c[i].name = namespace + '.' + _c[i].name;
                _c[i].type = namespace + '.' + _c[i].type;
                this.crc(_c[i]);
            }

            return _c;
        }
        case Syntax.TypeIdentifier:
            return `${this.parseAst(ast.namespace)}.${this.parseAst(ast.property)}`;
        case Syntax.TypeDeclaration: {
            const body = ast.body;
            const result = {
                doc: this.shiftNextComment(ctx),
                name: this.parseAst(ast.ctor),
                type: this.parseAst(ast.name),
                params: new Array(body.length)
            };

            for(let i = 0; i < body.length; i++) {
                if(body[i].type === Syntax.CommentBlock)
                    continue;

                result.params[i] = this.parseAst(body[i], ctx);
            }

            this.crc(result);

            return result;
        }
        case Syntax.TypeProperty: {
            const result = {
                name: this.parseAst(ast.key),
                type: 0,
                doc: this.shiftNextComment(ctx)
            };

            this.parseParamType(ast.returnType, result);
            return result;
        }
        case Syntax.CommentBlock: {
            return ast.lines.join('\n');
        }
        case Syntax.TypeSizeSpecification: {
            const name = this.parseAst(ast.name);
            const size = this.parseAst(ast.size);

            ctx.type |= ParamEnum.STRICT_SIZE;
            ctx.size = size;
            
            return name;
        }
        case Syntax.Literal:
            return ast.value;
        case Syntax.Identifier:
            return ast.name;
        default:
            this.throwError('Unhandled ast type -> %s', ast.type);
        }
    }

    typeToStr(type, param) {
        let str = '';

        if(type & ParamEnum.GENERIC) {
            str += `generic#${param.genericType}`;
        } else if(type & ParamEnum.NON_GENERIC) {
            str += `non_generic#${param.containerReference}`;
        }
        if(type & ParamEnum.VECTOR) {
            str += `vector#${param.vectorOf}`;
        }
        if(type & ParamEnum.STRICT_SIZE) {
            str += `[${param.size}]`;
        }

        return str;
    }

    paramToStr(param, result) {
        return this.typeToStr(param.type, param);
    }

    crc(result) {
        let str = '';

        const paramsStr = [];
        const { name, type, params } = result;

        str += name;
        str += ':';
        str += type;
        str += ' ';

        for(let i = 0; i < params.length; i++) {
            paramsStr[i] = this.typeToStr(params[i].type, params[i]);
        }

        str += paramsStr.join(' ');

        // console.log(str);

        result.id = crc.crc32(str);
    }

    parseNonGenericProperty(type, result) {
        result.type |= ParamEnum.NON_GENERIC;
        result.containerReference = type;        
    }

    parseParamType(ast, result) {
        switch(ast.type) {
        case Syntax.TypeIdentifier:
            const type = this.parseAst(ast.namespace) + '.' + this.parseAst(ast.property);

            this.parseNonGenericProperty(type, result);
            break;
        case Syntax.Identifier:
            let name = ast.name;

            if(this.aliases.hasOwnProperty(name)) {
                const alias = this.aliases[name];

                name = this.parseAst(alias, result);
            }

            if(genericTypes.indexOf(name) !== -1) {
                result.type |= ParamEnum.GENERIC;
                result.genericType = name;
                break;
            }

            this.parseNonGenericProperty(name, result);
            break;
        case Syntax.Vector:
            const vectorOf = this.parseAst(ast.vectorType);

            result.type |= ParamEnum.VECTOR;
            result.vectorOf = vectorOf;
            break;
        default:
            throw new Error(`Invalid ast type -> ${ast.type}`);
        }
    }

    throwError(...args) {
        throw new Error(createMessage(...args));
    }
}

export default SchemaParser;
