import fs from 'fs';
import assert from 'assert';
import {language} from '../src';

describe('SchemaParser', function() {
    let testSchema,
        schemaParser;

    beforeEach(() => {
        testSchema = fs.readFileSync('./test/test-schema.txt');
        schemaParser = new language.SchemaParser();
    });

    it('should parse schema constructors', function() {
        assert.deepEqual(schemaParser.parse(`
            --- types ---
            Account account -> id: int, username: string, email: string;
            Void void;
        `), [{
            id: 186715902,
            type: 'Account',
            params: [{
                type: 'int',
                name: 'id'
            }, {
                type: 'string',
                name: 'username'
            }, {
                name: 'email',
                type: 'string'
            }],
            name: 'account'
        }, {
            id: 2178958158,
            type: 'Void',
            params: [],
            name: 'void'
        }]);
    });

    it('should parse namespaced constructors', function() {
        assert.deepEqual(schemaParser.parse('user.User user.userRegular -> id: int;'), [{
            id: 4060771189,
            type: 'user.User',
            params: [{
                type: 'int',
                name: 'id'
            }],
            name: 'user.userRegular'
        }]);
    });
});
