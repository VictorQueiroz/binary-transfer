import { Token } from './Token';
import { toArray } from 'lodash';
import { Character } from './Character';
import { createMessage } from '../utils';

class Lexer {
    constructor(options) {
        this.text = options && options.text || '';
        this.index = 0;
        this.tokens = [];
        this.length = options && options.text && options.text.length || 0;
    }

    lex(text) {
        this.tokens.splice(0, this.tokens.length);
        if(text) {
            this.text = text;
            this.length = text.length;
        }
        this.index = 0;
        return this.scan();
    }

    scan() {
        const token = this.nextToken();

        if(token) {
            this.tokens.push(token);
        }

        if(!this.eof()) {
            return this.scan();
        } else {
            this.tokens.push(this.nextToken());
        }

        return this.tokens;
    }

    nextToken(start = this.index) {
        const ch = this.text.charCodeAt(this.index);

        if(this.eof()) {
            return {
                end: this.index,
                type: Token.EOF,
                start
            };
        }

        if(Character.isWhiteSpace(ch) || Character.isLineTerminator(ch)) {
            this.index++;
            return this.nextToken(start);
        }

        if(Character.isIdentifierPart(ch)) {
            return this.scanIdentifier();
        }

        if(Character.isStringQuote(ch)) {
            return this.scanStringLiteral();
        }

        return this.scanPunctuator();
    }

    eof() {
        return this.index >= this.length;
    }

    scanStringLiteral(start = this.index, str = '', quote = this.text[this.index++]) {
        const current = this.text[this.index];

        if(!this.eof() && current != quote) {
            const ch = this.text[this.index++];

            return this.scanStringLiteral(start, str + ch, quote);
        }

        this.index++;

        return {
            end: this.index,
            type: Token.StringLiteral,
            start,
            value: str
        };
    }

    getIdentifier(start = this.index++) {
        const ch = this.text.charCodeAt(this.index);

        if(!Character.isIdentifierPart(ch)) {
            return this.text.substring(start, this.index);
        }

        this.index++;
        return this.getIdentifier(start);
    }

    getIdentifierType(id) {
        if(id.length == 1) {
            return Token.Identifier;
        } else if(id == 'null') {
            return Token.NullLiteral;
        } else if(id == 'true' || id == 'false') {
            return Token.BooleanLiteral;
        }

        return Token.Identifier;
    }

    scanIdentifier(ch) {
        const start = this.index;
        const id = this.getIdentifier();
        const type = this.getIdentifierType(id);

        return {
            end: this.index,
            type,
            start,
            value: id
        };
    }

    scanPunctuator() {
        const token = {
            type: Token.Punctuator,
            start: this.index
        };
        let str = this.text[this.index];

        switch(str) {
        case ':':
        case '.':
        case '=':
        case ';':
        case ',':
        case '<':
        case '>':
        case '{':
        case '}':
            this.index++;
            break;
        default:
            // 2-character punctuator
            str = this.text.substring(this.index, this.index + 2);

            if(str == '->' || str == '/*' || str == '*/') {
                this.index += 2;
                break;
            }

            // 3-character punctuator
            str = this.text.substring(this.index, this.index + 3);

            if(str == '---') {
                this.index += 3;
            }
        }

        if(this.index == token.start) {
            this.throwError('Unexpected token at %s (token: %s)', this.index, str);
            return false;
        }

        token.end = this.index;
        token.value = str;

        return token;
    }

    isWhiteSpace(ch) {
        return Character.isWhiteSpace(ch);
    }

    throwError(...args) {
        throw new Error(createMessage(...args));
    }
}

export { Lexer as Lexer, Token as Token };
