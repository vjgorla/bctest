const test = require('mocha');
const assert = require('assert');
const bigInt = require("big-integer");
const BC = require('./blockchain');
const utils = require('./utils');

const INITIAL_DIFFICULTY = bigInt(2).pow(bigInt(256)).divide(bigInt(100000));

test.describe('Difficulty retarget test', () => {

    var blockchain;

    test.beforeEach(() => {
        blockchain = BC.createBlockchain();
        blockchain.retargetBlockInterval = 2;
    });

    test.it('Test initial difficulty', function (done) {
        blockchain.addBlock(createBlock('a',BC.ROOT_HASH, 0), true);
        assert.deepEqual(blockchain._calculateDifficulty('a'), INITIAL_DIFFICULTY);
        assert.deepEqual(blockchain.currentDifficulty, INITIAL_DIFFICULTY);
        blockchain.addBlock(createBlock('b', 'a', 0), true);
        assert.deepEqual(blockchain._calculateDifficulty('b'), INITIAL_DIFFICULTY);
        assert.deepEqual(blockchain.currentDifficulty, INITIAL_DIFFICULTY);
        done();
    })

    test.it('Test retarget main branch', function (done) {
        blockchain.addBlock(createBlock('a',BC.ROOT_HASH, 0), true);
        blockchain.addBlock(createBlock('b', 'a', 10), true);
        blockchain.addBlock(createBlock('c', 'b', 2000000), true);
        assert.deepEqual(blockchain._calculateDifficulty('c'), INITIAL_DIFFICULTY.multiply(bigInt(2)));
        assert.deepEqual(blockchain.currentDifficulty, INITIAL_DIFFICULTY.multiply(bigInt(2)));
        blockchain.addBlock(createBlock('d', 'c', 2000010), true);
        blockchain.addBlock(createBlock('e', 'd', 3000000), true);
        assert.deepEqual(blockchain._calculateDifficulty('e'), INITIAL_DIFFICULTY);
        assert.deepEqual(blockchain.currentDifficulty, INITIAL_DIFFICULTY);
        blockchain.addBlock(createBlock('f', 'e', 3000010), true);
        blockchain.addBlock(createBlock('g', 'f', 3000010), true);
        assert.deepEqual(blockchain._calculateDifficulty('g'), INITIAL_DIFFICULTY.divide(bigInt(100000)));
        assert.deepEqual(blockchain.currentDifficulty, INITIAL_DIFFICULTY.divide(bigInt(100000)));
        done();
    })

    test.it('Test retarget other branches', function (done) {
        blockchain.addBlock(createBlock('a', BC.ROOT_HASH, 0), true);
        blockchain.addBlock(createBlock('b', 'a', 10), true);
        blockchain.addBlock(createBlock('c', 'b', 1000000), true);
        blockchain.addBlock(createBlock('d', 'c', 1000010), true);
        blockchain.addBlock(createBlock('e', 'd', 2000000), true);
        assert.equal(blockchain.topBlockHash, 'e');

        let block = BC.createBlock(BC.ROOT_HASH, '104566', '0', 'x');
        block.blockHash = '0000775a57e301f40a233af9e38a5b4b88252990e54ff6d5cdd90193bae574ab';
        let result = blockchain.addBlock(block, false);
        assert.equal(result.valid, true);

        block = BC.createBlock('0000775a57e301f40a233af9e38a5b4b88252990e54ff6d5cdd90193bae574ab', '4666', '10', 'x');
        block.blockHash = '0000946104f7553285a916a1b4fcfa5daa90d3bfdba15f06f5f48f85dc8f508c';
        result = blockchain.addBlock(block, false);
        assert.equal(result.valid, true);

        block = BC.createBlock('0000946104f7553285a916a1b4fcfa5daa90d3bfdba15f06f5f48f85dc8f508c', '24846', '2000000', 'x');
        block.blockHash = '00002210f887de78b5697862f9b04a9ad880afc81a23a012b75b000a2c1305cd';
        result = blockchain.addBlock(block, false);
        assert.equal(result.valid, true);

        assert.deepEqual(blockchain._calculateDifficulty('00002210f887de78b5697862f9b04a9ad880afc81a23a012b75b000a2c1305cd'), INITIAL_DIFFICULTY.multiply(bigInt(2)));
        assert.deepEqual(blockchain.currentDifficulty, INITIAL_DIFFICULTY);
        assert.equal(blockchain.topBlockHash, 'e');

        block = BC.createBlock('00002210f887de78b5697862f9b04a9ad880afc81a23a012b75b000a2c1305cd', '57500', '2000010', 'x');
        block.blockHash = '00012eb9a9a568a13af7bad824ecf9719238aa45093d991941ed64a35e12fdd7';
        result = blockchain.addBlock(block, false);
        assert.equal(result.valid, true);

        block = BC.createBlock('0000946104f7553285a916a1b4fcfa5daa90d3bfdba15f06f5f48f85dc8f508c', '57504', '500000', 'x');
        block.blockHash = '000093b3cea80d91e5046abe34a750c690891afa47ac83edba838e52190ec312';
        result = blockchain.addBlock(block, false);
        assert.equal(result.valid, true);

        assert.deepEqual(blockchain._calculateDifficulty('000093b3cea80d91e5046abe34a750c690891afa47ac83edba838e52190ec312'), INITIAL_DIFFICULTY.divide(bigInt(2)));
        assert.deepEqual(blockchain.currentDifficulty, INITIAL_DIFFICULTY);
        assert.equal(blockchain.topBlockHash, 'e');

        block = BC.createBlock('000093b3cea80d91e5046abe34a750c690891afa47ac83edba838e52190ec312', '147774', '500010', 'x');
        block.blockHash = '00009a0db70081b2091775b23c4f2829b5d9515c798d77533c99aef599565995';
        result = blockchain.addBlock(block, false);
        assert.equal(result.valid, false);

        block = BC.createBlock('000093b3cea80d91e5046abe34a750c690891afa47ac83edba838e52190ec312', '211319', '500010', 'x');
        block.blockHash = '000048021b2f9e47e0c81783ce2940cc318f31d909bf537526e73fb54a9fb013';
        result = blockchain.addBlock(block, false);
        assert.equal(result.valid, true);

        block = BC.createBlock('000048021b2f9e47e0c81783ce2940cc318f31d909bf537526e73fb54a9fb013', '526528', '750000', 'x');
        block.blockHash = '00002007422630a845f547083b9bad6ffd06bb4653cfc575f0f6bbf7038bf4bc';
        result = blockchain.addBlock(block, false);
        assert.equal(result.valid, true);

        assert.deepEqual(blockchain._calculateDifficulty('00002007422630a845f547083b9bad6ffd06bb4653cfc575f0f6bbf7038bf4bc'), INITIAL_DIFFICULTY.divide(bigInt(4)));
        assert.deepEqual(blockchain.currentDifficulty, INITIAL_DIFFICULTY);
        assert.equal(blockchain.topBlockHash, 'e');

        block = BC.createBlock('00002007422630a845f547083b9bad6ffd06bb4653cfc575f0f6bbf7038bf4bc', '201327', '750010', 'x');
        block.blockHash = '00002d44ede421cb9287e478999fd875ea84247b430d140d680d203a99854897';
        result = blockchain.addBlock(block, false);
        assert.equal(result.valid, false);
        assert.equal(blockchain.topBlockHash, 'e');

        block = BC.createBlock('00002007422630a845f547083b9bad6ffd06bb4653cfc575f0f6bbf7038bf4bc', '243011', '750010', 'x');
        block.blockHash = '000005cdad940869376620dd4174419cb50ff6b342494ed59a7f45c5648f58b5';
        result = blockchain.addBlock(block, false);
        assert.equal(result.valid, true);

        assert.deepEqual(blockchain.currentDifficulty, INITIAL_DIFFICULTY.divide(bigInt(4)));
        assert.equal(blockchain.topBlockHash, '000005cdad940869376620dd4174419cb50ff6b342494ed59a7f45c5648f58b5');

        done();
    })

    let createBlock = (_blockHash, _prevBlockHash, _ts) => {
        let block = BC.createBlock(_prevBlockHash, 1, _ts, 'x');
        block.blockHash = _blockHash;
        return block;
    };

});