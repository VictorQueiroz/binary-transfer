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
        this.traits = [];
        this.containers = [];
    }

    parse(schema) {
        this.traits = [];
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

    getInitialContext() {
        return {
            traits: [],
            parentContainers: [],
            comments: [],
            path: []
        };
    }

    parseAst(ast, ctx = this.getInitialContext()) {
        switch(ast.type) {
        case Syntax.Schema:
            const comments = this.collectComments(ast.body);
            const nextContext = Object.assign({}, ctx, {
                comments
            });

            ast.body.forEach(node => {
                const result = this.parseAst(node, Object.assign({}, nextContext, {
                    parentContainers: []
                }));

                switch(node.type) {
                case Syntax.GenericAlias:
                case Syntax.CommentBlock:
                case Syntax.TraitDeclaration:
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
        case Syntax.TraitDeclaration: {
            const trait = {
                name: this.parseAst(ast.name),
                params: ast.body.map(node => this.parseAst(node))
            };
            this.traits.push(trait);
            return trait;
        }
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
            const groupName = ctx.path.concat(this.parseAst(ast.name, ctx)).join('.');
            const containers = [];
            const traits = ast.traits.map(trait => this.parseAst(trait, ctx));
            const nextContext = Object.assign({}, ctx, {
                comments,
                traits
            });

            for(let i = 0; i < body.length; i++) {
                if(body[i].type === Syntax.CommentBlock) {
                    continue;
                }

                containers.push(this.parseAst(body[i], nextContext));
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
                name: ctx.path.concat(this.parseAst(ast.name)).join('.'),
                params: [],
                traits: ctx.traits
            };
            const comments = this.collectComments(body);
            const ii = body.length;
            const nextContext = Object.assign({}, ctx, {
                comments
            });

            for(let i = 0; i < ii; i++) {
                if(body[i].type === Syntax.CommentBlock) {
                    continue;
                }

                result.params.push(this.parseAst(body[i], nextContext));
            }

            return result;
        }
        case Syntax.Namespace: {
            const body = ast.body;
            const namespace = this.parseAst(ast.name);

            const ii = body.length;
            const comments = this.collectComments(body);
            const nextContext = Object.assign({}, ctx, {
                comments
            });
            let result = [];

            ctx.path.push(namespace);
            // ctx.parentContainers.splice(0, ctx.parentContainers.length);

            for(let i = 0; i < ii; i++) {
                const response = this.parseAst(body[i], Object.assign({}, ctx, {
                    path: []
                }));

                switch(body[i].type){
                    case Syntax.Namespace:
                        ctx.parentContainers.push(...response);
                        break;
                    case Syntax.TypeGroup:
                        ctx.parentContainers.push(...response);
                        break;
                    case Syntax.TypeDeclaration:
                        ctx.parentContainers.push(response);
                }
            }

            for(let i = 0; i < ii; i++){
                const response = this.parseAst(body[i], nextContext);

                switch(body[i].type){
                    case Syntax.Namespace:
                        result = result.concat(response);
                        break;
                    case Syntax.TypeGroup:
                        result = result.concat(response);
                        break;
                    case Syntax.TypeDeclaration:
                        result = result.concat(response);
                }
            }

            ctx.path.pop();

            return result;
        }
        case Syntax.TypeIdentifier:
            return this.parseAst(ast.namespace) + '.' + this.parseAst(ast.property);
        case Syntax.TypeDeclaration: {
            const body = ast.body;
            const result = {
                doc: this.shiftNextComment(ctx),
                name: ctx.path.concat(this.parseAst(ast.ctor)).join('.'),
                type: ctx.path.concat(this.parseAst(ast.name)).join('.'),
                traits: [],
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
            const name = this.parseAst(ast.key);

            const result = {
                name,
                type: 0,
                doc: this.shiftNextComment(ctx)
            };

            this.parseParamType(ast.returnType, result, ast.optional, ctx);
            return result;
        }
        case Syntax.CommentBlock: {
            return ast.lines.join('\n');
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

        str += param.name + '->';

        if(type & ParamEnum.GENERIC) {
            str += `generic#${param.genericType}`;
        } else if(type & ParamEnum.NON_GENERIC) {
            str += `non_generic#${param.containerReference}`;
        }
        if(type & ParamEnum.OPTIONAL) {
            str += '?';
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
        const { name, type, params, traits = [] } = result;

        str += name;
        str += ':';
        str += type;
        str += ' ';

        for(let i = 0; i < params.length; i++) {
            paramsStr[i] = this.typeToStr(params[i].type, params[i]);
        }

        str += paramsStr.join(' ');

        if(traits.length)
            str += '[traits:' + traits.join(',') + ']';

        // console.log(str);

        result.id = crc.crc32(str);
    }

    getContainerType(type, ctx) {
        let path = [].concat(ctx.path);
        let matches = false;

        if(genericTypes.indexOf(type) > -1)
            return type;

        for(let i = 0; i < ctx.parentContainers.length; i++){
            const container = ctx.parentContainers[i];
            
            if(container.name === type || container.type === type)
                return ctx.path.concat([type]).join('.');

        }

        return type;
    }

    parseNonGenericProperty(type, result, ctx) {
        result.type |= ParamEnum.NON_GENERIC;
        result.containerReference = this.getContainerType(type, ctx);
    }

    parseParamTypeAlias(ast, result, ctx) {
        switch(ast.type) {
            case Syntax.TypeSizeSpecification: {
                const name = this.parseAst(ast.name);
                const size = this.parseAst(ast.size);

                result.type |= ParamEnum.STRICT_SIZE;
                result.size = size;
                
                return name;
            }
            default:
                return this.parseAst(ast, ctx);
        }
    }

    parseParamType(ast, result, optional, ctx) {
        if(optional) {
            result.type |= ParamEnum.OPTIONAL;
        }
        switch(ast.type) {
        case Syntax.TypeIdentifier: {
            const type = [
                this.parseAst(ast.namespace),
                this.parseAst(ast.property)
            ];

            this.parseNonGenericProperty(type.join('.'), result, ctx);
            break;
        }
        case Syntax.Identifier: {
            let name = ast.name;

            if(this.aliases.hasOwnProperty(name)) {
                const alias = this.aliases[name];

                name = this.parseParamTypeAlias(alias, result, ctx);
            }

            if(genericTypes.indexOf(name) !== -1) {
                result.type |= ParamEnum.GENERIC;
                result.genericType = name;
                break;
            }

            this.parseNonGenericProperty(name, result, ctx);
            break;
        }
        case Syntax.Vector: {
            const vectorOf = this.parseAst(ast.vectorType);

            result.type |= ParamEnum.VECTOR;
            result.vectorOf = this.getContainerType(vectorOf, ctx);
            break;
        }
        default:
            throw new Error(`Invalid ast type -> ${ast.type}`);
        }
    }

    throwError(...args) {
        throw new Error(createMessage(...args));
    }
}

export default SchemaParser;
