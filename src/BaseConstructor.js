import _ from 'lodash';
import Long from 'long';
import { createMessage } from './utils';

class BaseConstructor {
    static generics = {
        int: 'Int',
        bool: 'Bool',
        long: 'Long',
        uint: 'UInt',
        short: 'Short',
        ulong: 'ULong',
        float: 'Float',
        bytes: 'Bytes',
        string: 'String',
        ushort: 'UShort',
        double: 'Double'
    };

    static validate(header, ids) {
        let found = false;

        header = header.readUInt32LE(0);

        for(let i = 0; i < ids.length; i++) {
            if(ids[i] != header) {
                continue;
            }

            found = true;
            break;
        }

        return found;
    }

    static isGenericType(type) {
        return this.generics.hasOwnProperty(type);
    }

    static isVectorType(type) {
        return type.substring(0, 6) == 'Vector';
    }

    static isTypeReference(name) {
        if(name.indexOf('.') > -1) {
            name = this.skipDots(name);
        }
        return _.upperCase(name.charAt(0)) == name.charAt(0);
    }

    static isConstructorReference(name) {
        if(name.indexOf('.') > -1) {
            name = this.skipDots(name);
        }
        return _.lowerCase(name.charAt(0)) == name.charAt(0);
    }

    static skipDots(name) {
        const dotIndex = name.indexOf('.');

        if(dotIndex > -1) {
            return this.skipDots(name.substring(dotIndex + 1));
        }

        return name;
    }

    static getConstructorName(name) {
        return _.upperFirst(this.skipDots(name));
    }

    static onError(...args) {
        throw new Error(createMessage(...args));
    }

    onError(...args) {
        return BaseConstructor.onError(...args);
    }

    _expect(property, value, type) {
        this.onError(
            'Invalid type for %s "%s". ',
            _.isNumber(property) ? 'vector index' : 'param',
            property,

            'Expected type %s but got %s instead.',
            type,
            typeof value,

            'Check constructor: %s',
            this._name
        );
    }

    _validateGenericProperty(property, value, type) {
        switch(type) {
        case 'int':
        case 'uint':
        case 'float':
        case 'short':
        case 'ushort':
        case 'double':
            if(_.isNumber(value)) {
                break;
            }

            this._expect(property, value, 'number');
            break;

        case 'bytes':
            if(Buffer.isBuffer(value)) {
                break;
            }

            this._expect(property, value, 'Buffer');
            break;

        case 'long':
        case 'ulong':
            if(_.isNumber(value) || Long.isLong(value)) {
                break;
            }
            if(_.isString(value) && value != '') {
                let padding = value.substring(0, 2);
                const paddingLength = value.length % 2;

                if(padding == '0x' && paddingLength != 0) {
                    padding = value.substring(2);

                    for(let i = 0; i < paddingLength; i++) {
                        padding = '0' + padding;
                    }

                    this.onError(
                        'Invalid value for property "%s". ', property,
                        'Hexadecimal strings must have even length. Given: %s. ', value,
                        'Try adding zero padding: 0x%s', padding
                    );
                    break;
                }
                break;
            }
            this._expect(property, value, 'number or string');
            break;

        case 'bool':
            if(_.isBoolean(value)) {
                break;
            }

            this._expect(property, value, 'boolean');
            break;

        case 'string':
            if(_.isString(value)) {
                break;
            }

            this._expect(property, value, 'string');
            break;

        default:
            this.onError('unhandled type of %s', type);
        }
    }
}

export default BaseConstructor;
