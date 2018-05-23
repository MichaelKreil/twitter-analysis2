"use strict"

const miss = require('mississippi');

module.exports = function (count) {
	var buffer = [];
	return miss.through.obj(
		(data, enc, cb) => {
			buffer.push(data);

			if (buffer.length < count) return cb()
			
			cb(null, buffer);
			buffer = [];
		},
		cb => {
			if (buffer.length === 0) return cb();
			
			cb(null, buffer)
		}
	)
}