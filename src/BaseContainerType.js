import _ from 'lodash';
import { Buffer } from 'buffer';
import ParamEnum from './ParamEnum';
import Serializer from './Serializer';
import Deserializer from './Deserializer';
import BaseConstructor from './BaseConstructor';

const header = Buffer.alloc(4);

header.writeUInt32LE(0xFFFFFF, 0);

class BaseContainerType extends BaseConstructor {
    static _header = header.readUInt32LE(0);
    static _params = [];

    static validate(header) {
        if(this.validateHeader(this._header, [this._id])) {
            return true;
        }

        this.onError('invalid header for constructor "%s". expected %s but got %s instead',
            this._name,
            this._id,
            this._header.readUInt32LE(0)
        );
    }

    constructor(options) {
        super();

        this._id = options._id;
        this._name = options._name;
        this._type = options._type;

        if(!options.hasOwnProperty('_params')) {
            this.onError('missing "%s" property for "%s" constructor', '_params', this._name);
            return false;
        }

        const paramsList = [];

        options._params.forEach(param => {
            paramsList.push(param.key);

            if(options._props.hasOwnProperty(param.key) && _.isUndefined(options._props[param.key]) != true) {
                return true;
            }

            this._handleMissingProperty(param.key, param.genericType);
        });

        if(options.hasOwnProperty('_props')) {
            const props = options._props;

            Object.keys(props).forEach(key => {
                const value = props[key];

                if(process.env.NODE_ENV != 'production') {
                    if(paramsList.indexOf(key) == -1) {
                        this.onError('unexpected property "%s" on constructor "%s"', key, this._name);
                        return false;
                    }
                }

                this[key] = value;
            });
        }

        this._params = options._params;

        if(process.env.NODE_ENV != 'production') {
            this._params.forEach(param => {
                const property = param.key;
                const value = this[property];

                switch(param.type) {
                case ParamEnum.GENERIC:
                case ParamEnum.GENERIC | ParamEnum.GENERIC_STRICT_SIZE:
                    this._validateGenericProperty(property, value, param.genericType);
                    
                    if(param.type & ParamEnum.GENERIC_STRICT_SIZE) {
                        this._validateGenericStrictSizeProperty(property, value, param.genericType, param.specificSize);
                    }
                    break;
                case ParamEnum.GENERIC | ParamEnum.VECTOR:
                    this._validateVector(property, value, param.vectorOf);
                    break;
                case ParamEnum.CONTAINER_REFERENCE:
                case ParamEnum.CONTAINER_TYPE_REFERENCE:
                    this._validatePossibleNonGenericProperty(property, value, param.reference);
                    break;
                default:
                    this.onError('Invalid type for param "%s" on container %s', param.key, this._name);
                }
            });
        }
    }

    _validateGenericStrictSizeProperty(property, value, genericType, specificSize) {
        switch(genericType) {
        case 'string':
            if(value.length != specificSize) {
                this.onError('Expected %s with %s length but got %s length', 'string', specificSize, value.length);
            }
            break;
        case 'bytes':
            if(value.byteLength != specificSize) {
                this.onError('Expected %s with %s bytes but got %s bytes', 'buffer', specificSize, value.byteLength);
            }
            break;
        default:
            this.onError(`no validation rule defined for generic type ${genericType} when used in strict size proposition`);
        }
    }

    _handleMissingProperty(key, type) {
        let value;

        switch(type) {
        case 'int':
        case 'uint':
        case 'long':
        case 'short':
        case 'ulong':
        case 'float':
        case 'ushort':
        case 'double':
            value = 0;
            break;
        case 'bytes':
            value = Buffer.alloc(0);
            break;
        case 'string':
            value = '';
            break;
        case 'bool':
            value = false;
            break;
        default:
            this.onError('could not find a default value for property "%s" for "%s" constructor', key, this._name);
            return false;
        }

        this[key] = value;
    }

    serialize() {
        const object = {};

        this._params.forEach(param => {
            switch(param.type) {
            case ParamEnum.GENERIC:
            case ParamEnum.GENERIC | ParamEnum.GENERIC_STRICT_SIZE:
                object[param.key] = this[param.key];
                break;
            case ParamEnum.CONTAINER_REFERENCE:
            case ParamEnum.CONTAINER_TYPE_REFERENCE:
            case ParamEnum.GENERIC | ParamEnum.VECTOR:
                object[param.key] = this[param.key].serialize();
                break;
            }
        });

        return this.constructor.encode(object);
    }

    _validateVector(property, value, type) {
        if(value.type != type) {
            this.onError('Invalid vector type for param %s. expected %s but got %s instead',
                property,
                type,
                value.type);
        }
    }

    instanceOf(name) {
        return this._name == name;
    }

    toJSON() {
        return this.toPlainObject();
    }

    static encodeGenericStrictSize(object, serializer, param) {
        const value = object[param.key];

        switch(param.genericType) {
        case 'bytes':
            serializer.addBuffer(value);
            break;
        case 'string':
            serializer.addBuffer(serializer._encodeString(value));
            break;
        default:
            throw new Error(`Unhandled encoding of generic strict size for type "${param.genericType}"`);
        }
    }

    static decodeGenericStrictSize(deserializer, param) {
        switch(param.genericType) {
        case 'bytes':
            return deserializer._readBytes(param.specificSize);
        case 'string':
            return deserializer._readString(deserializer._readBytes(param.specificSize));
        default:
            throw new Error(`Unhandled decoding of generic strict size for type "${param.genericType}"`);
        }
    } 

    static encode(object) {
        const serializer = new Serializer();

        // write header
        serializer.addBuffer(this._header);

        for(let i = 0; i < this._params.length; i++) {
            const param = this._params[i];

            switch(param.type) {
            case ParamEnum.GENERIC | ParamEnum.GENERIC_STRICT_SIZE:
                this.encodeGenericStrictSize(object, serializer, param);
                break;
            case ParamEnum.GENERIC:
                serializer[`write${param.method}`](object[param.key]);
                break;
            default:
                serializer.addBuffer(object[param.key]);
            }
        }

        return serializer.getBuffer();
    }

    static decode(options = {}) {
        const missingFields = _.every(['deserializer', 'buffer'], prop => options.hasOwnProperty(prop) != true);

        if(missingFields) {
            this.onError('You must provide %s or %s option when using decode()', 'buffer', 'deserializer');
            return false;
        }

        let Constructor;
        const deserializer = options.deserializer || new Deserializer(options.buffer);
        const result = {};

        // validate first 4 bytes
        const header = deserializer._readBytes(4);
        const params = this._params;
        const paramsLength = params.length;

        if(process.env.NODE_ENV != 'production') {
            this.validate(header);
        }

        for(let i = 0; i < paramsLength; i++) {
            const param = params[i];

            switch(param.type) {
            case ParamEnum.GENERIC:
                result[param.key] = deserializer[`read${param.method}`]();
                break;
            case ParamEnum.GENERIC | ParamEnum.GENERIC_STRICT_SIZE:
                result[param.key] = this.decodeGenericStrictSize(deserializer, param);
                break;
            case ParamEnum.GENERIC | ParamEnum.VECTOR:
                result[param.key] = this._Vector.decode({
                    type: param.vectorOf,
                    deserializer
                });
                break;
            case ParamEnum.CONTAINER_REFERENCE:
            case ParamEnum.CONTAINER_TYPE_REFERENCE:
                if(process.env.NODE_ENV != 'production') {
                    let found = false;
                    const ids = param.possibleIds;
                    const header = deserializer.buffer.readUInt32LE(deserializer.offset);

                    for(let i = 0; i < ids.length; i++) {
                        if(header == ids[i]) {
                            found = true;
                            break;
                        }
                    }

                    if(!found) {
                        this.onError('invalid header for param "%s". expected %s but got %s instead',
                            param.key,
                            ids.join(' or '),
                            header
                        );
                        return false;
                    }
                }

                if(param.type & ParamEnum.CONTAINER_REFERENCE)
                    Constructor = this._store.findConstructorFromName(param.reference);
                else if(param.type & ParamEnum.CONTAINER_TYPE_REFERENCE)
                    Constructor = this._store.findConstructorFromBuffer(deserializer.buffer.slice(deserializer.offset));

                result[param.key] = Constructor.decode({
                    deserializer
                });
                break;
            default:
                this.onError('invalid type "%s" for param "%s"', param.type, param.key);
            }
        }

        return this.createConstructor(result);
    }

    toPlainObject() {
        const props = {
            _: this._name
        };
        const params = this.constructor._params;
        const paramsLength = params.length;

        for(let i = 0; i < paramsLength; i++) {
            const param = params[i];

            switch(param.type) {
            case ParamEnum.GENERIC:
                props[param.key] = this[param.key];
                break;
            default:
                props[param.key] = this[param.key].toPlainObject();
            }
        }

        return props;
    }
}

export default BaseContainerType;
