import { Token } from './Token';
import { Character } from './Character';
import { createMessage } from '../utils';
import { defaults, toArray } from 'lodash';

class Lexer {
    constructor(options = {}) {
        defaults(options, {
            text: '',
            index: 0,
            tokens: []
        });

        this.text = options.text;
        this.index = options.index;
        this.tokens = options.tokens;
        this.length = this.text.length;
    }

    lex(text = '') {
        this.text = text;
        this.index = 0;
        this.tokens = [];
        this.length = this.text.length;

        return this.scan();
    }

    scan() {
        const tokens = [];

        while(!this.eof()) {
            tokens.push(this.nextToken());
        }

        return tokens;
    }

    skipSingleLineComment(offset = 0) {
        const start = this.index - offset;
        const comments = [];

        while(!this.eof()) {
            const ch = this.text.charCodeAt(this.index);
            this.index++;

            if(Character.isLineTerminator(ch)) {
                const end = this.index - 1;
                const comment = {
                    end,
                    type: Token.Comment,
                    value: this.text.substring(start + offset, end),
                    start: start + offset,
                    multiLine: false
                };
                if(ch === 13 && this.text.charCodeAt(this.index) === 10) {
                    ++this.index;
                }
                return comment;
            }
        }

        const end = this.index - 1;

        return {
            end,
            type: Token.Comment,
            value: this.text.substring(start + offset, end),
            start: start + offset,
            multiLine: false
        };
    }

    skipMultiLineComment() {
        const start = this.index;

        while(!this.eof()) {
            const ch = this.text.charCodeAt(this.index);

            if(Character.isLineTerminator(ch)) {
                if(ch === 0x0D && this.text.charCodeAt(this.index + 1) === 0x0A) {
                    ++this.index;
                }
                ++this.index;
            } else if(ch === 0x2A) {
                // Block comment ends with '*/'.
                if(this.text.charCodeAt(this.index + 1) === 0x2F) {
                    this.index += 2;

                    return {
                        type: Token.Comment,
                        start,
                        end: this.index,
                        value: this.text.substring(start, this.index - 2)
                    };
                }
                ++this.index;
            } else {
                ++this.index;
            }
        }

        this.throwError('unexpected end of comment block at index %s', this.index);
    }

    nextToken(start = this.index) {
        let ch = this.text.charCodeAt(this.index);

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

        if(ch === 0x2F) { // U+002F is '/'
            ch = this.text.charCodeAt(this.index + 1);

            if(ch === 0x2F) {
                this.index += 2;
                return this.skipSingleLineComment(2);
            } else if(ch === 0x2A) { // U+002A is '*'
                this.index += 2;
                return this.skipMultiLineComment();
            }
        }

        if(Character.isDecimalDigit(ch)) {
            return this.scanNumericLiteral();
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

    scanNumericLiteral() {
        let num = '';

        let ch = this.text.charCodeAt(this.index);
        const start = this.index;

        // 0
        if(ch == 48) {
            ch = this.text.charCodeAt(this.index + 1);

            // x
            if(ch == 120) {
                return this.scanHexLiteral();
            }
        }

        while(Character.isDecimalDigit(this.text.charCodeAt(this.index))) {
            num += this.text[this.index++];
        }

        ch = this.text[this.index];

        if(ch == '.') {
            num += this.text[this.index++];

            while(Character.isDecimalDigit(this.text.charCodeAt(this.index))) {
                num += this.text[this.index++];
            }
        }

        return {
            type: Token.NumericLiteral,
            value: parseFloat(num),
            end: this.index,
            start
        };
    }

    // https://tc39.github.io/ecma262/#sec-literals-numeric-literals
    scanHexLiteral() {
        let num = '0x';
        const start = this.index;

        // 0x
        this.index += 2;

        while(!this.eof()) {
            if(Character.isHexDigit(this.text.charCodeAt(this.index))) {
                num += this.text[this.index++];
                continue;
            }
            break;
        }

        if(num.length == 0 || Character.isIdentifierStart(this.text.charCodeAt(this.index))) {
            this.throwError('unexpected token at %s', this.index);
        }

        return {
            type: Token.NumericLiteral,
            start,
            end: this.index,
            value: parseInt(num, 16)
        };
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
        case '[':
        case ']':
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
