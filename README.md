## A test blockchain

### How to run
* Install nodejs from https://nodejs.org/en/download/
* Install dependencies ```bctest>npm install```
* Start a node ```bctest>node main.js --port=3000 --peers="http://localhost:3001" --text=node1```
* Start another node ```bctest>node main.js --port=3001 --peers="http://localhost:3000" --text=node2```

To simulate latency in peer-to-peer network, block relay is delayed by 3secs by default. Increasing the delay by setting ```--delay``` (in milliseconds) will increase the probability of chain reorgs.

### Features
* Does nothing useful :)
* Proof-of-Work to secure the chain
* Nodes reorg to move to the longest chain
* Difficulty retarget

### Todo
* Nodes reorg to move to a chain with most work (not longest)
