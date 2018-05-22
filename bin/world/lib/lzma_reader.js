"use strict"

const fs = require('fs');
const lzma = require('lzma-native');
const async = require('async');

module.exports = Reader;


function getFilesize(filename, cb) {
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

function Reader(filename, cbEntry, cbFinished) {
	getFilesize(filename, filesize => {
		var input = fs.createReadStream(filename);
		var decompressor = lzma.createDecompressor({threads:1, bufsize:1e6});

		input.pipe(decompressor);

		var filepos = 0, oldFilepos = 0;

		var buffer = [];

		decompressor.on('data', chunk => {
			filepos += chunk.length;
			buffer.push(chunk);
			if (buffer.length > 100) {
				decompressor.pause();
				flush(() => {
					oldFilepos = filepos;
					decompressor.resume();
				});
			}
		})
		decompressor.on('end', () => {
			flush(() => {
				cbFinished();
			});
		});

		function flush(cbFlush) {
			buffer = Buffer.concat(buffer);
			var i0 = 0, i1;

			read();

			function read() {
				i1 = buffer.indexOf(10, i0);
				if (i1 < 0) {
					buffer = [buffer.slice(i0)];
					cbFlush();
					return
				}

				var line = buffer.slice(i0, i1);
				i0 = i1+1;

				line = line.toString('utf8');

				cbEntry(line, read, (oldFilepos+i1)/filesize);
			}
		}
	})
}
