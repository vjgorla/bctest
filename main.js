const express = require("express");
const bodyParser = require('body-parser');
const bigInt = require("big-integer");
const yargs = require("yargs");
const axios = require("axios");
const ip = require("ip");
const BC = require('./blockchain');
const utils = require('./utils');

const config = {
    port: yargs.argv.port || 3000,
    peers: (yargs.argv.peers ? yargs.argv.peers.split(',') : []),
    text: yargs.argv.text || 'bctest',
    delay: yargs.argv.delay || 3000,
};

let blockchain = new BC.Blockchain();
const app = express();
let nonce = bigInt.zero;

if (config.peers.length > 0) {
    axios.get(config.peers[0] + "/getblocks?ancestor=" + BC.ROOT_HASH).then((result) => {
        let blocksStr = result.data;
        if (blocksStr) {
            blocksStr.split('\n').forEach((blockStr) => {
                if (blockStr) {
                    processBlock(blockStr);
                }
            });
        }
    }).catch((error) => {});
    config.peers.forEach((peer) => {
        axios.post(peer + "/addpeer", "peer=" + encodeURIComponent("http://" + ip.address() + ":" + config.port),
            {headers: {"Content-Type": "application/x-www-form-urlencoded"}})
        .catch((error) => {});
    });
}

setInterval(() => {
    for(let i = 0; i < 1000; i++) {
        nonce = nonce.plus(bigInt.one);
        let block = new BC.Block(blockchain.topBlockHash, nonce.toString(), new Date().getTime(), config.text);
        let blockHash = utils.digestStrToHex(block.blockContentsString());
        if (utils.hexToBigInt(blockHash).lesserOrEquals(blockchain.currentDifficulty)) {
            block.blockHash = blockHash;
            blockchain.addBlock(block, true);
            relayBlock(block, config.delay);
        }
    }
}, 50);

let processBlock = (blockStr, peer, onDone) => {
    let blockElms = blockStr.split(':');
    if (blockElms.length != 5) {
        console.error('Invalid number of elements in block');
        return;
    }
    let block = new BC.Block(blockElms[1], blockElms[2], blockElms[3], blockElms[4]);
    block.blockHash = blockElms[0];
    let result = blockchain.addBlock(block, false);
    if (result) {
        if (!result.alreadyExists) {
            if (result.isOrphan) {
                axios.get(peer + "/getancestor?descendant=" + block.blockHash).then((_result) => {
                    let ancestorBlocksStr = _result.data;
                    if (ancestorBlocksStr) {
                        processBlock(ancestorBlocksStr, peer, (_result) => {
                            let nresult = blockchain.addBlock(block, false);
                            if (nresult.valid && onDone) {
                                nresult.block = block;
                                onDone(nresult);
                            }
                        });
                    }
                }).catch((error) => {});
            } else if (result.valid && onDone) {
                result.block = block;
                onDone(result);
            }
        }
    }
};

app.use(bodyParser.urlencoded({ extended: false }));

app.use(function(req, res, next) {
    if(req.path.startsWith('/block')) {
        let peer = decodeURIComponent(req.url.split('?peer=')[1]);
        processBlock(req.body.block, peer, (result) => {
            relayBlock(result.block, 0);
        });
        res.sendStatus(200);
    } else if (req.path.startsWith('/getblocks')) {
        let ancestor = req.url.split('?ancestor=')[1];
        ancestor = ancestor || BC.ROOT_HASH;
        let descendants = blockchain.getDescendants(ancestor);
        res.statusCode = 200;
        res.setHeader('Content-Type', 'text/plain');
        descendants.forEach((block) => {
            res.write(block.blockString() + '\n');
        });
        res.end();
    } else if (req.path.startsWith('/getancestor')) {
        let descendant = req.url.split('?descendant=')[1];
        let ancestor = blockchain.getAncestor(descendant);
        res.statusCode = 200;
        res.setHeader('Content-Type', 'text/plain');
        if (ancestor) {
            res.write(ancestor.blockString());
        }
        res.end();
    } else if (req.path.startsWith('/addpeer')) {
        if (!config.peers.includes(req.body.peer)) {
            config.peers.push(req.body.peer);
            console.log('peer ' + req.body.peer + ' connected');
        }
    } else {
        next();
    }
});

let relayBlock = (block, delay) => {
    setTimeout(() => {
        config.peers.forEach((peer) => {
            axios.post(peer + "/block?peer=" + encodeURIComponent("http://" + ip.address() + ":" + config.port),
                "block=" + encodeURIComponent(block.blockString()),
            {headers: {"Content-Type": "application/x-www-form-urlencoded"}})
            .catch((error) => {});
        });
    }, delay);
};

app.listen(config.port, () => {
    console.log("Server Started");
});
