const fs = require('fs');
const path = require('path');
const mkdirp = require('mkdirp');
const nunjucks = require('nunjucks');
const { SchemaParser, SchemaBuilder } = require('./lib');

const schema = new SchemaParser().parse(fs.readFileSync('./test/test-schema.txt'));
const builder = new SchemaBuilder({
    schemas: [{
        prefix: 'test',
        constructors: {
            predicates: schema
        }
    }],
    binaryTransferPath: function(dirname) {
        return path.resolve(dirname, '../src');
    }
});

const templates = builder.build();

templates.forEach(function(file) {
    const folder = path.join(__dirname, 'build', path.dirname(file.filePath));

    console.log('parsing %s', file.filePath);

    const contents = nunjucks.renderString(file.template.toString('utf8'), file.data);

    mkdirp.sync(folder);
    fs.writeFileSync(path.resolve(folder, path.basename(file.filePath)), contents);
});
