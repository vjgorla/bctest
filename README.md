### How to run
* Install node.js from https://nodejs.org/en/download/
* Start a node ```adtest>node main.js --port=3000 --peers="http://localhost:3001" --text=node1```
* Start another node ```adtest>node main.js --port=3001 --peers="http://localhost:3000" --text=node2```

To simulate latency in peer-to-peer network, block relay is delayed by 3secs by default. Increasing the delay by setting ```--delay``` (in milli seconds) will increase the probability of blockchain reorgs.

### Features
* Does nothing useful :)
* Proof of work to secure the chain
* Nodes reorg to move to the longest chain

### TODO
* Difficulty retarget
* Nodes reorg to move to a chain with most work (not longest)
