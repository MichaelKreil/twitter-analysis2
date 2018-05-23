"use strict"

const fs = require('fs');
const lzma = require('lzma-native');

module.exports = Writer;

function Writer(filename) {
	var tempFilename = Math.random().toFixed(16).substr(2)+'.tmp.xz';

	// Prepare Compressor
	var compressor = lzma.createCompressor({
		check: lzma.CHECK_NONE,
		preset: 9/* | lzma.PRESET_EXTREME*/,
		synchronous: false,
		threads: 1,
	});
	var stream = fs.createWriteStream(tempFilename, {highWaterMark: 8*1024*1024});
	compressor.pipe(stream);

	var cache = [];
	var cacheSize = 0;

	function writeLine(line, cbWrite) {
		cache.push(line+'\n');
		cacheSize += line.length;

		if (cacheSize > 1e7) {
			flush(cbWrite)
		} else {
			if (cbWrite) setImmediate(cbWrite);
		}
	}

	// flush data buffer to lzma compressor
	function flush(cbFlush) {
		var buffer = Buffer.from(cache.join(''), 'utf8');

		cache = [];
		cacheSize = 0;

		if (compressor.write(buffer)) {
			if (cbFlush) setImmediate(cbFlush);
		} else {
			compressor.once('drain', cbFlush);
		}
	}

	// when finished: flush data and close file
	function close(cbClose) {
		flush(() => {
			stream.on('close', () => {
				fs.renameSync(tempFilename, filename);
				if (cbClose) setImmediate(cbClose);
			})
			compressor.end();
		})
	}

	return {
		writeLine: writeLine,
		close: close,
	}
}