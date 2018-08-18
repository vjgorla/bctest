## A minimal blockchain implementation to study game theory behind Nakamoto Consensus
[![Build Status](https://travis-ci.org/vjgorla/bctest.svg?branch=master)](https://travis-ci.org/vjgorla/bctest) [![Coverage Status](https://coveralls.io/repos/github/vjgorla/bctest/badge.svg?branch=master)](https://coveralls.io/github/vjgorla/bctest?branch=master)

Includes a simple peer-to-peer protocol implementation. Nodes use this to coordinate in building the blockchain. Proof-of-work is based on SHA256. Nodes reorg to move to the longest chain when they see one. There is also a difficulty retarget mechanism as part of the consensus rules. 

Blocks are essentially empty, and there is no merkel tree or an in-built token. This purely to study game theory aspects of the consensus protocol and how it achieves byzantine fault tolerence.

### How to run
* Install nodejs from https://nodejs.org/en/download/
* Install dependencies ```bctest>npm install```
* Start a node ```bctest>node main.js --port=3000 --peers="http://localhost:3001" --text=node1```
* Start another node ```bctest>node main.js --port=3001 --peers="http://localhost:3000" --text=node2```

To simulate latency in peer-to-peer network, block relay is delayed by 3secs by default. Increasing the delay by setting ```--delay``` (in milliseconds) will increase the probability of chain reorgs.

### Todo
* Nodes reorg to move to a chain with most work (not longest)
