import _ from 'lodash';
import { createMessage } from './utils';

class BaseConstructor {
    static generics = {
        int: 'Int',
        long: 'Long',
        uint: 'UInt',
        ulong: 'ULong',
        float: 'Float',
        bytes: 'Bytes',
        string: 'String',
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
}

export default BaseConstructor;
