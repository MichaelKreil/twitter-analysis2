"use strict"

const async = require('async');
const Writer = require('../lib/lzma_writer.js');

module.exports = IdWriter;

function IdWriter(filename) {
	var filewrite = new Writer(filename);

	var set = new Set();

	function add(id, cbAdd) {
		set.add(id);
		if (set.size > 1e60) {
			flush(cbAdd)
		} else {
			if (cbAdd) setImmediate(cbAdd);
		}
	}

	function flush(cbFlush) {
		var data = Array.from(set.values());
		data.sort((a,b) => {
			if (a.length === b.length) return a.localeCompare(b);
			return a.length - b.length;
		})
		set = new Set();

		async.eachSeries(
			data,
			(id, cb) => filewrite.writeLine(id, cb),
			cbFlush
		)
	}

	function close(cbClose) {
		flush(() => {
			filewrite.close(cbClose);
		})
	}

	return {
		add: add,
		close: close,
	}
}