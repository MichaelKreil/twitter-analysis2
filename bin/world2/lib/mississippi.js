"use strict"

const colors = require('colors');
const fs = require('fs');
const miss = require('mississippi');
const Queue = require('./queue.js');
const zlib = require('zlib');

module.exports = miss;



miss.readGzipLines = function readGzipLines(filename) {
	var buffer = '';

	return miss.pipe(
		fs.createReadStream(filename),
		zlib.Gunzip(),
		miss.through.obj(
			function (chunk, enc, cb) {
				buffer += chunk.toString('utf8');

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
		),
		err => {
			if (err) throw Error(err);
		}
	)
}



miss.writeGzipLines = function writeGzipLines(filename) {
	var stream = miss.through.obj(
		(data, enc, cb) => cb(null, data+'\n'),
		cb => {
			console.log(colors.green.bold('Finished writing ... but still compressing'));
			cb(null)
		}
	)

	var compressorStream = zlib.Gzip({level:1});

	var tempFilename = (new Date()).toISOString().replace(/\..*/,'').replace(/[^0-9]/g,'-')+'_'+Math.random().toFixed(6).substr(2)+'.tmp.gz';
	var fileStream = fs.createWriteStream(tempFilename);

	stream.pipe(compressorStream).pipe(fileStream);

	fileStream.on('close', () => {
		fs.renameSync(tempFilename, filename);
		console.log(colors.green.bold('Finished writing, compressing, renaming'));
	});

	return stream
}



miss.sink = function sink() {
	return miss.to((data, enc, cb) => cb())
}



miss.mergeId = function merge(stream1, stream2) {
	var queue1 = new Queue();
	var queue2 = new Queue();

	//queue1.on('changed', () => console.log('queue1: '+[queue1.isReadable, queue1.isWritable, queue1.isFinished].join(', ')));
	//queue2.on('changed', () => console.log('queue2: '+[queue2.isReadable, queue2.isWritable, queue2.isFinished].join(', ')));

	miss.each(
		stream1,
		function entry(data, cb) {
			if (queue1.push(data.toString('utf8'))) {
				cb();
			} else {
				queue1.once('writable', () => cb());
			}
		},
		function flush() {
			queue1.end();
		}
	)

	miss.each(
		stream2,
		function entry(data, cb) {
			if (queue2.push(data.toString('utf8'))) {
				cb();
			} else {
				queue2.once('writable', () => cb());
			}
		},
		function flush() {
			queue2.end();
		}
	)

	return miss.from.obj(read);

	function read(size, next) {
		fetch();

		function fetch() {
			if (queue1.isFinished && queue2.isFinished) return next(null, null);

			if (!queue1.isFinished && !queue1.isReadable) return queue1.once('changed', fetch);
			if (!queue2.isFinished && !queue2.isReadable) return queue2.once('changed', fetch);

			//console.log(queue1.id, queue1.line, queue2.id, queue2.line);

			if (queue2.isFinished || (queue1.id < queue2.id)) {
				return finish(
					[queue1.id, queue1.line, null, null],
					() => {
						queue1.shift();
					}
				)
			}
			if (queue1.isFinished || (queue1.id > queue2.id)) {
				return finish(
					[null, null, queue2.id, queue2.line],
					() => {
						queue2.shift();
					}
				)
			}
			if (queue1.id === queue2.id) {
				return finish(
					[queue1.id, queue1.line, queue2.id, queue2.line],
					() => {
						queue1.shift();
						queue2.shift();
					}
				)
			}
			throw Error();

			function finish(data, cb) {
				cb();
				next(null, data);
			}
		}
	}
}


