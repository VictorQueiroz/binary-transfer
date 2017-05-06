import { Syntax } from './Syntax';
import { toArray } from 'lodash';
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
        return this.tokens.length === 0 || this.tokens[0].type === Token.EOF;
    }

    schema() {
        const body = [];

        while(!this.eof()) {
            body.push(this.container());
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

    container() {
        if(this.peek().type == Token.Comment) {
            return this.comment();
        }
        if(this.expect('namespace')) {
            return this.quickNamespacing();
        }
        if(this.expect('type')) {
            return this.typeGroup();
        }

        return this.typeDeclaration();
    }

    comment() {
        return {
            type: Syntax.CommentBlock,
            lines: this.consume().value.split('\n')
        };
    }

    quickNamespacing() {
        const name = this.identifier();
        this.consume('{');

        const body = [];

        while(!this.expect('}')) {
            body.push(this.container());
        }

        return {
            type: Syntax.Namespace,
            body,
            name
        };
    }

    typeGroup() {
        const name = this.identifier();

        this.consume('{');

        const body = [];

        while(!this.expect('}')) {
            if(this.peek().type == Token.Comment) {
                body.push(this.comment());
            } else {
                body.push(this.typeGroupContainer());
            }
        }

        return {
            name,
            type: Syntax.TypeGroup,
            body
        };
    }

    typeGroupContainer() {
        const id = this.typeIdentifier();
        let body = [];

        if(this.expect('{')) {
            body = this.typeBody();
        } else if(this.expect('->')) {
            body = this.typeShortBody();
        } else {
            this.expect(';');
        }

        return {
            name: id,
            type: Syntax.TypeGroupContainer,
            body
        };
    }

    identifier() {
        const token = this.consume();

        if(token.type != Token.Identifier) {
            this.throwError('unexpected token %s at column %s', this.peek().value, this.peek().start);
            return false;
        }

        return {
            type: Syntax.Identifier,
            name: token.value
        };
    }

    typeIdentifier() {
        const primary = this.identifier();

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
            this.expect(';');
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

        switch(id) {
        case 'Vector':
            return this.vector();
        }

        return this.typeIdentifier();
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
            if(this.peek().type == Token.Comment) {
                const token = this.consume();

                body.push({
                    type: Syntax.CommentBlock,
                    lines: token.value.split('\n')
                });
            } else {
                body.push(this.typeProperty());
                this.consume(';');
            }
        }

        return body;
    }
}

export {
    Syntax,
    AST
};
