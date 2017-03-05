import { Schema } from '../../src/language';
import { deepEqual } from 'assert';

xdescribe('Schema', function() {
    let s;

    beforeEach(() => {
        s = new Schema();
    });

    it('should transform schema language into a JSON', function() {
        const schema = s.build(`
            users.User users.user {
                long id;
                string name;
            }
        `);

        deepEqual(schema, [{
            name: 'users.user',
            params: [{
                type: 'long',
                name: 'id'
            }, {
                name: 'name',
                type: 'string'
            }],
            constructor: 'users.User'
        }]);
    });

    it('should support vector', function() {
        const schema = s.build(`
            usersList usersList {
                vector<int> intList;
            }
        `);

        deepEqual(schema, [{
            constructor: 'usersList',
            params: [{
                type: 'vector<int>',
                name: 'intList'
            }],
            name: 'usersList'
        }]);
    });
});
