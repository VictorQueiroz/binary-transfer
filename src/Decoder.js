import Deserializer from './Deserializer';
import { createMessage } from './utils';

class Decoder {
    constructor(store) {
        this.store = store;
    }

    onError(...args) {
        throw new Error(createMessage(...args));
    }

    decode(bytes) {
        const header = bytes.readInt32LE(0);
        const Constructor = this.store.findConstructorFromBuffer(header);

        if(Constructor) {
            return Constructor.decode(new Deserializer(bytes));
        }

        this.onError('no constructor found for header: %s', header);
    }
}

export default Decoder;
