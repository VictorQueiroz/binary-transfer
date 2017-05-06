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
        if(Buffer.isBuffer(schema)) {
            return this.parse(schema.toString('utf8'));
        }

        return this.parseAst(this.ast.ast(schema));
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
            const containers = [];

            ast.body.forEach(node => {
                switch(node.type) {
                case Syntax.TypeGroup:
                case Syntax.Namespace:
                    containers.push(...this.parseAst(node, ast));
                    break;
                case Syntax.TypeDeclaration:
                    containers.push(this.parseAst(node, ast));
                    break;
                }
            });

            return containers;
        }
        case Syntax.TypeDeclaration: {
            return this._crc({
                name: this.parseAst(ast.ctor),
                type: this.parseAst(ast.name),
                params: ast.body.map(node => this.parseAst(node, ast))
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

            const containers = [];
            const { body : astBody } = ast;

            astBody.forEach(c => {
                switch(c.type) {
                case Syntax.TypeDeclaration:
                    containers.push(this.parseAst(c));
                    break;
                case Syntax.TypeGroup:
                    containers.push(...this.parseAst(c));
                    break;
                }
            });

            for(let i = 0; i < astBody.length; i++) {
                switch(astBody[i].type) {
                case Syntax.TypeGroup:
                    const parsed = this.parseAst(astBody[i]);

                    for(let j = 0; j < parsed.length; j++) {
                        body.push(this.parseNamespacedContainer(parsed[j], containers, namespace));
                    }
                    break;
                case Syntax.TypeDeclaration:
                    body.push(this.parseNamespacedContainer(this.parseAst(astBody[i]), containers, namespace));
                    break;
                }
            }

            for(let i = 0; i < ast.body.length; i++) {
                switch(ast.body[i].type) {
                case Syntax.Namespace:
                    body.push(...this.parseAst(ast.body[i], ast, containers.concat(body)));
                    break;
                }

            }

            return body;
        }
        case Syntax.TypeGroup:
            return ast.body.map(child => this.parseAst(child, ast));
        case Syntax.TypeGroupContainer:
            const typeName = this.parseAst(parent.name);

            return this._crc({
                type: typeName,
                name: this.parseAst(ast.name),
                params: ast.body.map(child => this.parseAst(child, ast))
            });
        case Syntax.TypeProperty: {
            return {
                type: this.parseAst(ast.returnType),
                name: this.parseAst(ast.key)
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

    parseNamespacedContainer({ name, type, params }, allContainers, namespace) {
        return this._crc({
            name: `${namespace}.${name}`,
            type: BaseConstructor.isGenericType(type) ? type : `${namespace}.${type}`,
            params: params.map(param => {
                let type = param.type;
                const isVector = type.substring(0, 6) == 'Vector';
                const vectorType = isVector && type.substring(7, type.length - 1);

                const foundLocalContainer = allContainers.some(container => {
                    return container.type == (isVector ? vectorType : type);
                });

                if(foundLocalContainer) {
                    type = vectorType ? `Vector<${namespace}.${vectorType}>` : `${namespace}.${type}`;
                }

                return {
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
