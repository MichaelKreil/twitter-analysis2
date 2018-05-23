"use strict"

const fs = require('fs');
const lzma = require('lzma-native');
const miss = require('mississippi');

module.exports = Writer;

function Writer(filename) {
	var stream = miss.through.obj(
		(data, enc, cb) => cb(null, data+'\n'),
		(cb) => cb(null)
	)

	// Prepare Compressor
	var compressorStream = lzma.createCompressor({
		check: lzma.CHECK_NONE,
		preset: 9/* | lzma.PRESET_EXTREME*/,
		synchronous: false,
		threads: 1,
	});

	var tempFilename = Math.random().toFixed(16).substr(2)+'.tmp.xz';
	var fileStream = fs.createWriteStream(tempFilename);

	stream.pipe(compressorStream).pipe(fileStream);

	fileStream.on('close', () => {
		fs.renameSync(tempFilename, filename);
	});

	return stream
}