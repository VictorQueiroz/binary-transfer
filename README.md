# binary-transfer

Travel your data very fast using binary serialization.

This project is based on [Telegram Type Language](https://core.telegram.org/).

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

assert.deepEqual(decode(bytes).equals(new dl.Account({
    id: 100,
    email: 'mark@jb.im',
    username: 'mark_jb'
}).serialize());
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
