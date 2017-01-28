export const createMessage = function(...args) {
    if(args.length > 1 && args[0].indexOf('%s') > -1) {
        args.splice(0, 1, args[0].replace('%s', args.splice(1, 1)));

        return createMessage.apply(this, args);
    }

    return args.join(' ');
};
