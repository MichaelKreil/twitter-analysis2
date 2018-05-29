"use strict"

const colors = require('colors');
const fs = require('fs');
const lzma = require('lzma-native');
const miss = require('mississippi');

module.exports = Writer;

function Writer(filename) {
	var stream = miss.through.obj(
		(data, enc, cb) => cb(null, data+'\n'),
		cb => {
			console.log(colors.green.bold('Finished writing ... but still compressing'));
			cb(null)
		}
	)

	// Prepare Compressor
	var compressorStream = lzma.createCompressor({
		check: lzma.CHECK_NONE,
		preset: 9/* | lzma.PRESET_EXTREME*/,
		synchronous: false,
		//threads: 1,
	});

	var tempFilename = (new Date()).toISOString().replace(/\..*/,'').replace(/[^0-9]/g,'-')+'_'+Math.random().toFixed(6).substr(2)+'.tmp.xz';
	var fileStream = fs.createWriteStream(tempFilename);

	stream.pipe(compressorStream).pipe(fileStream);

	fileStream.on('close', () => {
		fs.renameSync(tempFilename, filename);
		console.log(colors.green.bold('Finished writing, compressing, renaming'));
	});

	return stream
}