const bigInt = require("big-integer");

const ROOT_HASH = '0000000000000000000000000000000000000000000000000000000000000000';

const createBlock = (_prevBlockHash, _nonce, _ts, _text) => {
    return {
        blockHash: undefined,
        prevBlockHash: _prevBlockHash,
        nonce: _nonce,
        ts: _ts,
        text: _text,
        blockContentsString() {
            return this.prevBlockHash + ":" + this.nonce + ":" + this.ts + ":" + this.text;
        },
        blockString() {
            return this.blockHash + ":" + this.blockContentsString();
        }
    };
};

const createBlockchain = () => {
    return {
        topBlockNumber: bigInt.zero,
        topBlockHash: ROOT_HASH,
        map: {},
        descendantsMap: {},
        getTopBlockNumber() {
            return this.topBlockNumber;
        },
        getTopBlockHash() {
            return this.topBlockHash;
        },
        addBlock(block, mined) {
            if (this.map[block.blockHash]) {
                return { alreadyExists: true };
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
                return { alreadyExists: false, reorg: false, hasOrphan: false };
            } else {
                let ihash = block.prevBlockHash;
                let blockDepth = 0;
                while(true) {
                    if (ihash !== ROOT_HASH) {
                        let iblock = this.map[ihash];
                        if (!iblock) {
                            console.log("orphan - " + ihash + " does not exist");
                            return { alreadyExists: false, reorg: false, hasOrphan: true, orphanHash:  ihash };
                        }
                    }
                    blockDepth++;
                    let distance = this._findDistance(ihash, this.topBlockHash, 0);
                    if (distance != -1) {
                        if (blockDepth > distance) {
                            this.topBlockNumber = this.topBlockNumber.minus(bigInt(distance)).plus(bigInt(blockDepth));
                            console.log('...(' + blockDepth + ') ' + this.topBlockNumber + (mined ? " > " : " < ") + block.blockString());
                            this.topBlockHash = block.blockHash;
                            return { alreadyExists: false, reorg: true, hasOrphan: false };
                        } else {
                            console.log((mined ? " > " : " < ") + block.blockString());
                            return { alreadyExists: false, reorg: false, hasOrphan: false };
                        }
                    }
                    if (ihash === ROOT_HASH) {
                        throw new Error('Traversing past root!!!');
                    }
                    ihash = this.map[ihash].prevBlockHash;
                }
            }
        },
        getDescendants(blockHash) {
            let result = { blocks: [] };
            this._getDescendants(blockHash, result);
            return result.blocks;
        },
        _getDescendants(blockHash, result) {
            let descendants = this.descendantsMap[blockHash];
            if (descendants) {
                for (let i = 0; i < descendants.length; i++) {
                    let distance = this._findDistance(descendants[i].blockHash, this.topBlockHash, 0);
                    if (distance != -1) {
                        result.blocks.push(descendants[i]);
                        this._getDescendants(descendants[i].blockHash, result);
                    }
                }
            }
        },
        _findDistance(fromHash, toHash, currentDepth) {
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
                    if (distance != -1) {
                        return distance;
                    }
                }
            }
            return -1;
        }
    }
};

module.exports = {
    ROOT_HASH: ROOT_HASH,
    createBlock: createBlock,
    createBlockchain: createBlockchain
}