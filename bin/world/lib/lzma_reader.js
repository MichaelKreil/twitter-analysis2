"use strict"

const fs = require('fs');
const colors = require('colors');
const lzma = require('lzma-native');
const miss = require('mississippi');
const Progress = require('./progress.js');

module.exports = function (filename) {

	var fileStream = fs.createReadStream(filename);

	var decompressor = lzma.createDecompressor();

	var buffer = '';

	var lineSplitter = miss.through.obj(
		function (chunk, enc, cb) {
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
			cb();
		}
	)


	console.log(colors.green.bold('Reading '+filename.split('/').slice(-5).join('/')));
	var filePos = 0, progress = new Progress(1e30);
	getFilesize(size => progress.setMaximum(size));

	var lineCounter = miss.through.obj(
		function (chunk, enc, cb) {
			filePos += chunk.length+1;
			progress.set(filePos);

			cb(null, chunk);
		},
		function (cb) {
			progress.end();
			console.log(colors.green.bold('Finished reading '+filename.split('/').slice(-5).join('/')));
			cb();
		}
	)

	var stream = miss.pipeline(fileStream, decompressor, lineSplitter, lineCounter);
	return stream;

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