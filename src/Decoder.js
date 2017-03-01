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
        const Constructor = this.store.findConstructorFromBuffer(bytes);

        if(Constructor) {
            return Constructor.decode(new Deserializer(bytes));
        }

        this.onError('no constructor found for header: %s', header);
    }
}

export default Decoder;
