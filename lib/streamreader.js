"use strict"

const fs = require('fs');
const lzma = require('lzma-native');

module.exports = Stream;

function Stream(filename) {
	var filePos = 0;
	var fileSize = fs.statSync(filename).size;

	var stream = fs.createReadStream(filename);
	stream.on('data', chunk => {
		filePos += chunk.length;
	})

	if (filename.endsWith('.xz')) {
		var decompressor = lzma.createDecompressor();
		stream.pipe(decompressor);
		stream = decompressor;
	}

	var buffer = [];
	var onLine = [], onEnd = [];

	stream.on('data', chunk => {
		buffer.push(chunk);
		if (buffer.length > 100) flush();
	})
	stream.on('end', () => {
		flush()
		onEnd.forEach(cb => cb());
	})

	function flush() {
		buffer = Buffer.concat(buffer);
		var i0 = 0;

		while (true) {
			var i1 = buffer.indexOf(10, i0);
			if (i1 < 0) break;

			var line = buffer.slice(i0, i1);
			i0 = i1+1;

			line = line.toString('utf8');
			onLine.forEach(cb => cb(line));
		}

		buffer = [buffer.slice(i0)];
	}

	return {
		onLine: cb => onLine.push(cb),
		onEnd:  cb => onEnd.push(cb),
		getProgress: () => filePos/fileSize,
	}
}