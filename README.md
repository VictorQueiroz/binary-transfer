# binary-transfer

Travel your data very fast using binary serialization

### About the project

The aim of this project is:

- A very small library that can travel data very fast
- A scheme of how your data looks like to increase productivity between teams
- To create a data model that can be easily be understood, changed or mantained

### Schema
```
Account account -> id: int, username: string, email: string;
```

### Usage
```js
import { dl, decode } from '../schema';

let bytes;

bytes = dl.Account.encode({
    id: 100,
    email: 'mark@jb.im',
    username: 'mark_jb',
});

assert.deepEqual(decode(bytes), {
    _: 'dl.account',
    id: 100,
    email: 'mark@jb.im',
    username: 'mark_jb'
});
```

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
    const contents = nunjucks.renderString(file.template.toString('utf8'), file.data);

    mkdirp.sync(folder);
    fs.writeFileSync(path.resolve(folder, path.basename(file.filePath)), contents);
});
```

### Vectors
```
Photo photoRegular -> location: Vector<float>;
```

```js
import { dl, Vector } from '../schema';

const bytes = dl.PhotoRegular.encode({
    location: Vector.encode({
        type: 'double',
        items: [12.21211, -20.1211]
    })
});

// Equivalent to
const photoRegular = new dl.PhotoRegular({
    location: new Vector({
        type: 'double',
        items: [12.21211, -20.1211]
    })
});

assert.ok(photoRegular.serialize().equals(bytes));
```

### Testing
```
git clone https://github.com/VictorQueiroz/binary-transfer
cd binary-transfer/
npm install
make test
```
