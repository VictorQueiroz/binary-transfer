import crc from 'crc';
import { Buffer } from 'buffer';
import { AST, Syntax } from './AST';
import BaseConstructor from '../BaseConstructor';
import { createMessage } from '../utils';

class SchemaParser {
    constructor() {
        this.ast = new AST();
    }

    parse(schema) {
        this.aliases = [];
        this.containers = [];

        if(Buffer.isBuffer(schema)) {
            return this.parse(schema.toString('utf8'));
        }

        this.parseAst(this.ast.ast(schema));

        return this.containers;
    }

    _crc(ctor) {
        const { type, name, params } = ctor;

        let str = '';

        str += type;
        str += ' ';
        str += name;

        if(params.length > 0) {
            str += ' -> ' + params.map(param => `${param.name}: ${param.type}`).join(' ');
        }

        str += ';';

        return {
            id: crc.crc32(str),
            ...ctor
        };
    }

    parseAst(ast, parent) {
        switch(ast.type) {
        case Syntax.Schema: {
            const docs = this.getDocs(ast.body);
            const collected = [];

            ast.body.forEach(node => {
                switch(node.type) {
                case Syntax.GenericAlias:
                    this.aliases[this.parseAst(node.aliasName)] = this.parseAst(node.genericTarget);
                }
            });

            ast.body.forEach(node => {
                switch(node.type) {
                case Syntax.TypeGroup:
                case Syntax.Namespace: {
                    const containers = this.parseAst(node, ast);

                    for(let i = 0; i < containers.length; i++) {
                        this.containers.push(containers[i]);
                    }
                    break;
                }
                case Syntax.TypeDeclaration: {
                    const container = this.parseAst(node, ast);

                    container.doc = docs.shift() || [];
                    this.containers.push(container);
                    break;
                }
                }
            });
            break;
        }
        case Syntax.TypeDeclaration: {
            const params = this.parseParams(ast.body, ast);

            return this._crc({
                name: this.parseAst(ast.ctor),
                type: this.parseAst(ast.name),
                params
            });
        }
        case Syntax.Identifier:
            return ast.name;
        case Syntax.Namespace: {
            const body = [];
            let namespace = this.parseAst(ast.name);

            if(parent && parent.type == Syntax.Namespace) {
                namespace = `${this.parseAst(parent.name)}.${namespace}`;
            }

            const docs = this.getDocs(ast.body);
            const containers = [];
            const { body : astBody } = ast;

            astBody.forEach(c => {
                switch(c.type) {
                case Syntax.TypeDeclaration:
                    containers.push(this.parseAst(c, ast));
                    break;
                case Syntax.TypeGroup:
                    containers.push(...this.parseAst(c, ast));
                    break;
                }
            });

            for(let i = 0; i < astBody.length; i++) {
                switch(astBody[i].type) {
                case Syntax.TypeGroup:
                    const parsed = this.parseAst(astBody[i], ast);

                    for(let j = 0; j < parsed.length; j++) {
                        body.push(this.parseNamespacedContainer(parsed[j], containers, namespace));
                    }
                    break;
                case Syntax.TypeDeclaration: {
                    const container = this.parseAst(astBody[i]);

                    container.doc = docs.shift() || [];

                    body.push(this.parseNamespacedContainer(container, containers, namespace));
                    break;
                }
                }
            }

            for(let i = 0; i < astBody.length; i++) {
                switch(astBody[i].type) {
                case Syntax.Namespace:
                    body.push(...this.parseAst(astBody[i], ast, containers.concat(body)));
                    break;
                }

            }

            return body;
        }
        case Syntax.TypeGroup: {
            const containers = [];
            const docs = this.getDocs(ast.body);
            
            for(let i = 0; i < ast.body.length; i++) {
                if(ast.body[i].type == Syntax.CommentBlock) {
                    continue;
                }

                containers.push({
                    ...this.parseAst(ast.body[i], ast),
                    doc: docs.shift() || []
                });
            }

            return containers;
        }
        case Syntax.TypeGroupContainer: {
            const typeName = this.parseAst(parent.name);
            const params = this.parseParams(ast.body, ast);

            return this._crc({
                doc: [],
                type: typeName,
                name: this.parseAst(ast.name),
                params
            });
        }
        case Syntax.TypeProperty: {
            let returnType = this.parseAst(ast.returnType);

            if(this.aliases.hasOwnProperty(returnType)) {
                returnType = this.aliases[returnType];
            }

            return {
                type: returnType,
                name: this.parseAst(ast.key),
                doc: []
            };
        }
        case Syntax.TypeIdentifier:
            return `${this.parseAst(ast.namespace, ast)}.${this.parseAst(ast.property, ast)}`;
        case Syntax.Vector:
            return `Vector<${this.parseAst(ast.vectorType, ast)}>`;
        default:
            this.throwError('unhandled ast type: %s', ast.type);
        }
    }

    getDocs(nodes) {
        return nodes.filter(node => node.type == Syntax.CommentBlock).map(node => node.lines);
    }

    parseParams(body, parent) {
        const params = [];
        const docs = this.getDocs(body);

        for(let i = 0; i < body.length; i++) {
            if(body[i].type != Syntax.CommentBlock) {
                const param = this.parseAst(body[i], parent);

                params.push({
                    ...param,
                    doc: docs.shift() || []
                });
            }
        }

        return params;
    }

    parseNamespacedContainer({ name, type, params, doc }, allContainers, namespace) {
        return this._crc({
            doc,
            name: `${namespace}.${name}`,
            type: BaseConstructor.isGenericType(type) ? type : `${namespace}.${type}`,
            params: params.map(param => {
                let type = param.type;
                const isVector = type.substring(0, 6) == 'Vector';
                const vectorType = isVector && type.substring(7, type.length - 1);

                const containerRef = BaseConstructor.isConstructorReference(isVector ? vectorType : type);
                const foundLocalContainer = allContainers.some(container => {
                    return container[containerRef ? 'name' : 'type'] == (isVector ? vectorType : type);
                });

                if(foundLocalContainer) {
                    type = vectorType ? `Vector<${namespace}.${vectorType}>` : `${namespace}.${type}`;
                }

                return {
                    doc: param.doc || [],
                    name: param.name,
                    type
                };
            })
        });
    }

    throwError(...args) {
        throw new Error(createMessage(...args));
    }
}

export default SchemaParser;
