const test = require('mocha');
const assert = require('assert');
const bigInt = require("big-integer");

test.describe('Blockchain Test', () => {

    var BC;
    var blockchain;

    test.beforeEach(() => {
        BC = require('./blockchain');
        blockchain = BC.createBlockchain();
    });

    test.it('Test Init State', function (done) {
        assert.equal(blockchain.getTopBlockHash(), BC.ROOT_HASH);
        assert.deepEqual(blockchain.getTopBlockNumber(), bigInt.zero);
        done();
    })

    test.it('Test first block', function (done) {
        blockchain.addBlock(createBlock('a',BC.ROOT_HASH), true);
        assert.equal(blockchain.getTopBlockHash(), 'a');
        assert.deepEqual(blockchain.getTopBlockNumber(), bigInt.one);
        done();
    })

    test.it('Test orphan', function (done) {
        blockchain.addBlock(createBlock('a',BC.ROOT_HASH), true);
        blockchain.addBlock(createBlock('b', 'x'), true);
        assert.equal(blockchain.getTopBlockHash(), 'a');
        assert.deepEqual(blockchain.getTopBlockNumber(), bigInt(1));
        done();
    })

    test.it('Test no reorg', function (done) {
        blockchain.addBlock(createBlock('a',BC.ROOT_HASH), true);
        blockchain.addBlock(createBlock('b', 'a'), true);
        blockchain.addBlock(createBlock('c', 'b'), true);
        blockchain.addBlock(createBlock('p',BC.ROOT_HASH), true);
        assert.equal(blockchain.getTopBlockHash(), 'c');
        assert.deepEqual(blockchain.getTopBlockNumber(), bigInt(3));
        done();
    })

    test.it('Test reorg superficial', function (done) {
        blockchain.addBlock(createBlock('p',BC.ROOT_HASH), true);
        assert.equal(blockchain.getTopBlockHash(), 'p');
        assert.deepEqual(blockchain.getTopBlockNumber(), bigInt(1));
        blockchain.addBlock(createBlock('a',BC.ROOT_HASH), true);
        assert.equal(blockchain.getTopBlockHash(), 'p');
        assert.deepEqual(blockchain.getTopBlockNumber(), bigInt(1));
        blockchain.addBlock(createBlock('b', 'a'), true);
        assert.equal(blockchain.getTopBlockHash(), 'b');
        assert.deepEqual(blockchain.getTopBlockNumber(), bigInt(2));
        blockchain.addBlock(createBlock('q','p'), true);
        assert.equal(blockchain.getTopBlockHash(), 'b');
        assert.deepEqual(blockchain.getTopBlockNumber(), bigInt(2));
        blockchain.addBlock(createBlock('r','q'), true);
        assert.equal(blockchain.getTopBlockHash(), 'r');
        assert.deepEqual(blockchain.getTopBlockNumber(), bigInt(3));
        done();
    })

    test.it('Test reorg deep', function (done) {
        blockchain.addBlock(createBlock('x',BC.ROOT_HASH), true);
        blockchain.addBlock(createBlock('p','x'), true);
        blockchain.addBlock(createBlock('q','p'), true);
        blockchain.addBlock(createBlock('a','x'), true);
        blockchain.addBlock(createBlock('b', 'a'), true);
        blockchain.addBlock(createBlock('c', 'b'), true);
        assert.equal(blockchain.getTopBlockHash(), 'c');
        assert.deepEqual(blockchain.getTopBlockNumber(), bigInt(4));
        blockchain.addBlock(createBlock('r','q'), true);
        assert.equal(blockchain.getTopBlockHash(), 'c');
        assert.deepEqual(blockchain.getTopBlockNumber(), bigInt(4));
        blockchain.addBlock(createBlock('s','r'), true);
        assert.equal(blockchain.getTopBlockHash(), 's');
        assert.deepEqual(blockchain.getTopBlockNumber(), bigInt(5));
        done();
    })

    test.it('Test reorg very deep', function (done) {
        blockchain.addBlock(createBlock('p',BC.ROOT_HASH), true);
        blockchain.addBlock(createBlock('q','p'), true);
        blockchain.addBlock(createBlock('a',BC.ROOT_HASH), true);
        blockchain.addBlock(createBlock('b', 'a'), true);
        blockchain.addBlock(createBlock('c', 'b'), true);
        assert.equal(blockchain.getTopBlockHash(), 'c');
        assert.deepEqual(blockchain.getTopBlockNumber(), bigInt(3));
        blockchain.addBlock(createBlock('r','q'), true);
        assert.equal(blockchain.getTopBlockHash(), 'c');
        assert.deepEqual(blockchain.getTopBlockNumber(), bigInt(3));
        blockchain.addBlock(createBlock('s','r'), true);
        assert.equal(blockchain.getTopBlockHash(), 's');
        assert.deepEqual(blockchain.getTopBlockNumber(), bigInt(4));
        done();
    })

    test.it('Test reorg multiple branches', function (done) {
        blockchain.addBlock(createBlock('p',BC.ROOT_HASH), true);
        assert.equal(getDescendantsAsStr(BC.ROOT_HASH), 'p');
        assert.equal(getDescendantsAsStr('p'), '');
        blockchain.addBlock(createBlock('q','p'), true);
        assert.equal(getDescendantsAsStr(BC.ROOT_HASH), 'p:q');
        assert.equal(getDescendantsAsStr('p'), 'q');
        blockchain.addBlock(createBlock('r','q'), true);
        assertTopBlock('r', 3);
        blockchain.addBlock(createBlock('a','p'), true);
        assertTopBlock('r', 3);
        blockchain.addBlock(createBlock('b', 'a'), true);
        assertTopBlock('r', 3);
        blockchain.addBlock(createBlock('c', 'b'), true);
        assert.equal(getDescendantsAsStr(BC.ROOT_HASH), 'p:a:b:c');
        assert.equal(getDescendantsAsStr('p'), 'a:b:c');
        assert.equal(getDescendantsAsStr('q'), '');
        assertTopBlock('c', 4);
        blockchain.addBlock(createBlock('x', 'b'), true);
        assertTopBlock('c', 4);
        blockchain.addBlock(createBlock('y', 'x'), true);
        assertTopBlock('y', 5);
        blockchain.addBlock(createBlock('d', 'c'), true);
        assertTopBlock('y', 5);
        blockchain.addBlock(createBlock('e', 'd'), true);
        assertTopBlock('e', 6);
        blockchain.addBlock(createBlock('s', 'r'), true);
        assertTopBlock('e', 6);
        blockchain.addBlock(createBlock('t', 's'), true);
        assertTopBlock('e', 6);
        blockchain.addBlock(createBlock('u', 't'), true);
        assertTopBlock('e', 6);
        blockchain.addBlock(createBlock('v', 'u'), true);
        assert.equal(getDescendantsAsStr(BC.ROOT_HASH), 'p:q:r:s:t:u:v');
        assertTopBlock('v', 7);
        done();
    })

    let getDescendantsAsStr = (hash) => {
        return blockchain.getDescendants(hash).reduce((acc, block) => {
            if (acc) {
                acc = acc + ':';
            }
            return acc + block.blockHash;
        }, '');
    }

    let assertTopBlock = (_blockHash, depth) => {
        assert.equal(blockchain.getTopBlockHash(), _blockHash);
        assert.deepEqual(blockchain.getTopBlockNumber(), bigInt(depth));
    }

    let createBlock = (_blockHash, _prevBlockHash) => {
        let block = BC.createBlock(_prevBlockHash, 1, 1, 'x');
        block.blockHash = _blockHash;
        return block;
    };
});