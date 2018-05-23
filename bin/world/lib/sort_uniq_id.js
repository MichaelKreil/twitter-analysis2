"use strict"

const miss = require('mississippi');
const Progress = require('./progress.js');

module.exports = function () {
	var set = new Set();
	var db = new Database();

	var streamIn = miss.to.obj(
		function (data, enc, cb) {
			set.add(data);
			if (set.size < 1e7) return cb();

			flush();
			cb();
		},
		function (cb) {
			flush();
			dump();
			cb();
		}
	)

	var paused = true, waiting;
	var streamOut = miss.from.obj(function (size, next) {
		if (paused) return waiting = next;
		db.fetch(next);
	})

	var duplex = miss.duplex(streamIn, streamOut);

	return duplex;

	function flush() {
		var data = Array.from(set.values());
		set = new Set();
		db.addList(data);
	}

	function dump() {
		db.initFetch();
		if (paused) {
			paused = false;
			if (waiting) db.fetch(waiting);
		}
	}

	function Database() {
		var blocks = [], blockCount = 256;
		var readBlock = 0, readIndex = -2;
		var progress;

		function addList(list) {
			generateBlocks(list).forEach((newBlock, index) => {
				if (!newBlock) return;
				if (newBlock.length === 0) return;
				blocks[index] = mergeBlocks(blocks[index], newBlock);
			})
		}

		function initFetch() {
			console.log(colors.green.bold('Dumping sorted ids'));
			progress = new Progress(blockCount);
		}

		function fetch(cb) {
			var zeros = '0000000000';
			while (true) {
				if (readBlock >= blocks.length) {
					progress.end();
					cb(null, null);
					return
				}
				readIndex += 2;
				if ((!blocks[readBlock]) || (readIndex >= blocks[readBlock].size)) {
					readIndex = -2;
					readBlock++;
					progress.set(readBlock);
					continue;
				}
				break;
			}
			var data = blocks[readBlock].data;
			var v0 = data[readIndex  ].toFixed(0);
			var v1 = data[readIndex+1].toFixed(0);
			cb(null, v0 + zeros.substr(0,9-v1.length) + v1);
		}

		return {
			addList: addList,
			initFetch: initFetch,
			fetch: fetch,
		}

		function mergeBlocks(b1, b2) {
			if (!b1) return b2;

			var data = new Uint32Array(b1.size + b2.size);

			var i = 0, i1 = 0, i2 = 0;
			var v0, v1, lv0 = -1, lv1 = -1, index;

			while (true) {
				index = (function () {
					if (i1 >= b1.size) {
						if (i2 >= b2.size) return 0;
						return 2;
					} else {
						if (i2 >= b2.size) return 1;
						if (b1.data[i1] === b2.data[i2]) {
							if (b1.data[i1+1] < b2.data[i2+1]) return 1;
							return 2;
						} else {
							if (b1.data[i1] < b2.data[i2]) return 1;
							return 2;
						}
					}
				})();

				if (index === 0) break;

				if (index === 1) {
					v0 = b1.data[i1  ]
					v1 = b1.data[i1+1];
					i1 += 2;
				} else {
					v0 = b2.data[i2  ]
					v1 = b2.data[i2+1];
					i2 += 2;
				}

				if ((v0 === lv0) && (v1 === lv1)) continue;
				lv0 = v0;
				lv1 = v1;

				data[i  ] = v0;
				data[i+1] = v1;
				i += 2;
			}

			return {data:data, size:i};
		}
		
		function generateBlocks(list) {
			var blocks = [];

			list.forEach(id => {
				var v1 = parseInt(id.slice(0,-9),10) || 0;
				var v2 = parseInt(id.slice(  -9),10) || 0;
				var index = estimatePosition(v1,v2);
				index = Math.floor(index*blockCount);
				if (!blocks[index]) blocks[index] = [];
				blocks[index].push([v1,v2]);
			})

			blocks = blocks.map(block => {
				block.sort((a,b) => (a[0] === b[0]) ? a[1] - b[1] : a[0] - b[0]);

				var data = new Uint32Array(block.length*2);
				block.forEach((v,i) => {
					data[i*2+0] = v[0];
					data[i*2+1] = v[1];
				})

				return {data:data, size:block.length*2};
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