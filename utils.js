const forge = require('node-forge');
const bigInt = require("big-integer");

const MD = forge.md.sha256.create();

const hexToBigInt = (hex) => {
    return bigInt(hex, 16);
};

const digestStrToHex = (str) => {
    MD.start();
    MD.update(str);
    return MD.digest().toHex();
};

module.exports = {
    hexToBigInt: hexToBigInt,
    digestStrToHex: digestStrToHex,
}

