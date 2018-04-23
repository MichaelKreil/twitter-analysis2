"use strict"

const fs = require('fs');
const lzma = require('lzma-native');

module.exports = Stream;

function Stream(filename) {
	var stream = fs.createWriteStream(filename);

	if (filename.endsWith('.xz')) {
		// Prepare Compressor
		var compressor = lzma.createCompressor({
			check: lzma.CHECK_NONE,
			preset: 9/* | lzma.PRESET_EXTREME*/,
			synchronous: false,
			threads: 1,
		});
		compressor.pipe(stream);
		stream = compressor;
	}

	var buffer = [];
	var bufferSize = 0;

	function write(data, cb) {
		if (!Buffer.isBuffer(data)) data = Buffer.from(data);
		buffer.push(data);
		bufferSize += data.length;
		if (bufferSize > 1024*1024) {
			flush(cb)
		} else {
			setTimeout(cb, 0);
		}
	}

	function close(cb) {
		flush(() => {
			stream.end(cb)
		})
	}

	function flush(cb) {
		buffer = Buffer.concat(buffer);
		stream.write(buffer, cb);
		buffer = [];
		bufferSize = 0;
	}

	return {
		write:write,
		close:close,
	}
}