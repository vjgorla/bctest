const bigInt = require("big-integer");
const BigNumber = require('bignumber.js');
const utils = require('./utils');

const ROOT_HASH = '0000000000000000000000000000000000000000000000000000000000000000';
const RETARGET_BLOCK_INTERVAL = 100;
const INITIAL_DIFFICULTY = bigInt(2).pow(bigInt(256)).divide(bigInt(100000));
const BASELINE_TS_INTERVAL = bigInt(1000000);
const DIFFICULTY_PRECISION = bigInt(1000000);

function Block(prevBlockHash, nonce, ts, text) {
    this.blockHash = undefined;
    this.prevBlockHash = prevBlockHash;
    this.nonce = nonce;
    this.ts = ts;
    this.text = text;
}

Block.prototype = {
    constructor: Block,
    blockContentsString: function() {
        return this.prevBlockHash + ":" + this.nonce + ":" + this.ts + ":" + this.text;
    },
    blockString: function() {
        return this.blockHash + ":" + this.blockContentsString();
    }
};

function Blockchain() {
    this.currentDifficulty = INITIAL_DIFFICULTY;
    this.retargetBlockInterval = RETARGET_BLOCK_INTERVAL;
    this.topBlockNumber = bigInt.zero;
    this.topBlockHash = ROOT_HASH;
    this.map = {};
    this.descendantsMap = {};
}

Blockchain.prototype = {
    constructor: Blockchain,
    _setDifficulty: function(block) {
        let newDifficulty = this._calculateDifficulty(block.blockHash);
        if (newDifficulty.notEquals(this.currentDifficulty)) {
            let oldD = bigInt(2).pow(bigInt(256)).divide(this.currentDifficulty);
            let newD = bigInt(2).pow(bigInt(256)).divide(newDifficulty);
            let change = new BigNumber(newD.toString()).minus(new BigNumber(oldD.toString()))
                .times(new BigNumber('100')).div(new BigNumber(oldD.toString()));
            console.log("Difficulty " + change.toString(10) + "% ... " + oldD.toString() + " > " + newD.toString());
        }
        this.currentDifficulty = newDifficulty;
    },
    addBlock: function(block, mined) {
        if (this.map[block.blockHash]) {
            return { alreadyExists: true };
        }
        if (block.prevBlockHash !== ROOT_HASH && !this.map[block.prevBlockHash]) {
            console.log("Orphan - " + block.prevBlockHash + " does not exist");
            return { alreadyExists: false, isOrphan: true };
        }
        if (!mined) {
            let blockContentsStr = block.blockContentsString();
            let blockHash = utils.digestStrToHex(blockContentsStr);
            if (block.blockHash !== blockHash) {
                console.error('Invalid block hash');
                return { alreadyExists: false, isOrphan: false, valid: false };
            }
            let hashBigInt = utils.hexToBigInt(block.blockHash);
            let targetDifficulty = this._calculateDifficulty(block.prevBlockHash);
            if (!hashBigInt.lesserOrEquals(targetDifficulty)) {
                console.error('Invalid difficulty');
                return { alreadyExists: false, isOrphan: false, valid: false };
            }
        }
        this.map[block.blockHash] = block;
        let descendants = this.descendantsMap[block.prevBlockHash];
        if (!descendants) {
            descendants = [];
            this.descendantsMap[block.prevBlockHash] = descendants;
        }
        descendants.push(block);
        if (block.prevBlockHash === this.topBlockHash) {
            this.topBlockNumber = this.topBlockNumber.plus(bigInt.one);
            console.log(this.topBlockNumber + (mined ? " > " : " < ") + block.blockString());
            this.topBlockHash = block.blockHash;
            this._setDifficulty(block);
            return { alreadyExists: false, isOrphan: false, valid: true };
        } else {
            let ihash = block.prevBlockHash;
            let blockDepth = 0;
            while(true) {
                blockDepth++;
                let distance = this._findDistance(ihash, this.topBlockHash, 0);
                if (distance !== -1) {
                    if (blockDepth > distance) {
                        this.topBlockNumber = this.topBlockNumber.minus(bigInt(distance)).plus(bigInt(blockDepth));
                        console.log('...(' + blockDepth + ') ' + this.topBlockNumber + (mined ? " > " : " < ") + block.blockString());
                        this.topBlockHash = block.blockHash;
                        this._setDifficulty(block);
                    } else {
                        console.log((mined ? " > " : " < ") + block.blockString());
                    }
                    return { alreadyExists: false, isOrphan: false, valid: true };
                }
                if (ihash === ROOT_HASH) {
                    throw new Error('Traversing past root!!!');
                }
                ihash = this.map[ihash].prevBlockHash;
            }
        }
    },
    _calculateDifficulty: function(hash) {
        let height = this._calculateHeight(hash);
        if (height <= this.retargetBlockInterval) {
            return INITIAL_DIFFICULTY;
        }
        let fromHeight = height - ((height - 1) % this.retargetBlockInterval);
        let toHeight = fromHeight - this.retargetBlockInterval;
        let fromTs;
        while (true) {
            let block = this.map[hash];
            if (height === fromHeight) {
                fromTs = bigInt(block.ts);
            }
            if (height === toHeight) {
                let interval = fromTs.minus(bigInt(block.ts));
                return this._difficulty(interval, this._calculateDifficulty(block.blockHash));
            }
            hash = block.prevBlockHash;
            height--;
        }
    },
    _difficulty: function(interval, prevDifficulty) {
        return interval.multiply(DIFFICULTY_PRECISION).divide(BASELINE_TS_INTERVAL).multiply(prevDifficulty).divide(DIFFICULTY_PRECISION);
    },
    _calculateHeight: function(hash) {
        let height = 0;
        while (hash !== ROOT_HASH) {
            let block = this.map[hash];
            height++;
            hash = block.prevBlockHash;
        }
        return height;
    },
    getAncestor: function(descendant) {
        let block = this.map[descendant];
        if (block) {
            return this.map[block.prevBlockHash];
        }
    },
    getDescendants: function(blockHash) {
        let result = { blocks: [] };
        this._getDescendants(blockHash, result);
        return result.blocks;
    },
    _getDescendants: function(blockHash, result) {
        let descendants = this.descendantsMap[blockHash];
        if (descendants) {
            for (let i = 0; i < descendants.length; i++) {
                let distance = this._findDistance(descendants[i].blockHash, this.topBlockHash, 0);
                if (distance !== -1) {
                    result.blocks.push(descendants[i]);
                    this._getDescendants(descendants[i].blockHash, result);
                }
            }
        }
    },
    _findDistance: function(fromHash, toHash, currentDepth) {
        if (fromHash === toHash) {
            return currentDepth;
        }
        let descendants = this.descendantsMap[fromHash];
        if (!descendants) {
            return -1;
        }
        currentDepth++;
        for (let i = 0; i < descendants.length; i++) {
            if (descendants[i].blockHash === toHash) {
                return currentDepth;
            } else {
                let distance = this._findDistance(descendants[i].blockHash, toHash, currentDepth);
                if (distance !== -1) {
                    return distance;
                }
            }
        }
        return -1;
    }
};

module.exports = {
    ROOT_HASH: ROOT_HASH,
    Block: Block,
    Blockchain: Blockchain
};
