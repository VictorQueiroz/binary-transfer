import assert from 'assert';
import SchemaBuilder from '../src/SchemaBuilder';
import { SchemaParser } from '../src';

describe('SchemaBuilder', function() {
    let schemaParser,
        schemaBuilder;

    beforeEach(() => {
        schemaParser = new SchemaParser();
    });

    afterEach(() => {
        schemaBuilder = null;
    });

    describe('getConstructorName()', function() {
        it('should get construtor name from namespaced path', function() {
            assert.equal('User', new SchemaBuilder({}).getConstructorName('user.user'));
        });
    });
});
