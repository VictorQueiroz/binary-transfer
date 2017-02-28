# SchemaBuilder

### Building your schema

Schema syntax is "parsed" by `SchemaParser` and then `SchemaBuilder`. This means that there's nothing stopping you to create your own `SchemaParser` as long as you give `SchemaBuilder` the right data.

```js
const fs = require('fs');
const nunjucks = require('nunjucks');
const { SchemaParser, SchemaBuilder } = require('binary-transfer');

const schema = new SchemaParser().parse(fs.readFileSync('./test/test-schema.txt'));
const builder = new SchemaBuilder({
    schemas: [{
        name: 'test',
        predicates: schema.predicates
    }]
});

const templates = builder.build();

templates.forEach(function(file) {
    const folder = path.join(__dirname, 'build', path.dirname(file.filePath));
    const contents = nunjucks.renderString(file.template.toString('utf8'), file.context);

    mkdirp.sync(folder);
    fs.writeFileSync(path.resolve(folder, path.basename(file.filePath)), contents);
});
```