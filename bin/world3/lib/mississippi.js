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

miss.spy = function spy(log) {
	return miss.through.obj((chunk, enc, cb) => {
		log(chunk);
		cb(null, chunk);
	})
}

miss.spySometimes = function spySometimes(log) {
	var interval = setInterval(update, 1000);
	var lastChunk;
	var updated = false;
	return miss.through.obj(
		(chunk, enc, cb) => {
			lastChunk = chunk;
			updated = true;
			cb(null, chunk);
		},
		() => clearInterval(interval)
	)
	function update() {
		if (!updated) return;
		log(lastChunk);
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

miss.splitArraySortUniq = function splitArraySortUniq(key) {
	var ids = new Set();
	var interval = setInterval(() => console.log('sortUniq size '+ids.size), 10*1000);

	return miss.through.obj(
		(obj, enc, cb) => {
			obj[key].forEach(id => {
				if (!ids.has(id)) ids.add(id);
			})
			cb();
		},
		function (cb) {
			clearInterval(interval);
			ids = Array.from(ids.values());
			ids.sort();
			ids.forEach(id => this.push(id));
			cb();
		}
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





