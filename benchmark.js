const { vector } = require('./build');
const Benchmark = require('benchmark');

const suite = new Benchmark.Suite();

const intVector = vector.encode({
    type: 'int',
    items: [1,2,3,4,5]
});
const stringVector = vector.encode({
    type: 'string',
    items: ['a', 'b', 'c', 'd', 'e']
});

suite.add('vector<int>#encode', function() {
    vector.encode({
        type: 'int',
        items: [1,2,3,4,5]
    });
})
.add('vector<string>#encode', function() {
    vector.encode({
        type: 'string',
        items: ['a', 'b', 'c', 'd', 'e']
    });
})
.add('vector<string>#decode', function() {
    vector.decode({
        type: 'string',
        buffer: stringVector
    });
})
.add('vector<int>#decode', function() {
    vector.decode({
        type: 'int',
        buffer: intVector
    });
})
.on('cycle', function(event) {
    console.log(String(event.target));
})
.on('complete', function() {
    console.log('Fastest is ' + this.filter('fastest').map('name'));
})
.run({async: true});
