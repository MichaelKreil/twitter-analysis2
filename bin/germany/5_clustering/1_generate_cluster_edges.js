"use strict";

const fs = require('fs');

const step = 0;

var rawNodeCount, nodeCount, rawNode2Node;

initNodes();
initEdges();

function initNodes() {
	console.log('init nodes');

	var data = fs.readFileSync('../data/g_node2index.bin');
	rawNodeCount = data.length/4;
	rawNode2Node = new Uint32Array(rawNodeCount);
	console.log('   raw node count: '+rawNodeCount);

	if (step === 0) {
		nodeCount = rawNodeCount;
		for (var i = 0; i < rawNodeCount; i++) rawNode2Node[i] = i;
	} else {
		throw Error('missing load script')
	}

	console.log('   node count: '+nodeCount);
}

function initEdges() {
	console.log('init edges');

	console.log('   read file');

	var data = fs.readFileSync('../data/g_edges.bin');

	var edgeCount = data.length/12;
	console.log('   edge count: '+edgeCount);
	
	console.log('   init data structure');

	var list = new Uint32Array(edgeCount*3);
	data.copy(Buffer.from(list.buffer));

	var weightLookup = [0,1,1,5];

	var edgeLookup = new EdgeLookup(Math.ceil(edgeCount/nodeCount));

	console.log('   copy data');

	var time = Date.now();

	for (var i = 0; i < edgeCount; i++) {
		if ((i % 2e6 === 0) && i) {
			console.log('      '+(100*i/edgeCount).toFixed(1)+' % - speed '+(1000*i/(Date.now()-time)).toFixed(0)+' edges/sec')
		}

		var node1  = rawNode2Node[list[i*3+0]];
		var node2  = rawNode2Node[list[i*3+1]];
		var weight = weightLookup[list[i*3+2]];

		if ((1566490 <= node1) && (node1 <= 1566493)) console.log(node1,node2,weight,list[i*3+0],list[i*3+1],list[i*3+2]);
		if ((1566490 <= node2) && (node2 <= 1566493)) console.log(node1,node2,weight,list[i*3+0],list[i*3+1],list[i*3+2]);

		if (!weight) continue;

		edgeLookup.add(node1, node2, weight);
		edgeLookup.add(node2, node1, weight);
	}

	console.log('   save nodeEdgesTo');
	edgeLookup.saveNodeEdges('edges'+step+'.bin');
}

function EdgeLookup(minSize) {
	var entries = [];

	function add(n1,n2,w) {
		if (!entries[n1]) entries[n1] = {count:0, data:new Uint32Array(minSize)};
		var entry = entries[n1];
		if (entry.count*2 >= entry.data.length) {
			// double size
			var data = new Uint32Array(entry.data.length*2);
			data.set(entry.data);
			entry.data = data;
		}
		entry.data[entry.count*2+0] = n2;
		entry.data[entry.count*2+1] = w;
		entry.count++;
	}

	function saveNodeEdges(filename) {
		var file = fs.openSync(filename, 'w');

		var maxSize = 1e7;
		var buffer = new Uint32Array(maxSize);
		var writePos = 0;

		//console.log(1566490, entries[1566490]);
		//console.log(1566491, entries[1566491]);
		//console.log(1566492, entries[1566492]);
		//console.log(1566493, entries[1566493]);

		entries.map((entry, index) => {
			var lookup = new Map();
			for (var i = 0; i < entry.count; i++) {
				var node2  = entry.data[i*2+0];
				var weight = entry.data[i*2+1];
				if (lookup.has(node2)) weight += lookup.get(node2);
				lookup.set(node2, weight);
			}

			lookup = Array.from(lookup.entries());
			lookup.sort((a,b) => a[0]-b[0]);

			buffer[writePos++] = index;
			buffer[writePos++] = lookup.length;
			flush();

			lookup.forEach((luEntry, luIndex) => {
				buffer[writePos++] = luEntry[0];
				buffer[writePos++] = luEntry[1];
				flush();
			});
		});
		flush(true);
		fs.closeSync(file);

		function flush(force) {
			if (force || (writePos >= maxSize)) {
				fs.writeSync(file, Buffer.from(buffer.buffer).slice(0,writePos*4));
				writePos = 0;
			}
		}
	}


	return {
		add:add,
		saveNodeEdges:saveNodeEdges
	}
}
