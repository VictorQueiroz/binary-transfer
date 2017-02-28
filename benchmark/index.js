require('babel-register');

const _ = require('lodash');
const crypto = require('crypto');
const Benchmark = require('benchmark');
const { Vector } = require('./build');

const suite = new Benchmark.Suite();
const items = {
    int: new Array(4),
    double: new Array(4),
    string: new Array(4)
};

for(let i = 0; i < items.double.length; i++) {
    items.double[i] = -(Math.random() * (Math.random() * 100));
}

for(let i = 0; i < items.string.length; i++) {
    items.string[i] = crypto.randomBytes(8).toString('hex');
}

for(let i = 0; i < items.int.length; i++) {
    items.int[i] = crypto.randomBytes(4).readInt32LE(0);
}

const vectors = {};

_.forEach(items, function(items, type) {
    vectors[type] = Vector.encode({
        type,
        items
    });
});

suite.add('Vector<int>#encode', function() {
    Vector.encode({
        type: 'int',
        items: items.int
    });
})
.add('Vector<string>#encode', function() {
    Vector.encode({
        type: 'string',
        items: items.string
    });
})
.add('Vector<string>#decode', function() {
    Vector.decode({
        type: 'string',
        buffer: vectors.string
    });
})
.add('Vector<string>#serialize', function() {
    new Vector({
        type: 'string',
        items: items.string
    }).serialize();
})
.add('Vector<double>#serialize', function() {
    new Vector({
        type: 'double',
        items: items.double
    }).serialize();
})
.add('Vector<int>#serialize', function() {
    new Vector({
        type: 'int',
        items: items.int
    }).serialize();
})
.add('Vector<int>#decode', function() {
    Vector.decode({
        type: 'int',
        buffer: vectors.int
    });
})
.on('cycle', function(event) {
    console.log(String(event.target));
})
.on('complete', function() {
    console.log('Fastest is ' + this.filter('fastest').map('name'));
})
.run({async: true});
