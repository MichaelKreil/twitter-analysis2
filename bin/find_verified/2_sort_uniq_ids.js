"use strict"

// sort -nuo 3_ids_sorted.txt 2_ids.txt
// split -l 10000000 3_ids_sorted.txt 3_ids_segment

const fs = require('fs');
const colors = require('colors');


var input  = 'data/2_ids.txt';
var output = 'data/3_ids_sorted.txt';

var list = new Sorter(fs.readFileSync(input));

var fd = fs.openSync(output, 'w');
list(fd);
fs.closeSync(fd);



function Sorter(buffer) {
	var hashLevels = [
		id => id.length,
		id => parseInt(id[0], 10),
		id => parseInt(id[1], 10),
		id => parseInt(id[2], 10),
		id => parseInt(id[3], 10),
		id => parseInt(id[4], 10),
		id => parseInt(id[5], 10)
	]

	return new Block(buffer, 0, '>');

	function Block(buffer, level, name) {
		console.log(colors.grey('create '+name));

		var hasher = hashLevels[level];

		if (buffer.length < 20*1024*1024) return simpleWrite;
		return splitWrite;

		function simpleWrite(fd) {
			console.log(colors.green.bold('write  '+name));

			buffer = buffer.toString('ascii');
			buffer = buffer.split('\n');
			
			while (buffer[buffer.length-1].length < 1) buffer.pop();

			buffer.sort((a,b) => {
				if (a.length !== b.length) return a.length - b.length;
				if (a === b) return 0;
				return a < b ? -1 : 1;
			})

			var lastId = 'blödiblöd';
			buffer = buffer.filter(id => {
				if (id === lastId) return false;
				lastId = id;
				return true;
			})

			buffer = buffer.join('\n')+'\n';
			fs.writeSync(fd, buffer);
			buffer = undefined;
		}

		function splitWrite(fd) {
			console.log(colors.yellow('split  '+name));

			var subBlocks = new Map();

			var i0 = 0, i1;
			do {
				i1 = buffer.indexOf(10, i0);
				if (i1 < 0) break;

				var id = buffer.slice(i0, i1).toString('ascii');
				i0 = i1+1;

				if (id.length === 0) continue;

				var hash = hasher(id);

				if (!subBlocks.has(hash)) subBlocks.set(hash, {buffer:Buffer.alloc(0), cache:[]});
				
				var subBlock = subBlocks.get(hash);
				subBlock.cache.push(id);
				if (subBlock.cache.length > 1024*1024) consolidateBlock(subBlock);
			} while (true);

			buffer = undefined;

			Array.from(subBlocks.values()).forEach(block => consolidateBlock(block));

			subBlocks = Array.from(subBlocks.entries());
			subBlocks.sort((a,b) => a[0]-b[0]);

			subBlocks = subBlocks.map(entry => {
				consolidateBlock(entry[1]);
				return new Block(entry[1].buffer, level+1, name+' - '+entry[0]);
			});

			subBlocks.forEach(block => block(fd));

			function consolidateBlock(block) {
				block.buffer = Buffer.concat([block.buffer, Buffer.from(block.cache.join('\n')+'\n', 'ascii')]);
				block.cache = [];
			}
		}
	}
}