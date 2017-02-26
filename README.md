# binary-transfer

### Schema
```
Account account -> id: int, username: string, email: string;
```

### Usage
```js
import { dl, encode, decode } from '../schema';

let bytes;

bytes = dl.Account.encode({
    id: 100,
    email: 'mark@jb.im',
    username: 'mark_jb',
});
// -- OR --
bytes = encode({
    _: 'dl.account',
    id: 100,
    email: 'mark@jb.im',
    username: 'mark_jb'
});

assert.deepEqual(decode(bytes), {
    _: 'dl.account',
    id: 100,
    email: 'mark@jb.im',
    username: 'mark_jb'
});
```

### Building your schema

```js
import { SchemaBuilder } from 'binary-transfer';

const fs = require('fs');
const schema = new SchemaParser().parse(fs.readFileSync('./test/test-schema.txt'));
const builder = new SchemaBuilder({
    schemas: [{
        prefix: 'test',
        constructors: {
            predicates: schema
        }
    }],
    binaryTransferPath: path.resolve(__dirname, 'src')
});
const nunjucks = require('nunjucks');

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
