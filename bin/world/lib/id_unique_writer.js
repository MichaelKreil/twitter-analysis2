"use strict"

const async = require('async');
const Writer = require('../lib/lzma_writer.js');

module.exports = IdWriter;

function IdWriter(filename) {
	var filewrite = new Writer(filename);

	var set = new Set();

	function add(id, cbAdd) {
		set.add(id);
		check(cbAdd);
	}

	function addList(ids, cbAdd) {
		ids.forEach(id => set.add(id));
		check(cbAdd);
	}

	function check(cbAdd) {
		if (set.size > 1e7) {
			flush(cbAdd)
		} else {
			if (cbAdd) setImmediate(cbAdd);
		}
	}

	function flush(cbFlush) {
		var data = Array.from(set.values());
		set = new Set();
		data.sort((a,b) => {
			if (a.length === b.length) return a.localeCompare(b);
			return a.length - b.length;
		})

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
		addList: addList,
		close: close,
	}
}