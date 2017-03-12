import _ from 'lodash';
import crypto from 'crypto';
import { deepEqual } from 'assert';
import { Lexer, Token } from '../../src/language';

describe('Lexer', function() {
    let lexer;

    beforeEach(() => {
        lexer = new Lexer();
    });

    describe('scanNumericLiteral()', function() {
        const randomHex = new Array(32);

        for(let i = 0; i < randomHex.length; i++) {
            randomHex[i] = '0x' +  crypto.randomBytes(8).toString('hex');
        }

        _.forEach(randomHex, function(hex) {
            it(`should scan ${hex} integer`, function() {
                deepEqual(lexer.lex(hex), [{
                    end: hex.length,
                    type: Token.NumericLiteral,
                    start: 0,
                    value: parseInt(hex, 16)
                }, {
                    end: hex.length,
                    type: Token.EOF,
                    start: hex.length
                }]);
            });
        });

        it('should scan simple numeric literal', function() {
            deepEqual(lexer.lex('9999999'), [{
                end: 7,
                type: Token.NumericLiteral,
                start: 0,
                value: 9999999
            }, {
                end: 7,
                type: Token.EOF,
                start: 7
            }]);
        });

        it('should scan numeric floating point literals', function() {
            deepEqual(lexer.lex('31.3193'), [{
                end: 7,
                type: Token.NumericLiteral,
                start: 0,
                value: 31.3193
            }, {
                end: 7,
                type: Token.EOF,
                start: 7
            }]);
        });
    });

    describe('scanIdentifier()', function() {
        it('should scan identifier', function() {
            deepEqual(lexer.lex('users.getUsers users.UsersList { int offset; }'), [{
                type: Token.Identifier,
                value: 'users',
                start: 0,
                end: 5
            }, {
                type: Token.Punctuator,
                value: '.',
                start: 5,
                end: 6
            }, {
                type: Token.Identifier,
                value: 'getUsers',
                start: 6,
                end: 14
            }, {
                type: Token.Identifier,
                value: 'users',
                start: 15,
                end: 20
            }, {
                value: '.',
                start: 20,
                end: 21,
                type: Token.Punctuator
            }, {
                value: 'UsersList',
                start: 21,
                end: 30,
                type: Token.Identifier
            }, {
                value: '{',
                type: Token.Punctuator,
                start: 31,
                end: 32
            }, {
                type: Token.Identifier,
                value: 'int',
                start: 33,
                end: 36
            }, {
                type: Token.Identifier,
                value: 'offset',
                start: 37,
                end: 43
            }, {
                type: Token.Punctuator,
                value: ';',
                start: 43,
                end: 44
            }, {
                type: Token.Punctuator,
                value: '}',
                start: 45,
                end: 46
            }, {
                type: Token.EOF,
                start: 46,
                end: 46
            }]);
        });
    });

    describe('scanStringLiteral()', function() {
        it('should scan literal string', function() {
            deepEqual(lexer.lex('"literal string"'), [{
                type: Token.StringLiteral,
                value: 'literal string',
                start: 0,
                end: 16
            }, {
                type: Token.EOF,
                start: 16,
                end: 16
            }]);
        });
    });
});
