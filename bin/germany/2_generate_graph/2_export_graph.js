"use strict";

const fs = require('fs');
const level = require('levelup');

var edgeDB = level('_edges', { keyEncoding:'ascii', valueEncoding:'json' });
var node = 0;

saveStream();

function saveStream() {
	var maxCount = 1024*1024;
	var array = new Uint32Array(maxCount*3);
	var count = 0;
	var file = fs.openSync('../data/g_edges.bin', 'w');


	edgeDB.createValueStream()
		.on('data', function (data) {
			array[count*3+0] = data.edge[0];
			array[count*3+1] = data.edge[1];
			array[count*3+2] = data.value;
			count++;
			flush(false);
		})
		.on('error', function (err) {
			console.log('Oh my!', err)
		})
		.on('close', close)
		.on('end', close);

	process.on('exit', close);

	function flush(force) {
		if (!force && (count < maxCount)) return;
		var buf = Buffer.from(array.buffer);
		buf = buf.slice(0, count*12);
		var response = fs.writeSync(file, buf, 0, buf.length);
		fs.fsyncSync(file);
		console.log('write '+buf.length+' - '+response);
		
		count = 0;
		//buffer = new Uint32Array(maxCount*3);
	}

	function close() {
		if (!file) return;
		flush(true);
		fs.closeSync(file);
		file = false;
		console.log('Stream closed')
	}
}
