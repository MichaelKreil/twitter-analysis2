"use strict";

const fs = require('fs');
const zlib = require('zlib');
const Canvas = require('canvas');
const size = 2048*1;

var dataFolder = '../../../data/germany/'

draw('fakenews');
process.exit();

var postfix = (process.argv[2] || '').trim();
console.log(postfix);

if (postfix.indexOf('-') >= 0) {
	postfix = postfix.split('-');
	for (var i = parseInt(postfix[0],10); i <= parseInt(postfix[1],10); i++) draw(''+i);
} if (postfix !== '') {
	draw(postfix);
} else {
	var entries = new Map();
	fs.readdirSync('.').forEach(f => {
		var match;
		if (match = f.match(/^graph(.*)\.png$/)) get().graph = true;
		if (match = f.match(/^positions(.*)X\.bin$/)) get().x = true;
		if (match = f.match(/^positions(.*)Y\.bin$/)) get().y = true;
		function get() {
			var id = match[1];
			if (!entries.has(id)) entries.set(id,{id:id});
			return entries.get(id);
		}
	});
	entries = Array.from(entries.values());
	entries.forEach(e => {
		if (e.graph) return;
		if (!e.x) return;
		if (!e.y) return;
		draw(e.id);
	})
}

function draw(postfix) {
	var nodeCount, nodeX, nodeY;

	initNodes();

	var x0 = 1e20, y0 = 1e20, x1 = -1e20, y1 = -1e20;

	for (var i = 0; i < nodeCount; i++) {
		//console.log(nodeX[i], nodeY[i]);
		if (x0 > nodeX[i]) x0 = nodeX[i];
		if (y0 > nodeY[i]) y0 = nodeY[i];
		if (x1 < nodeX[i]) x1 = nodeX[i];
		if (y1 < nodeY[i]) y1 = nodeY[i];
	}

	var xc = (x1+x0)/2, yc = (y1+y0)/2, zoom = 0.9*size/Math.max(x1-x0,y1-y0);
	console.log(x0,x1,y0,y1);

	var canvas = new Canvas(size, size), ctx = canvas.getContext('2d');

	ctx.fillStyle = '#fff';
	ctx.fillRect(0,0,size,size);

	ctx.fillStyle = 'rgba(0,0,0,0.1)';

	for (var i = 0; i < nodeCount; i++) {
		ctx.beginPath();
		ctx.arc(
			(nodeX[i]-xc)*zoom + size/2 + (Math.random()-0.5)*30,
			(nodeY[i]-yc)*zoom + size/2 + (Math.random()-0.5)*30,
			2,
			0,
			2*Math.PI
		)
		ctx.fill();
	}

	fs.writeFileSync(dataFolder+'graph'+postfix+'.png', canvas.toBuffer());

	function initNodes() {
		console.log('init nodes for "'+postfix+'"');

		var data = zlib.gunzipSync(fs.readFileSync(dataFolder+'g_node2index.bin.gz'));
		nodeCount = data.length/4;
		nodeX = getFloatArray(nodeCount);
		nodeY = getFloatArray(nodeCount);

		zlib.gunzipSync(fs.readFileSync(dataFolder+'positions'+postfix+'X.bin.gz')).copy(Buffer.from(nodeX.buffer));
		zlib.gunzipSync(fs.readFileSync(dataFolder+'positions'+postfix+'Y.bin.gz')).copy(Buffer.from(nodeY.buffer));

		console.log('   node count: '+nodeCount);
	}

	function getFloatArray(count) {
		var array = new Float64Array(count);
		array.randomize = (s) => { array.forEach((v,i) => array[i] = (Math.random()*2-1)*s) }
		return array;
	}
}