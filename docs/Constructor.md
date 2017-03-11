# Constructor

The Schema Builder will help you to transform your schema file into JavaScript constructors. These constructors will help you to decode and encode your data in many ways.

### Encoding

While `decode` method receives a binary buffer and returns an constructor. `encode` method receives an object and returns a binary buffer.

**IMPORTANT**: `encode()` static property at constructors were built to be fast so we don't worry about validation inside of them (for now).

Usage:

```js
const bytes = test.UserStatus.decode({
    online: true
});

bytes.equals(new test.UserStatus({
    online: true
}).serialize());
```

### Validation

Each constructor dispose of validation rules to make sure the data you're entering is always valid. For example:

Consider the following schema:

```
userStatus : UserStatus -> online: bool;
```

The following code *WILL FAIL*:

```js
new test.UserStatus({
    online: 1
});
```

The following code *WILL PASS*:

```js
new test.UserStatus({
    online: true
});
```

And it's the same for all defined types in schema. The validation occurs when you instantiate the constructor, so we shouldn't change the properties after instantiation nor worry about nested constructors:

```
new test.DownloadRegister({
    date: Math.floor(Date.now() / 1000),
    geoPoint: new test.GeoPoint({
        latitude: -8.318813,
        longitude: 21.188234
    })
});
```

Validation are only valid during non-production environment. So all you should do to disable it is to set `NODE_ENV=production`. If you use Webpack:

```js
const webpack = require('webpack');

module.exports = {
    plugins: [
        new webpack.DefinePlugin({
            'process.env.NODE_ENV': '"production"'
        })
    ]
};
```
