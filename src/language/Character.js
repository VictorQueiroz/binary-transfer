export const Character = {
    isIdentifierStart (cp) {
        return (cp === 0x24) || (cp === 0x5F) ||          // $ (dollar) and _ (underscore)
                    (cp >= 0x41 && cp <= 0x5A) ||         // A..Z
                    (cp >= 0x61 && cp <= 0x7A) ||         // a..z
                    (cp === 0x5C) ||                      // \ (backslash)
                    (cp >= 0x80);
    },

    // ECMA-262 11.2 White Space
    isWhiteSpace (cp) {
        return (cp === 0x20) || (cp === 0x09) || (cp === 0x0B) || (cp === 0x0C) || (cp === 0xA0) ||
                        (cp >= 0x1680 && [0x1680, 0x180E, 0x2000, 0x2001, 0x2002, 0x2003, 0x2004, 0x2005, 0x2006, 0x2007, 0x2008, 0x2009, 0x200A, 0x202F, 0x205F, 0x3000, 0xFEFF].indexOf(cp) >= 0);
    },

    // https://tc39.github.io/ecma262/#sec-literals-numeric-literals
    isDecimalDigit(cp) {
        return (cp >= 0x30 && cp <= 0x39);      // 0..9
    },

    isHexDigit(cp) {
        return (cp >= 0x30 && cp <= 0x39) ||    // 0..9
            (cp >= 0x41 && cp <= 0x46) ||       // A..F
            (cp >= 0x61 && cp <= 0x66);         // a..f
    },

    isIdentifierPart (ch) {
        return (ch === 0x24) || (ch === 0x5F) ||      // $ (dollar) and _ (underscore)
                (ch >= 0x41 && ch <= 0x5A) ||         // A..Z
                (ch >= 0x61 && ch <= 0x7A) ||         // a..z
                (ch >= 0x30 && ch <= 0x39) ||         // 0..9
                (ch === 0x5C) ||                      // \ (backslash)
                (ch >= 0x80);
    },

    isStringQuote(ch) {
        return (ch == 0x27 || ch == 0x22);
    },

    isLineTerminator(cp) {
        return (cp === 0x0A) || (cp === 0x0D) ||
                (cp === 0x2028) || (cp === 0x2029);
    }
};
