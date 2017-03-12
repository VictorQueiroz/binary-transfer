import { Syntax } from './Syntax';
import { toArray } from 'lodash';
import BaseConstructor from '../BaseConstructor';
import { Lexer, Token } from './Lexer';
import { createMessage } from '../utils';

class AST {
    constructor(text) {
        this.text = text;
        this.lexer = new Lexer();
    }

    ast(text) {
        this.text = text;
        this.tokens = this.lexer.lex(text);

        return this.schema();
    }

    eof() {
        return this.tokens[0].type == Token.EOF;
    }

    schema() {
        const body = [];

        while(!this.eof()) {
            body.push(this.comment());
        }

        return {
            type: Syntax.Schema,
            body
        };
    }

    peek(m1, m2, m3, m4) {
        return this.peekAhead(0, m1, m2, m3, m4);
    }

    expect(m1, m2, m3, m4) {
        const token = this.peek(m1, m2, m3, m4);

        if(token) {
            this.tokens.shift();
            return token;
        }

        return false;
    }

    consume(m1) {
        if(this.tokens.length === 0) {
            this.throwError('Unexpected end of expression "%s". Expected %s', this.peek().value, m1);
        }

        const token = this.expect(m1);

        if(!token) {
            this.throwError('"%s" is unexpected, expecting "%s"', this.peek().value, m1);
            return false;
        }

        return token;
    }

    throwError(...args) {
        throw new Error(createMessage(...args));
    }

    peekAhead(i, m1, m2, m3, m4) {
        if(!this.eof() && this.tokens.length > i) {
            const emptyMatches = (!m1 && !m2 && !m3 && !m4);
            const token = this.tokens[i];
            const t = token.value;

            if(emptyMatches || (m1 == t || m2 == t || m3 == t || m4 == t)) {
                return token;
            }
        }
        return false;
    }

    comment() {
        if(this.expect('---', '/*')) {
            const comment = {
                type: Syntax.CommentBlock,
                blocks: []
            };

            while(!this.expect('---', '*/')) {
                comment.blocks.push(this.consume().value);
            }

            return comment;
        }

        return this.typeDeclaration();
    }

    identifier() {
        const token = this.consume();

        return {
            type: Syntax.Identifier,
            name: token.value
        };
    }

    typePrimary() {
        if(this.peek().type != Token.Identifier) {
            this.throwError('unexpected token %s at column %s', this.peek().value, this.peek().start);
            return false;
        }


        return this.identifier();
    }

    typeIdentifier() {
        const primary = this.typePrimary();

        if(!this.expect('.')) {
            return primary;
        }

        return {
            type: Syntax.TypeIdentifier,
            property: this.typeIdentifier(),
            namespace: primary
        };
    }

    typeDeclaration() {
        let ctor,
            name;

        name = this.typeIdentifier();

        if(this.expect(':')) {
            ctor = name;
            name = this.typeIdentifier();
        } else {
            ctor = this.typeIdentifier();
        }

        const type = {
            type: Syntax.TypeDeclaration,
            ctor,
            name
        };

        if(this.expect('{')) {
            type.body = this.typeBody();
        } else if(this.expect('->')) {
            type.body = this.typeShortBody();
        } else {
            type.body = [];
            this.consume(';');
        }

        return type;
    }

    typeShortBody() {
        const body = [];

        do {
            body.push(this.typeProperty());
        } while(!this.eof() && this.expect(','));

        if(!this.eof()) {
            this.expect(';');
        }

        return body;
    }

    vector() {
        const id = this.identifier();

        if(id.name != 'Vector') {
            this.throwError('Expect %s but got %s', 'vector', id.name);
        }

        this.consume('<');
        const vectorType = this.typeIdentifier();
        this.consume('>');

        return {
            type: Syntax.Vector,
            vectorType
        };
    }

    typeProperty() {
        const ast = {
            key: this.identifier(),
            type: Syntax.TypeProperty,
        };

        this.expect(':');

        ast.returnType = this.returnType();

        return ast;
    }

    returnType() {
        const id = this.peek().value;

        if(!BaseConstructor.allowStrictSize(id) && BaseConstructor.isGenericType(id)) {
            return this.genericType();
        }

        switch(id) {
        case 'Vector':
            return this.vector();
        case 'string':
        case 'bytes': {
            const name = this.identifier();

            if(this.expect('[')) {
                const size = this.integer();

                this.consume(']');

                return {
                    type: Syntax.StrictSizeType,
                    name,
                    size
                };
            }

            return name;
        }
        }

        return this.typeIdentifier();
    }

    genericType() {
        return this.identifier();
    }

    integer() {
        if(this.peek().type != Token.NumericLiteral) {
            this.throwError('expected %s but got %s instead', Token.NumericLiteral, this.peek().type);
            return false;
        }

        return {
            type: Syntax.Literal,
            value: this.consume().value
        };
    }

    typeBody() {
        const body = [];

        while(!this.expect('}')) {
            body.push(this.typeProperty());
            this.consume(';');
        }

        return body;
    }
}

export {
    Syntax,
    AST
};
