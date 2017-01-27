import crc from 'crc';
import {Buffer} from 'buffer';

class SchemaParser {
    constructor() {

    }

    parse(schema) {
        if(Buffer.isBuffer(schema)) {
            return this.parse(schema.toString('utf8'));
        }

        schema = schema.split(/\n/).filter(s => s).filter(s => s.substring(0, 3) != '---');
        schema = schema.map(s => {
            return s.trim();
        });
        schema = schema.map(s => s.split(';')[0]);
        schema = schema.map(s => {
            const ctorAndParams = s.split('->');
            const typeDef = ctorAndParams[0].split(' ').map(m => m.trim()).filter(m => m);
            const ctorType = typeDef[0];
            const constructor = typeDef[1];
            const stringParams = ctorAndParams[1] || '';
            const params = stringParams.split(',').filter(t => t).map(t => t.split(':').map(m => m.trim()));

            return {
                id: crc.crc32(s),
                type: ctorType,
                params: params.map(param => {
                    return {
                        type: param[1],
                        name: param[0]
                    };
                }),
                constructor: constructor
            };
        });

        return schema;
    }
}

export default SchemaParser;
