### How to run
* Install nodejs from https://nodejs.org/en/download/
* Install dependencies ```adtest>npm install```
* Start a node ```adtest>node main.js --port=3000 --peers="http://localhost:3001" --text=node1```
* Start another node ```adtest>node main.js --port=3001 --peers="http://localhost:3000" --text=node2```

To simulate latency in peer-to-peer network, block relay is delayed by 3secs by default. Increasing the delay by setting ```--delay``` (in milli seconds) will increase the probability of chain reorgs.

### Features
* Does nothing useful :)
* Proof of work to secure the chain
* Nodes reorg to move to the longest chain

### Todo
* Difficulty retarget
* Nodes reorg to move to a chain with most work (not longest)
* Share the list peers with newly connected nodes
