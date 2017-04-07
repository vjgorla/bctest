const express = require("express");
const bodyParser = require('body-parser');
const forge = require('node-forge');
const bigInt = require("big-integer");
const yargs = require("yargs");
const axios = require("axios");
const BC = require('./blockchain');

const INITIAL_DIFFICULTY = bigInt(2).pow(bigInt(256)).divide(bigInt(100000));
const MD = forge.md.sha256.create();

const config = {
    port: yargs.argv.port,
    peers: yargs.argv.peers.split(','),
    text: yargs.argv.text
};

let hexToBigInt = (hex) => {
    return bigInt(hex, 16);
};

let bigIntToHex = (bigInt) => {
    return bigInt.toString(16);
};

let digestStrToHex = (str) => {
    MD.start();
    MD.update(str);
    return MD.digest().toHex();
};

let blockchain = BC.createBlockchain();

console.log(INITIAL_DIFFICULTY.toString() + "  <<<<<<<");

const app = express();

let nonce = bigInt.zero;
let currentDifficulty = INITIAL_DIFFICULTY;

axios.get(config.peers[0] + "/getblocks?after=" + BC.ROOT_HASH).then((result) => {
    let blocksStr = result.data;
    if (blocksStr) {
        blocksStr.split('\n').forEach((blockStr) => {
            if (blockStr) {
                receiveBlock(blockStr);
            }
        });
    }
}).catch((error) => {});

setInterval(() => {
    for(let i = 0; i < 1000; i++) {
        nonce = nonce.plus(bigInt.one);
        let block = BC.createBlock(blockchain.getTopBlockHash(), nonce.toString(), new Date().getTime(), config.text);
        let blockHash = digestStrToHex(block.blockContentsString());
        if (hexToBigInt(blockHash).lesserOrEquals(currentDifficulty)) {
            block.blockHash = blockHash;
            //console.log(hashBigInt.toString());
            blockchain.addBlock(block, true);
            postBlock(block);
        }
    }
}, 50);

let receiveBlock = (blockStr) => {
    let blockElms = blockStr.split(':');
    if (blockElms.length != 5) {
        console.error('Invalid number of elements in block');
        return;
    }

    let block = BC.createBlock(blockElms[1], blockElms[2], blockElms[3], blockElms[4]);
    block.blockHash = blockElms[0];

    let blockContentsStr = block.blockContentsString();
    let blockHash = digestStrToHex(blockContentsStr);
    if (block.blockHash !== blockHash) {
        console.error('Invalid block hash');
        return;
    }
    let hashBigInt = hexToBigInt(block.blockHash);
    if (!hashBigInt.lesserOrEquals(currentDifficulty)) {
        console.error('Invalid difficulty');
        return;
    }
    let result = blockchain.addBlock(block, false);
    result.block = block;
    return result;
};

app.use(bodyParser.urlencoded({ extended: false }));

app.use(function(req, res, next) {
    if(req.path === '/block') {
        let result = receiveBlock(req.body.block);
        res.sendStatus(200);
        if (result && !result.alreadyExists) {
            postBlock(result.block);
        }
    } else if (req.path.startsWith('/getblocks')) {
        let afterBlock = req.url.split('?after=')[1];
        let descendants = blockchain.getDescendants(afterBlock);
        res.statusCode = 200;
        res.setHeader('Content-Type', 'text/plain');
        descendants.forEach((block) => {
            res.write(block.blockString() + '\n');
        });
        res.end();
    } else {
        next();
    }
});

let postBlock = (block) => {
    // setTimeout(() => {
        config.peers.forEach((peer) => {
            axios.post(peer + "/block", "block=" + encodeURIComponent(block.blockString()), {headers: {"Content-Type": "application/x-www-form-urlencoded"}})
                .catch((error) => {
                });
        });
    // }, 3000);
};

app.listen(config.port, () => {
    console.log("Server Started");
});

