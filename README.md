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
import { Schema, language } from 'binary-transfer';

const parser = new language.SchemaParser();
const schema = new Schema([
    {containers: parser.parse(`
        type Account {
            account -> id: int,
                        username: string,
                        email: string,
                        posts: Vector<Post>
        }
        type Post {
            post -> id: int,
                    title: string,
                    body: string
        }
    `)}
]);

const buffer = schema.encode('account', {
    id: 3,
    username: '',
    email: '',
    posts: []
});

assert.deepEqual(schema.decode(buffer), {
    id: 3,
    username: '',
    email: '',
    posts: [{
        id: 100,
        title: 'This is my first post',
        body: 'Empty body, please edit it',
        _name: 'post',
        _type: 'Post',
        _traits: []
    }],
    _name: 'account',
    _type: 'Account',
    _traits: []
});
```

### Testing
```
git clone https://github.com/VictorQueiroz/binary-transfer
cd binary-transfer/
npm install
make test
```
