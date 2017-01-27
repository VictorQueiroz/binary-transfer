import fs from 'fs';
import assert from 'assert';
import {SchemaParser} from '../src';

describe('SchemaParser', function() {
    let testSchema,
        schemaParser;

    beforeEach(() => {
        testSchema = fs.readFileSync('./test/test-schema.txt');
        schemaParser = new SchemaParser();
    });

    it('should parse schema constructors', function() {
        assert.deepEqual(schemaParser.parse(testSchema), [{
            id: 3133324573,
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
            constructor: 'account'
        }, {
            id: 1363145673,
            type: 'Void',
            params: [],
            constructor: 'void'
        }]);
    });

    it('should parse namespaced constructors', function() {
        assert.deepEqual(schemaParser.parse('user.User user.UserRegular -> id: int;'), [{
            id: 4018592141,
            type: 'user.User',
            params: [{
                type: 'int',
                name: 'id'
            }],
            constructor: 'user.UserRegular'
        }]);
    });
});
