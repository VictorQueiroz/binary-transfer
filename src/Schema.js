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
        this.containerProperty = '_name';

        let i, j, jj, container;
        const ii = schemas.length;

        for(i = 0; i < ii; i++) {
            const { containers } = schemas[i];

            jj = containers.length;

            for(j = 0; j < jj; j++) {
                container = containers[j];

                if(this.containers.hasOwnProperty(container.name)) {
                    this.throwError('repeated container name -> %s', container.name);
                    return false;
                }
                this.containers[container.name] = container;
                this.containersById[container.id] = container;
            }
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

        const { name, params } = this.containersById[id];
        const ii = params.length;

        result._name = name;

        for(let i = 0; i < ii; i++) {
            const param = params[i];
            const { name: key, type } = param;

            if(type & ParamEnum.GENERIC) {
                const genericType = param.genericType;

                if(type & ParamEnum.STRICT_SIZE) {
                    result[key] = this.decodeGenericStrictSize(d, genericType, param.size);
                    continue;
                }

                switch(genericType) {
                case 'int':
                    result[key] = d.readInt();
                    break;
                case 'uint':
                    result[key] = d.readUInt();
                    break;
                case 'long':
                    result[key] = d.readLong();
                    break;
                case 'ulong':
                    result[key] = d.readULong();
                    break;
                case 'bool':
                    result[key] = d.readBool();
                    break;
                case 'short':
                    result[key] = d.readShort();
                    break;
                case 'ushort':
                    result[key] = d.readUShort();
                    break;
                case 'float':
                    result[key] = d.readFloat();
                    break;
                case 'double':
                    result[key] = d.readDouble();
                    break;
                case 'string':
                    result[key] = d.readString();
                    break;
                case 'bytes':
                    result[key] = d.readBytes();
                    break;
                }
            } else if(type & ParamEnum.VECTOR) {
                const length = d.readUInt();
                const list = new Array(length);

                for(let i = 0; i < length; i++) {
                    list[i] = this.decode({
                        deserializer: d
                    });
                }

                result[key] = list;
            }
        }

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

    encode(object) {
        const { containers } = this;
        const containerName = object[this.containerProperty];

        if(!containers.hasOwnProperty(containerName)) {
            this.throwError('undefined container name -> %s', containerName);
            return false;
        }

        const s = new Serializer();
        const { id, params } = this.containers[containerName];

        s.writeUInt(id);

        const ii = params.length;

        for(let i = 0; i < ii; i++) {
            const param = params[i];
            const { name: key, type } = param;

            let value = object[key];

            if(type & ParamEnum.GENERIC) {
                const genericType = param.genericType;

                if(type & ParamEnum.STRICT_SIZE) {
                    this.encodeGenericStrictSize(s, key, value, genericType, param.size);
                    continue;
                }

                if(!object.hasOwnProperty(key)) {
                    value = this.getGenericDefault(genericType);
                }

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
                    s.writeBytes(value);
                    break;
                }
            } else if(type & ParamEnum.VECTOR) {
                const length = value.length;

                s.writeUInt(length);

                for(let j = 0; j < length; j++) {
                    s.addBuffer(this.encode(value[j]));
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
        default:
            serializer.addBuffer(value);
        }
    }

    throwError(...args) {
        throw new Error(createMessage(...args));
    }
}

export default Schema;
