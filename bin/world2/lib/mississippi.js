"use strict"

const colors = require('colors');
const fs = require('fs');
const miss = require('mississippi');
const Queue = require('./queue.js');
const zlib = require('zlib');

module.exports = miss;

miss.multistream = require('multistream');

miss.readGzipLines = function readGzipLines(filename) {
	var buffer = [], bufferSize = 0;

	return miss.pipe(
		fs.createReadStream(filename),
		zlib.Gunzip(),
		miss.through.obj(
			function (chunk, enc, cb) {
				buffer.push(chunk);
				bufferSize += chunk.length;
				if (bufferSize > 1024*1024) flush(this);
				cb();
			},
			
			function (cb) {
				flush(this);
				cb();
			}
		),
		err => {
			if (err) throw Error(err);
		}
	)

	function flush(me) {
		buffer = Buffer.concat(buffer);
		var i0 = 0, i1;
		while ((i1 = buffer.indexOf(10, i0)) >= 0) {
			me.push(buffer.slice(i0, i1).toString('utf8'));
			i0 = i1+1;
		}
		buffer = buffer.slice(i0);
		bufferSize = buffer.length;
		buffer = [buffer];
	}
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

miss.checkAscendingIds = function checkAscendingIds() {
	var lastId = '0';
	return miss.through.obj((line, enc, cb) => {
		var i = line.indexOf('\t');
		var id = (i > 0) ? line.slice(0,i) : line;
		if (id <= lastId) throw Error(id+' <= '+lastId);
		lastId = id;
		cb(null, line);
	})
}

miss.fromArray = function fromArray(array) {
	array = array.slice();
	var i = 0, n = array.length;
	return miss.from.obj(function (size, next) {
		next(null, (i < n) ? array[i++] : null);
	})
}


