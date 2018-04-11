"use strict";

const fs = require('fs');

const step = 0;

var nodeCount, nodeEdges;

initNodesAndEdges();
var clusters = new Clusters();

do {
	var changes = false;
	for (var i = 0; i < nodeCount; i++) {
		var oldCluster = clusters.node2cluster(i);
		clusters.removeNode(i);
		var neighborClusters = clusters.getNeighborClusters(i);
		var bestCluster = false, bestGain = -1e100;
		neighborClusters.forEach(c => {
			var gain = clusters.getGain(c);
			if (gain > bestGain) {
				bestGain = gain;
				bestCluster = c;
			}
		})
		clusters.insertNode2Cluster(i, bestCluster);
		changes = changes || (oldCluster !== bestCluster);
	}
} while (changes)

saveClusters();

function Clusters() {
	var node2clusterLookup = new Uint32Array(nodeCount);
	var totN = new Uint32Array(nodeCount);

	for (var i = 0; i < nodeCount; i++) {
		var cluster = {nodes:[i]};
		node2clusterLookup[i] = cluster;

		var wSum = 0;

		var edges = nodeEdges[i];
		if (edges) {
			for (var j = 0; j < edges.length; j+=2) {
				if (edges[j] === i) continue;
				wSum += edges[j+1];
			}
		}
		totN[i] = wSum;
		cluster.tot = wSum;
	}

	function removeNode(nodeId) {
		node2clusterLookup[nodeId] = false;

	}


	return {
		node2cluster:nodeId => node2clusterLookup[nodeId],
		removeNode:removeNode,
		getNeighborClusters:getNeighborClusters,
		getGain:getGain,
		insertNode2Cluster:insertNode2Cluster

	}
}


function initNodesAndEdges() {
	console.log('init nodes and edges');
	
	console.log('   read edges');
	var buffer = fs.readFileSync('edges'+step+'.bin');

	console.log('   init data');
	var data = new Uint32Array(buffer.length/4);

	console.log('   copy data');
	buffer.copy(Buffer.from(data.buffer));

	console.log('   split data');

	nodeEdges = [];
	var i = 0;
	while (i < data.length) {
		var id = data[i];
		var count = data[i+1];
		//console.log(id, count);
		nodeEdges[id] = data.subarray(i+2, i+2 + count*2);
		i = i+2+count*2;
	}
	nodeCount = nodeEdges.length;
}

