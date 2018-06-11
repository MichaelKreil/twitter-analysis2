"use strict"

const colors = require('colors');
const fs = require('fs');
const miss = require('mississippi');
const Stack = require('./stack.js');
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

	var compressorStream = zlib.Gzip({level:1}),

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



miss.merge = function merge(stream1, stream2, cbMerge) {
	var stack1 = new Stack();
	var stack2 = new Stack();

	miss.each(
		stream1,
		function entry(data, cb) {
			if (stack1.push(data.toString('utf8'))) cb();
			else stack1.once('writeable', cb);
		},
		function flush() {
			stack1.end();
		}
	)

	miss.each(
		stream2,
		function entry(data, cb) {
			if (stack2.push(data.toString('utf8'))) cb();
			else stack2.once('writeable', cb);
		},
		function flush() {
			stack2.end();
		}
	)

	return miss.from.obj(read);

	function read(size, next) {
		fetch();

		function fetch() {
			if (stack1.isFinished && stack2.isFinished) return next(null, null);

			if (!stack1.isFinished && !stack1.isReadable) return stack1.once('changed', fetch);
			if (!stack2.isFinished && !stack2.isReadable) return stack2.once('changed', fetch);

			if (stack2.isFinished || (stack1.id < stack2.id)) {
				cbMerge(stack1.id, stack1.line, null, null, next);
				stack1.shift();
				return;
			}
			if (stack1.isFinished || (stack1.id > stack2.id)) {
				cbMerge(null, null, stack2.id, stack2.line, next);
				stack2.shift();
				return;
			}
			if (stack1.id === stack2.id) {
				cbMerge(stack1.id, stack1.line, stack2.id, stack2.line, next);
				stack1.shift();
				stack2.shift();
				return;
			}
			throw Error();
		}
	}
}


