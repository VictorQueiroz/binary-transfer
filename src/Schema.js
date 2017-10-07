import _ from 'lodash';
import Serializer from './Serializer';
import Deserializer from './Deserializer';
import { ParamEnum } from './enums';
import { createMessage } from './utils';

const strictSizedTypes = [
    'string',
    'bytes'
];

class Schema {
    constructor(schemas) {
        this.schemas = schemas;
        this.containers = {};
        this.containersById = {};
        this.containersByType = {};
        this.containerProperty = '_name';

        let i, j, jj, container;
        const ii = schemas.length;

        for(i = 0; i < ii; i++) {
            const { containers } = schemas[i];

            jj = containers.length;

            for(j = 0; j < jj; j++) {
                container = containers[j];

                if(!this.containersByType.hasOwnProperty(container.type)) {
                    this.containersByType[container.type] = [];
                }

                if(this.containers.hasOwnProperty(container.name)) {
                    this.throwError('repeated container name -> %s', container.name);
                    return false;
                }

                this.containers[container.name] = container;
                this.containersById[container.id] = container;
                this.containersByType[container.type].push(container);
            }
        }
    }

    isGeneric(type) {
        return require('../generics.json').indexOf(type) > -1;
    }

    decodeGeneric(d, type) {
        switch(type) {
        case 'int':
            return d.readInt();
        case 'uint':
            return d.readUInt();
        case 'long':
            return d.readLong();
        case 'ulong':
            return d.readULong();
        case 'bool':
            return d.readBool();
        case 'short':
            return d.readShort();
        case 'ushort':
            return d.readUShort();
        case 'float':
            return d.readFloat();
        case 'double':
            return d.readDouble();
        case 'string':
            return d.readString();
        case 'bytes':
            return d.readBytes();
        default:
            this.throwError('Unhandled generic type -> %s', type);
        }
    }

    decode({ bytes, deserializer: d }) {
        const result = {};

        if(bytes) {
            d = new Deserializer(bytes);
        }

        const id = d.readUInt();

        if(!this.containersById.hasOwnProperty(id)) {
            this.throwError('Invalid container with header of -> %s', id);
            return false;
        }

        const container = this.containersById[id];
        const { name, params } = container;
        const ii = params.length;

        let i,
            j;

        for(i = 0; i < ii; i++) {
            const param = params[i];
            const { name: key, type } = param;

            if(type & ParamEnum.OPTIONAL) {
                if(d.readBool() !== true) {
                    continue;
                }
            }
            if(type & ParamEnum.GENERIC) {
                const genericType = param.genericType;

                if(type & ParamEnum.STRICT_SIZE) {
                    result[key] = this.decodeGenericStrictSize(d, genericType, param.size);
                    continue;
                }

                result[key] = this.decodeGeneric(d, genericType);
            } else if(type & ParamEnum.VECTOR) {
                const { vectorOf } = param;
                const length = d.readUInt();
                const list = new Array(length);

                if(this.isGeneric(vectorOf)) {
                    for(j = 0; j < length; j++) {
                        list[j] = this.decodeGeneric(d, vectorOf);
                    }
                } else {
                    for(j = 0; j < length; j++) {
                        list[j] = this.decode({
                            deserializer: d
                        });
                    }
                }

                result[key] = list;
            } else if(type & ParamEnum.NON_GENERIC) {
                if(process.env.NODE_ENV !== 'production') {
                    const containers = [];
                    const { containerReference: name } = param;
                    const { containersByType, containers: containersByName } = this;

                    if(containersByType.hasOwnProperty(name)) {
                        containers.push(...containersByType[name]);
                    } else if(containersByName.hasOwnProperty(name)) {
                        containers.push(containersByName[name]);
                    } else {
                        throw new Error(`Invalid container named -> ${name}`);
                    }

                    const ids = containers.map(c => c.id);
                    const header = d.buffer.readUInt32LE(d.offset);

                    if(ids.indexOf(header) === -1) {
                        throw new Error(`Invalid header. Expected ${ids.join(' or')} but got "${header}" instead`);
                    }
                }

                result[key] = this.decode({
                    deserializer: d
                });
            } else {
                throw new Error(`Invalid param type -> "${param.key}"`);
            }
        }

        result._name = name;
        result._type = container.type;

        return result;
    }

    decodeGenericStrictSize(deserializer, type, size) {
        if(type === 'string') {
            return deserializer.readString();
        }

        return deserializer._readBytes(size);
    }

    getGenericDefault(type) {
        switch(type) {
        case 'string':
            return '';
        case 'int':
        case 'uint':
        case 'long':
        case 'ulong':
        case 'short':
        case 'ushort':
            return 0;
        case 'bool':
            return false;
        case 'bytes':
            return Buffer.alloc(0);
        }
    }

    encodeGeneric(s, value, genericType) {
        switch(genericType) {
        case 'int':
            s.writeInt(value);
            break;
        case 'uint':
            s.writeUInt(value);
            break;
        case 'long':
            s.writeLong(value);
            break;
        case 'ulong':
            s.writeULong(value);
            break;
        case 'bool':
            s.writeBool(value);
            break;
        case 'short':
            s.writeShort(value);
            break;
        case 'ushort':
            s.writeUShort(value);
            break;
        case 'float':
            s.writeFloat(value);
            break;
        case 'double':
            s.writeDouble(value);
            break;
        case 'string':
            s.writeString(value);
            break;
        case 'bytes':
            s.writeBytes(this.convertToBuffer(value));
            break;
        }
    }

    convertToBuffer(buffer){
        if(Buffer.isBuffer(buffer))
            return buffer;

        if(_.isTypedArray(buffer))
            return Buffer.from(buffer);

        if(_.isString(buffer)){
            if(buffer.substring(0,2) == '0x')
                return Buffer.from(buffer.substring(2), 'hex');
            return Buffer.from(buffer, 'utf8');
        }

        throw new Error('Invalid type for buffer: ' + typeof buffer);
    }

    encode(containerName, object) {
        if(_.isObject(containerName)) {
            object = containerName;
            return this.encode(object._name, object);
        }

        const { containers } = this;

        if(!containers.hasOwnProperty(containerName)) {
            this.throwError('undefined container name -> %s', containerName);
            return false;
        }

        const s = new Serializer();
        const { id, params } = containers[containerName];

        s.writeUInt(id);

        let i, j;
        const ii = params.length;

        for(i = 0; i < ii; i++) {
            const param = params[i];
            const { name: key, type } = param;

            if(type & ParamEnum.OPTIONAL) {
                if(object.hasOwnProperty(key)) {
                    s.writeBool(true);
                } else {
                    s.writeBool(false);
                    continue;
                }
            }

            let value = object[key];

            if(type & ParamEnum.GENERIC) {
                const genericType = param.genericType;

                if(type & ParamEnum.STRICT_SIZE) {
                    this.encodeGenericStrictSize(s, key, value, genericType, param.size);
                    continue;
                }

                if(!object[key]) {
                    value = this.getGenericDefault(genericType);
                }

                this.encodeGeneric(s, value, genericType);
            } else if(type & ParamEnum.VECTOR) {
                const length = value.length;
                const { vectorOf } = param;

                s.writeUInt(length);

                if(this.isGeneric(vectorOf)) {
                    for(j = 0; j < length; j++) {
                        this.encodeGeneric(s, value[j], vectorOf);
                    }
                } else {
                    for(j = 0; j < length; j++) {
                        s.addBuffer(this.encode(value[j]));
                    }
                }
            } else if(type & ParamEnum.NON_GENERIC) {
                s.addBuffer(this.encode(value));
            }
        }

        return s.getBuffer();
    }

    encodeGenericStrictSize(serializer, key, value, type, size) {
        switch(type) {
        case 'string':
            if(value.length !== size) {
                this.throwError(
                    'Invalid size for param %s, ', key,
                    'expected size %s ', size,
                    'but got %s instead', value.length);
            }

            serializer.writeString(value);
            break;
        case 'bytes': {
            const buffer = this.convertToBuffer(value);

            if(buffer.byteLength !== size){
                this.throwError(
                    'Invalid size for param %s, ', key,
                    'expected size %s ', size,
                    'but got %s instead', value.length);
            }

            serializer.addBuffer(buffer);
            break;
        }
        default:
            throw new Error('Unsupported strict size ' + type);;
        }
    }

    throwError(...args) {
        throw new Error(createMessage(...args));
    }
}

export default Schema;
