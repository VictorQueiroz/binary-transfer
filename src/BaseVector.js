import _ from 'lodash';
import { Buffer } from 'buffer';
import Serializer from './Serializer';
import Deserializer from './Deserializer';
import BaseConstructor from './BaseConstructor';

class BaseVector extends BaseConstructor {
    constructor(options) {
        super();

        this.type = options.type;
        this.items = options.items;

        this.validateItems();
    }

    validateItems() {
        if(process.env.NODE_ENV != 'production') {
            _.some(BaseConstructor.generics, (method, type) => {
                if(this.type == type) {
                    for(let i = 0; i < this.items.length; i++) {
                        this._validateGenericProperty(i, this.items[i], type);
                    }
                    return true;
                }
                return false;
            });
        }
    }

    static encode(options) {
        const items = options.items;
        const serializer = new Serializer();
        const length = items.length;

        serializer.writeUInt(length);

        const isGeneric = BaseConstructor.isGenericType(options.type);

        if(isGeneric) {
            const genericMethod = BaseConstructor.generics[options.type];

            for(let i = 0; i < length; i++) {
                serializer[`write${genericMethod}`](items[i]);
            }
        } else {
            for(let i = 0; i < length; i++) {
                serializer.addBuffer(items[i]);
            }
        }

        return serializer.getBuffer();
    }

    static decode(options) {
        const deserializer = options.hasOwnProperty('deserializer') ? options.deserializer : new Deserializer(options.buffer);

        const length = deserializer.readUInt();
        const array = new Array(length);

        if(BaseConstructor.isGenericType(options.type)) {
            const genericMethod = BaseConstructor.generics[options.type];

            for(let i = 0; i < length; i++) {
                array[i] = deserializer[`read${genericMethod}`]();
            }
        } else {
            const isStrictContainer = BaseConstructor.isConstructorReference(options.type);

            if(isStrictContainer) {
                const Constructor = this.store.findConstructorFromName(options.type);

                for(let i = 0; i < length; i++) {
                    array[i] = Constructor.decode({
                        deserializer
                    });
                }
            } else {
                for(let i = 0; i < length; i++) {
                    const currentOffset = deserializer.offset;
                    const Constructor = this.store.findConstructorFromBuffer(deserializer.buffer.slice(currentOffset));

                    array[i] = Constructor.decode({
                        deserializer
                    });
                }
            }

        }

        return this.createVector({
            type: options.type,
            items: array
        });
    }

    static createVector() {
        this.onError('%s method not implemented. You should extend BaseVector', 'createVector');
    }

    serialize() {
        const items = new Array(this.items.length);

        this.validateItems();

        if(BaseConstructor.isGenericType(this.type)) {
            for(let i = 0; i < items.length; i++) {
                items[i] = this.items[i];
            }
        } else {
            for(let i = 0; i < items.length; i++) {
                items[i] = this.items[i].serialize();
            }
        }

        return BaseVector.encode({
            type: this.type,
            items: items
        });
    }

    toPlainObject() {
        return this.toJS();
    }

    toJSON() {
       return this.toJS();
    }

    toJS() {
        const itemsLength = this.size();
        const result = new Array(itemsLength);

        if(BaseConstructor.isGenericType(this.type)) {
            for(let i = 0; i < itemsLength; i++) {
                result[i] = this.nth(i);
            }
        } else {
            for(let i = 0; i < itemsLength; i++) {
                result[i] = this.nth(i).toPlainObject();
            }
        }

        return result;
    }
}

const proto = BaseVector.prototype;

// lodash methods
_.forEach([
    // array
    'chunk', 'compact', 'concat', 'difference', 'differenceBy',
    'differenceWith', 'drop', 'dropRight', 'dropRightWhile',
    'dropWhile', 'fill', 'findIndex', 'findLastIndex', 'flatten',
    'flattenDeep', 'flattenDepth', 'fromPairs', 'first', 'head',
    'indexOf', 'initial', 'intersection', 'intersectionBy',
    'intersectionWith', 'join', 'last', 'lastIndexOf',
    'nth', 'pull', 'pullAll', 'pullAllBy', 'pullAllWith',
    'pullAt', 'remove', 'reverse', 'slice', 'sortedIndex',
    'sortedIndexBy', 'sortedIndexOf', 'sortedLastIndex',
    'sortedLastIndexBy', 'sortedLastIndexOf', 'sortedUniq',
    'sortedUniqBy', 'tail', 'take', 'takeRight', 'takeRightWhile',
    'takeWhile', 'union', 'unionBy', 'unionWith', 'uniq', 'uniqBy',
    'uniqWith', 'unzip', 'unzipWith', 'without', 'xor', 'xorBy',
    'xorWith', 'zip', 'zipObject', 'zipObjectDeep', 'zipWith',

    // collection
    'countBy', 'each', 'forEach', 'eachRight', 'forEachRight',
    'every', 'filter', 'find', 'findLast', 'flatMap', 'flatMapDeep',
    'flatMapDepth', 'forEach', 'groupBy', 'includes', 'invokeMap',
    'keyBy', 'map', 'orderBy', 'partition', 'reduce', 'reduceRight',
    'reject', 'sample', 'sampleSize', 'shuffle', 'size', 'some',
    'sortBy'
], key => {
    proto[key] = function(...args) {
        return _[key](this.items, ...args);
    };
});

// native array methods
_.forEach([
    'shift', 'pop', 'push', 'sort', 'concat',
    'values', 'keys', 'entries', 'splice', 'unshift'
], key => {
    proto[key] = function(...args) {
        return Array.prototype[key].call(this.items, ...args);
    };
});

export default BaseVector;
