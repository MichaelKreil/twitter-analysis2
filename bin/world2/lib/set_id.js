"use strict"

const miss = require('./mississippi');

module.exports = SetId;

function SetId() {
	const maxIds = 1e6;
	const maxIdLength = 20;
	const maxBlockSize = maxIds*maxIdLength;
	var set = [];
	var db = [];

	var addCount = 0;

	return {
		add: add,
		getReadStream: getReadStream,
	}

	function add(id) {
		if (id.length > maxIdLength) throw Error();
		set.push(id);
		addCount++;
		if (addCount >= 1e7) process.exit();
		if (set.length >= maxIds) {
			//console.log(addCount, set.size, (100*set.size/addCount).toFixed(0)+'%');
			//addCount = 0;
			flush();
		}
	}

	function flush(force) {
		var block = Buffer.alloc(maxBlockSize, 32);
		
		var ids = set;
		ids.sort();
		ids.forEach((id,index) => block.write(id, index*maxIdLength, 'ascii'))
		set = [];

		db.unshift([block]);
		
		consolidate(force);
	}

	function consolidate(force) {
		if (db.length <= 1) return;

		db.sort((a,b) => a.length - b.length);

		var criteria;
		if (force) {
			criteria = () => (db.length > 1);
		} else {
			criteria = () => ((db.length > 1) && (Math.floor(Math.log2(db[0].length)) === Math.floor(Math.log2(db[1].length))))
		}

		while (criteria()) {
			//console.dir('A '+db.map(e => e.length).join(','))
			db.unshift(mergeBlocks(db.shift(), db.shift()))
			db.sort((a,b) => a.length - b.length);
			//console.dir('B '+db.map(e => e.length).join(','))
		}
		//process.exit();

		function mergeBlocks(b1, b2) {
			b1 = new BlockReader(b1);
			b2 = new BlockReader(b2);
			var b = new BlockWriter();

			//var b = Buffer.alloc(maxIds*maxIdLength, 32);
			//var blocks = [b];

			while (true) {
				if (b1.finished) {
					if (b2.finished) {
						return b.getData();
					} else {
						b.write(b2.read());
					}
				} else {
					if (b2.finished) {
						b.write(b1.read());
					} else {
						if (b1.id === b2.id) {
							b.write(b1.read());
							b2.read();
						} else {
							if (b1.id < b2.id) {
								b.write(b1.read());
							} else {
								b.write(b2.read());
							}
						}
					}
				}
			}
		}
	}

	function BlockWriter() {
		var block = Buffer.alloc(maxBlockSize, 32);
		var blockPos = 0;
		var blocks = [block];
		return {
			write: id => {
				if (blockPos > maxBlockSize) {
					blockPos = 0;
					block = Buffer.alloc(maxBlockSize, 32);
					blocks.push(block);
				}

				block.write(id, blockPos, 'ascii');
				blockPos += maxIdLength;
			},
			getData: () => blocks,
		}
	}

	function BlockReader(blockList) {
		var blockId = 0;
		var blockPos = -maxIdLength;
		var block = blockList[blockId];

		var me = {id:false, finished:false, read:read};
		function read() {
			if (me.finished) throw Error();
			var oldId = me.id;

			if (blockPos >= maxBlockSize) {
				blockPos = 0;
				blockId++;

				if (blockId >= blockList.length) {
					me.finished = true;
					return oldId;
				}

				block = blockList[blockId];
			} else {
				blockPos += maxIdLength;
			}

			if (block[blockPos] === 32) {
				me.finished = true;
				return oldId;
			}

			me.id = block.toString('ascii', blockPos, blockPos+maxIdLength).trim();

			return oldId;
		}

		read();

		return me;
	}

	function getReadStream() {
		flush(true);

		if (db.length !== 1) throw Error();

		var reader = new BlockReader(db[0]);

		return miss.from((size, next) => {
			if (reader.finished) return next(null, null);
			next(null, reader.read().trim());
		})
	}
}