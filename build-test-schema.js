require('babel-register');

const fs = require('fs');
const path = require('path');
const babel = require('babel-core');
const mkdirp = require('mkdirp');
const nunjucks = require('nunjucks');
const { language, SchemaBuilder } = require('./src');

const schema = new language.SchemaParser().parse(fs.readFileSync('./test/test-schema.txt'));
const builder = new SchemaBuilder({
    schemas: [{
        name: 'test',
        constructors: {
            predicates: schema
        }
    }],
    binaryTransferPath: path.resolve(__dirname, 'src')
});

const babelRc = JSON.parse(fs.readFileSync(path.resolve(__dirname, '.babelrc')));
const templates = builder.build();

templates.forEach(function(file) {
    const folder = path.join(__dirname, 'build', path.dirname(file.filePath));

    console.log('parsing %s', file.filePath);

    const contents = nunjucks.renderString(file.template.toString('utf8'), file.context);

    mkdirp.sync(folder);
    writeFileSync(path.resolve(folder, path.basename(file.filePath)), contents);
});

function writeFileSync(path, contents) {
    contents = babel.transform(contents.toString('utf8'), babelRc);

    fs.writeFileSync(path, contents.code);
}
