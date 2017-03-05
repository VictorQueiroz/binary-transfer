import { deepEqual } from 'assert';
import { Lexer, Token } from '../../src/language';

describe('Lexer', function() {
    describe('scanIdentifier()', function() {
        it('should scan identifier', function() {
            const l = new Lexer({
                text: 'users.getUsers users.UsersList { int offset; }'
            });
            const tokens = l.lex();

            deepEqual(tokens, [{
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
            const l = new Lexer({
                text: '"literal string"'
            });
            deepEqual(l.lex(), [{
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
