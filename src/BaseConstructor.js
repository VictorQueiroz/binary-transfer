class BaseConstructor {
    toJSON() {
        const props = {};

        this._params.forEach(key => {
            props[key] = this[key];
        });

        return props;
    }
}

export default BaseConstructor;
