import _ from 'lodash';
import { Buffer } from 'buffer';

export const createMessage = function(...args) {
    for(let i = 0; i < args.length; i++) {
        // WRONG: createMessage('value is %s');
        if(i == args.length - 1) {
            break;
        }

        // OK: createMessage('value is %s', 1);
        if(_.isString(args[i]) && args[i].indexOf('%s') > -1) {
            const next = args.splice(i + 1, 1);

            args.splice(i, 1, args[i].replace('%s', next));
            return createMessage(...args);
        }
    }

    return args.map(_.trim).join(' ');
};

export const trimBytesLE = function(bytes, byteLength) {
    if(bytes.byteLength != byteLength) {
        while(bytes[bytes.byteLength - 1] === 0) {
            bytes = bytes.slice(0, bytes.byteLength - 2);
        }
    }

    return bytes;
};

export const addPaddingLE = function(bytes, expectedLength) {
    const needPadding = expectedLength - bytes.byteLength;

    if(needPadding > 0) {
        bytes = Buffer.concat([
            bytes,
            Buffer.alloc(needPadding)
        ]);
    }

    if(needPadding < 0) {
        throw new Error(createMessage('%s: "bytes" argument is bigger than expected length. expected %s but got %s instead', 'addPaddingLE', expectedLength, bytes.byteLength));
    }

    return bytes;
};
