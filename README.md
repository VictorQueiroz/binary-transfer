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

### Vectors
```
Photo photoRegular -> location: Vector<float>;
```

```js
import { dl, vector } from '../schema';

const bytes = dl.PhotoRegular.encode({
    location: vector.encode({
        type: 'float',
        items: [12.21211]
    })
});
```
