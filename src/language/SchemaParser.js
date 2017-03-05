import crc from 'crc';
import { Buffer } from 'buffer';
import { AST, Syntax } from './AST';
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

        console.log(str);
        return {
            id: crc.crc32(str),
            ...ctor
        };
    }

    parseAst(ast) {
        switch(ast.type) {
        case Syntax.Schema:
            return ast.body.filter(node => node.type != Syntax.CommentBlock).map(node => this.parseAst(node, ast));
        case Syntax.TypeDeclaration: {
            return this._crc({
                name: this.parseAst(ast.ctor, ast),
                type: this.parseAst(ast.name, ast),
                params: ast.body.map(node => this.parseAst(node))
            });
        }
        case Syntax.Identifier:
            return ast.name;
        case Syntax.TypeProperty:
            return {
                type: this.parseAst(ast.returnType),
                name: this.parseAst(ast.key)
            };
        case Syntax.TypeIdentifier:
            return `${this.parseAst(ast.namespace, ast)}.${this.parseAst(ast.property, ast)}`;
        case Syntax.Vector:
            return `Vector<${this.parseAst(ast.vectorType, ast)}>`;
        default:
            this.throwError('unhandled ast type: %s', ast.type);
        }
    }

    throwError(...args) {
        throw new Error(createMessage(...args));
    }
}

export default SchemaParser;
