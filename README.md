# binary-transfer

### Schema
```
Account account -> id: int, username: string, email: string;
```

### Use case
```js
const bytes = dl.Account.encode({
    id: 100,
    email: 'mark@jb.im',
    username: 'mark_jg',
});

assert.deepEqual(dl.Account.decode(bytes), {
    id: 100,
    email: 'mark@jb.im',
    username: 'mark_jg'
});
```
