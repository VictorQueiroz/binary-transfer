import assert from 'assert';
import * as utils from '../src/utils';

describe('utils', function() {
    describe('addPaddingLE()', function() {
        const bytes = Buffer.alloc(4);

        beforeEach(() => {
            bytes.writeUInt16LE(0xFFFF, 0);
        });

        it('should put padding at the end of the buffer', function() {
            const result = utils.addPaddingLE(bytes, 8);

            assert.equal(result.readUInt32LE(0), 0x0000FFFF);
            assert.equal(result.readUInt32LE(4), 0x00000000);
        });
    });

    describe('trimBytesLE()', function() {
        const bytes = Buffer.alloc(8);

        beforeEach(() => {
            bytes.fill(0);
        });

        it('should remove leading zeros from high bytes', function() {
            bytes.writeUInt32LE(0xFFFFFFFF, 0);

            assert(utils.trimBytesLE(bytes).equals(bytes.slice(0, 4)));
        });

        it('should respect little endian order', function() {
            bytes.writeUInt32LE(0xFFFFFFFF, 4);
            assert.equal(utils.trimBytesLE(bytes), bytes);
        });
    });
});
