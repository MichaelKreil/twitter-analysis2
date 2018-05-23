"use strict"

const fs = require('fs');
const colors = require('colors');
const lzma = require('lzma-native');
const miss = require('mississippi');
const Progress = require('./progress.js');

module.exports = function (filename) {

	var fileStream = fs.createReadStream(filename);

	var decompressor = lzma.createDecompressor({threads:1});

	var buffer = '';
	var filePos = 0;

	console.log(colors.green.bold('Reading '+filename.split('/').slice(-5).join('/')));
	var progress = new Progress(1e30);
	getFilesize(size => progress.setMaximum(size));

	var lineSplitter = miss.through.obj(
		function (chunk, enc, cb) {
			filePos += chunk.length;
			progress.set(filePos);

			buffer += chunk.toString(enc);

			var lines = buffer.split('\n');
			buffer = lines.pop();

			lines.forEach(line => {
				if (line) this.push(line);
			})

			cb();
		},
		function (cb) {
			if (buffer) this.push(buffer);
			progress.end();
			cb();
		}
	)

	fileStream.pipe(decompressor).pipe(lineSplitter);

	return lineSplitter;

	function getFilesize(cb) {
		fs.open(filename, 'r', (err, fd) => {
			if (err) throw err;
			lzma.parseFileIndexFD(fd, (err, info) => {
				if (err) throw err;
				fs.close(fd, (err) => {
					if (err) throw err;
					cb(info.uncompressedSize);
				});
			});
		});
	}
}