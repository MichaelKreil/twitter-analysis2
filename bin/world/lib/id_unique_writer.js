"use strict"

const async = require('async');
const Writer = require('../lib/lzma_writer.js');

module.exports = IdWriter;

function IdWriter(filename) {
	var filewriter = new Writer(filename);

	var set = new Set();
	var db = new Database();

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
		db.addList(data, cbFlush);
	}

	function close(cbClose) {
		flush(() => {
			filewriter.close(cbClose);
		})
	}

	return {
		add: add,
		addList: addList,
		close: close,
	}

	function Database() {
		var blocks = [];
		var blockCount = 256;

		function addList(list, cbAdd) {
			async.eachOfSeries(
				generateBlocks(list),
				(block, index, cbBlock) => {
					if (!block) return cbBlock();
					blocks[index] = mergeBlocks(blocks[index], block, cbBlock);
				},
				cbAdd
			)
		}

		return {
			addList: addList,
		}

		function mergeBlocks(b1, b2, cbMerge) {
			if (b1) {
				// merge blocks
				console.dir(b1);
				console.dir(b2);
				throw Error();
			} else {
				// new block

				var data = new Uint32Array(b2.length*2);

				b2 = b2.map((v,i) => {
					data[i*2+0] = v[0];
					data[i*2+1] = v[1];
					return v[2];
				})

				async.eachSeries(
					b2,
					(id,cb) => filewriter.writeLine(id,cb),
					cbMerge
				)

				return {data:data, length:b2.length};
			}
		}
		
		function generateBlocks(list) {
			var blocks = [];

			list.forEach(id => {
				var v1 = parseInt(id.slice(0,-9),10) || 0;
				var v2 = parseInt(id.slice(  -9),10) || 0;
				var index = estimatePosition(v1,v2);
				index = Math.floor(index*blockCount);
				if (!blocks[index]) blocks[index] = [];
				blocks[index].push([v1,v2,id]);
			})

			blocks.forEach(block => {
				block.sort((a,b) => (a[0] === b[0]) ? a[1] - b[1] : a[0] - b[0])
			})

			return blocks;

			function estimatePosition(v1,v2) {
				if (v1 < 5) {
					v1 = Math.sqrt((v1+v2/1e9)/5);
					if (v1 < 0) throw Error();
					if (v1 > 1) throw Error();
					return v1 * 2/3;
				} else {
					v1 = (v1/1e7-69)/31;
					v1 = v1*v1;
					if (v1 < 0) throw Error();
					if (v1 > 1) throw Error();
					return v1/3 + 2/3;
				}
			}
		}
	}
}

function id2bigint(id) {

}


