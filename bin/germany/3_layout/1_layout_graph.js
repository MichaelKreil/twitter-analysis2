"use strict";

const fs = require('fs');

const theta = 0.1;

var nodeCount, nodeX, nodeY, nodeFX, nodeFY, nodeMass;
var edgeCount, edge0, edge1, edgeW;

initNodes();
initEdges();

for (var i = 0; i <= 1000; i++) {
	console.log('interation '+i)
	resetForces();
	calcRepulsion();
	calcEdges();
	applyForces();
	savePositions(i);
}

function savePositions(index) {
	if ((index >  10) && (index %  2 !== 0)) return;
	if ((index >  40) && (index % 10 !== 0)) return;
	if ((index > 160) && (index % 20 !== 0)) return;
	if ((index > 640) && (index % 40 !== 0)) return;

	console.log('   save positions '+index);
	fs.writeFileSync('positions'+i+'X.bin', Buffer.from(nodeX.buffer));
	fs.writeFileSync('positions'+i+'Y.bin', Buffer.from(nodeY.buffer));
}

function applyForces() {
	console.log('   apply forces');
	for (var i = 0; i < nodeCount; i++) {
		nodeX[i] += nodeFX[i]/nodeMass[i];
		nodeY[i] += nodeFY[i]/nodeMass[i];
	}
}

function calcEdges() {
	console.log('   calc edges');
	for (var i = 0; i < edgeCount; i++) {
		var index1 = edge0[i];
		var index2 = edge1[i];

		var w = edgeW[i]/2;

		var dx = nodeX[index1] - nodeX[index2];
		var dy = nodeY[index1] - nodeY[index2];

		var r = Math.sqrt(dx*dx + dy*dy);
		w = w/(Math.sqrt(r)+1)*100;

		nodeFX[index1] -= dx*w;
		nodeFY[index1] -= dy*w;
		nodeFX[index2] += dx*w;
		nodeFY[index2] += dy*w;
	}
}

function calcRepulsion(fast) {
	console.log('   calc repulsion');

	var list = new Array(nodeCount);
	for (var i = 0; i < nodeCount; i++) list[i] = i;

	console.log('      get tree');
	var tree = getTree(list);

	if (fast) {
		console.log('      calc repulsion recursively');
		recRepulsion(tree, tree);

		console.log('      calc forces');
		applyForcesRec(tree, 0, 0);
	} else {
		console.log('      calc barnes hut');
		barnesHutRepulsion(list, tree);
	}

	function barnesHutRepulsion(list, tree) {
		list.forEach(index1 => {
			var x1 = nodeX[index1];
			var y1 = nodeY[index1];
			calcForcesRec(tree);

			// branch: mass,x,y,r,child1,child2,force
			// leaf:   mass,index,force

			function calcForcesRec(node2) {
				if (node2.length === 7) { //branch
					var dx = x1 - node2[1];
					var dy = y1 - node2[2];
					var d2 = dx*dx + dy*dy;
					var d = Math.sqrt(d2);

					if (d*theta > node2[3]) {
						// genau genug -> kräfte aktualisieren
						nodeFX[index1] += dx*node2[0]*nodeMass[index1]/(d2+0.1);
						nodeFY[index1] += dy*node2[0]*nodeMass[index1]/(d2+0.1);
					} else {
						// zu ungenau -> verfeinern
						calcForcesRec(node2[4]);
						calcForcesRec(node2[5]);
					}
					return;
				}

				if (node2.length === 3) { //leaf
					if (index1 === node2[1]) return; // gleicher knoten -> ignorieren

					var dx = x1 - nodeX[node2[1]];
					var dy = y1 - nodeY[node2[1]];
					var d2 = dx*dx + dy*dy;

					nodeFX[index1] += dx*node2[0]*nodeMass[index1]/(d2+0.1);
					nodeFY[index1] += dy*node2[0]*nodeMass[index1]/(d2+0.1);
					return;
				}

				throw Error(node1.length+' '+node2.length);

				function updateForce(force, mass, dx, dy) {
					var r2 = dx*dx + dy*dy + 0.1;
					force[0] += dx*mass/r2;
					force[1] += dy*mass/r2;

				}
				throw Error();
			}
		})
	}



	function applyForcesRec(node, fx, fy) {
		if (node.length === 7) {
			fx += node[6][0];
			fy += node[6][1];
			applyForcesRec(node[4], fx, fy);
			applyForcesRec(node[5], fx, fy);
			return;
		}
		if (node.length === 3) {
			var i = node[1];
			nodeFX[i] += (node[2][0] + fx)*nodeMass[i];
			nodeFY[i] += (node[2][1] + fy)*nodeMass[i];
			return;
		}
		throw Error();
	}

	function recRepulsion(node1, node2) {
		if (node1.length > node2.length) {
			var t = node1; node1 = node2; node2 = t;
		}

		var nodeX1, nodeY1, nodeR1;
		if ((node1.length === 7) && (node2.length === 7)) {
			var dx = node1[1]-node2[1];
			var dy = node1[2]-node2[2];
			var d = Math.sqrt(dx*dx + dy*dy);
			if (d*theta > node1[3]+node2[3]) {
				// genau genug -> kräfte aktualisieren
				updateForce(node1[6], node2[0],  dx,  dy);
				updateForce(node2[6], node1[0], -dx, -dy);
			} else {
				// zu ungenau -> verfeinern
				recRepulsion(node1[4], node2[4]);
				recRepulsion(node1[5], node2[4]);
				if (node1 !== node2) recRepulsion(node1[4], node2[5]);
				recRepulsion(node1[5], node2[5]);
			}
			return;
		}

		if ((node1.length === 3) && (node2.length === 7)) {
			var dx = nodeX[node1[1]]-node2[1];
			var dy = nodeY[node1[1]]-node2[2];
			var d = Math.sqrt(dx*dx + dy*dy);
			if (d*theta > node2[3]) {
				// genau genug -> kräfte aktualisieren
				updateForce(node1[2], node2[0],  dx,  dy);
				updateForce(node2[6], node1[0], -dx, -dy);
			} else {
				// zu ungenau -> verfeinern
				recRepulsion(node1, node2[4]);
				recRepulsion(node1, node2[5]);
			}
			return;
		}

		if ((node1.length === 3) && (node2.length === 3)) {
			if (node1 === node2) return; // gleicher knoten -> ignorieren
			var dx = nodeX[node1[1]] - nodeX[node2[1]];
			var dy = nodeY[node1[1]] - nodeY[node2[1]];
			updateForce(node1[2], node2[0],  dx,  dy);
			updateForce(node2[2], node1[0], -dx, -dy);
			return;
		}
		throw Error(node1.length+' '+node2.length);

		function updateForce(force, mass, dx, dy) {
			var r2 = dx*dx + dy*dy + 0.1;
			force[0] += dx*mass/r2;
			force[1] += dy*mass/r2;
		}
	}

	function getTree(list) {
		// branch: mass,x,y,r,child1,child2,force
		// leaf:   mass,index,force
		if (list.length < 2) return [nodeMass[list[0]], list[0], [0,0]];

		var bbox = [1e20, 1e20, -1e20, -1e20];
		list.forEach(index => {
			var x = nodeX[index];
			var y = nodeY[index];
			if (bbox[0] > x) bbox[0] = x;
			if (bbox[1] > y) bbox[1] = y;
			if (bbox[2] < x) bbox[2] = x;
			if (bbox[3] < y) bbox[3] = y;
		})

		var list0, list1;
		var result = [
			(bbox[0]+bbox[2])/2,
			(bbox[1]+bbox[3])/2,
			Math.sqrt(sqr(bbox[2]-bbox[0]) + sqr(bbox[3]-bbox[1]))
		]

		if (bbox[2]-bbox[0] > bbox[3]-bbox[1]) {
			// wider
			var v = (bbox[0]+bbox[2])/2;
			list0 = list.filter(index => nodeX[index] <  v);
			list1 = list.filter(index => nodeX[index] >= v);
		} else {
			// higher
			var v = (bbox[1]+bbox[3])/2;
			list0 = list.filter(index => nodeY[index] <  v);
			list1 = list.filter(index => nodeY[index] >= v);
		}

		result.push(getTree(list0));
		result.push(getTree(list1));
		result.push([0,0]);
		result.unshift(result[3][0]+result[4][0]);

		return result
	}
}

function resetForces() {
	console.log('   reset forces');

	for (var i = 0; i < nodeCount; i++) {
		var r = Math.sqrt(nodeX[i]*nodeX[i] + nodeY[i]*nodeY[i])*nodeMass[i]*1e-7;
		nodeFX[i] = nodeFX[i]*0.8 + (Math.random()-0.5)*1e-3 - nodeX[i]*r;
		nodeFY[i] = nodeFY[i]*0.8 + (Math.random()-0.5)*1e-3 - nodeY[i]*r;
	}
}



function initNodes() {
	console.log('init nodes');

	var data = fs.readFileSync('../data/g_node2index.bin');
	nodeCount = data.length/4;
	nodeX    = getFloatArray(nodeCount);
	nodeY    = getFloatArray(nodeCount);

	if (fs.existsSync('../data/positionsX.bin')) {
		fs.readFileSync('../data/positionsX.bin').copy(Buffer.from(nodeX.buffer));
	} else nodeX.randomize(300);

	if (fs.existsSync('../data/positionsY.bin')) {
		fs.readFileSync('../data/positionsY.bin').copy(Buffer.from(nodeY.buffer));
	} else nodeY.randomize(300);

	nodeFX   = getFloatArray(nodeCount);
	nodeFY   = getFloatArray(nodeCount);
	nodeMass = getFloatArray(nodeCount).fill(1);

	console.log('   node count: '+nodeCount);
}

function initEdges() {
	console.log('init edges');

	console.log('   read file');

	var data = fs.readFileSync('../data/g_edges.bin');
	
	console.log('   init data structure');

	edgeCount  = data.length/12;
	edge0 = getIntArray(edgeCount);
	edge1 = getIntArray(edgeCount);
	edgeW = getFloatArray(edgeCount);

	var list = new Uint32Array(edgeCount*3);
	data.copy(Buffer.from(list.buffer));

	var weightLookup = [0,1,1,5];

	console.log('   copy data');

	for (var i = 0; i < edgeCount; i++) {
		var weight = weightLookup[list[i*3+2]];
		edge0[i] = list[i*3+0];
		edge1[i] = list[i*3+1];
		edgeW[i] = weight;
		nodeMass[edge0[i]] += weight;
		nodeMass[edge1[i]] += weight;
	}

	console.log('   edge count: '+edgeCount);
}

function getFloatArray(count) {
	var array = new Float64Array(count);
	array.randomize = (s) => { array.forEach((v,i) => array[i] = (Math.random()*2-1)*s) }
	return array;
}

function getIntArray(count) {
	var array = new Uint32Array(count);
	return array;
}

function sqr(v) { return v*v }