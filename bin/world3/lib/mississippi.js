"use strict"

const miss = require('mississippi2');
const zlib = require('zlib');
const fs = require('fs');

miss.parallel = require('through2-concurrent');

miss.extractValue = function extractValue(key) {
	return miss.through.obj((chunk, enc, cb) => cb(null, chunk[key]))
}

miss.bundle = function bundle(maxCount, stream) {
	var buffer = [];

	return miss.pipeline.obj(
		miss.through.obj(
			(chunk, enc, cb) => {
				buffer.push(chunk);
				//console.log(chunk, buffer.length);
				if (buffer.length < maxCount) return cb();
				var result = buffer;
				buffer = [];
				cb(null, result);
			},
			cb => cb(null, buffer.length > 0 ? buffer : null)
		),
		stream,
		miss.through.obj(
			function (chunk, enc, cb) {
				chunk.forEach(d => this.push(d));
				cb();
			}
		)
	)
}

miss.spy = function spy(format) {
	if (!format) format = o => o;
	return miss.through.obj((chunk, enc, cb) => {
		console.log(format(chunk));
		cb(null, chunk);
	})
}

miss.spySometimes = function spySometimes(format) {
	if (!format) format = o => o;
	var interval = setInterval(update, 1000);
	var lastChunk;
	var updated = false;
	return miss.through.obj(
		(chunk, enc, cb) => {
			lastChunk = chunk;
			updated = true;
			cb(null, chunk);
		},
		cb => {
			clearInterval(interval);
			cb();
		}
	)
	function update() {
		if (!updated) return;
		console.log(format(lastChunk));
		updated = false;
	}
}

miss.drain = function spyLog() {
	return miss.to.obj((chunk, enc, cb) => cb());
}

miss.deduplicate = function deduplicate() {
	var ids = new Set();
	return miss.through.obj(function (chunk, enc, cb) {
		if (ids.has(chunk)) return cb();
		ids.add(chunk);
		cb(null, chunk);
	})
}

miss.splitArrayUniq = function splitArrayUniq(minCount) {
	var entries, add;
	var interval = setInterval(() => console.log('splitArrayUniq size: '+entries.size), 10000);

	if (minCount === 1) {
		entries = new Set();
		add = (list, me) => {
			list.forEach(e => {
				if (entries.has(e)) return;
				entries.add(e);
				me.push(e);
			})
		}
	} else {
		entries = new Map();
		add = (list, me) => {
			list.forEach(e => {
				var count = (entries.get(e) || 0)+1;
				if (count > minCount) return;
				if (count === minCount) me.push(e);
				entries.set(e, count);
			})
		}
	}

	return miss.through.obj(
		function (list, enc, cb) {
			add(list, this);
			cb();
		},
		cb => {
			clearInterval(interval);
			cb();
		}
	)
}

miss.splitArrayUniqKey = function splitArrayUniqKey(key) {
	var entries = new Set();
	var interval = setInterval(() => console.log('splitArrayUniq size: '+entries.size), 10000);

	return miss.through.obj(
		function (list, enc, cb) {
			list.forEach(entry => {
				if (entries.has(entry[key])) return;
				entries.add(entry[key]);
				this.push(entry);
			})
			cb();
		},
		cb => {
			clearInterval(interval);
			cb();
		}
	)
}

miss.sort = function sort(func) {
	var entries = [];
	var interval = setInterval(() => console.log('sort size: '+entries.length), 10000);

	return miss.through.obj(
		(obj, enc, cb) => {
			//console.log('add to sort list', obj);
			entries.push(obj);
			cb();
		},
		function (cb) {
			clearInterval(interval);
			console.log('sorting');
			entries.sort(func);
			entries.forEach(e => this.push(e));
			cb();
		}
	)
}

miss.splitArraySortUniq = function splitArraySortUniq(key) {
	return miss.pipeline.obj(
		miss.through.obj((obj, enc, cb) => cb(null, obj[key].join('\n')+'\n')),
		miss.child('sort', ['-u']),
		miss.split('\n'),
		miss.filter.obj(l => l.length > 0)
	)
}

miss.toObject = function toObject(key) {
	return miss.through.obj(
		(value, enc, cb) => cb(null, {[key]:value})
	)
}

miss.splitArrayDeduplicate = function splitArrayDeduplicate() {
	var ids = new Set();
	return miss.through.obj(function (chunk, enc, cb) {
		chunk.forEach(entry => {
			if (ids.has(entry)) return;
			ids.add(entry);
			this.push(entry);
		})
		cb(null, null);
	})
}

miss.readTSV = function readTSV(filename) {
	var size = fs.statSync(filename).size;
	return miss.pipeline.obj(
		fs.createReadStream(filename),
		miss.split('\n'),
		TSVLineParser(size),
	)
}

miss.writeTSV = function writeTSV(keys, filename) {
	return miss.pipeline.obj(
		stringifyTSV(keys),
		fs.createWriteStream(filename),
	)
}

module.exports = miss;

function TSVLineParser(size) {
	var keys, pos = 0;

	return miss.through.obj((chunk, enc, cb) => {
		pos += chunk.length+1;

		if (chunk.length === 0) return cb();

		chunk = chunk.split('\t').map(t => JSON.parse(t));

		if (!keys) {
			keys = chunk;
			return cb();
		}

		var obj = {percentage: 100*pos/size};
		keys.forEach((k,i) => obj[k] = chunk[i]);
		cb(null, obj);
	})
}

function stringifyTSV(keys) {
	var wroteHeader = false;
	return miss.through.obj((chunk, enc, cb) => {
		var result = keys.map(k => JSON.stringify(chunk[k])).join('\t')+'\n';
		if (!wroteHeader) {
			result = keys.map(k => JSON.stringify(k)).join('\t')+'\n' + result;
			wroteHeader = true;
		}
		cb(null, result);
	})
}





