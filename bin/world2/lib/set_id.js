"use strict"

const miss = require('./mississippi');

module.exports = SetId;


function SetId() {
	const hashLength = 4;
	const minIds = 1e4;
	const maxIds = 1e6;
	const minLength = minIds*21;
	const maxLength = maxIds*21;
	var buckets = {};

	return {
		add: add,
		getReadStream: getReadStream,
	}

	function add(id) {
		if (id.length >= 20) throw Error(id);
		
		var hash = id.substr(0, hashLength);
		var bucket = buckets[hash];
		if (!bucket) {
			bucket = (buckets[hash] = {
				hash:hash,
				offset:0,
				maxSize:minLength,
				data:Buffer.alloc(minLength+30, 0),
			})
		}
		bucket.offset += bucket.data.write(id+'\0', bucket.offset, 'ascii');
		
		if (bucket.offset < bucket.maxSize) return;
		compressBucket(bucket);
	}

	function getBucketIds(bucket) {
		var ids = bucket.data.toString('ascii', 0, bucket.offset-1);

		ids = ids.split('\0');
		ids = new Set(ids);
		ids = Array.from(ids.values());
		ids.sort();
		return ids;
	}

	function compressBucket(bucket) {
		var a = bucket.offset;

		var ids = getBucketIds(bucket);
		//ids.forEach(id => { if (id.length >= 20) throw Error(id); })
		ids = ids.join('\0');

		var newSize = Math.min(ids.length*3, maxLength);
		if (bucket.maxSize === newSize) {
			bucket.data.fill(0);
		} else {
			bucket.maxSize = newSize;
			bucket.data = Buffer.alloc(bucket.maxSize+30, 0);
		}
		bucket.offset = bucket.data.write(ids+'\0', 0, 'ascii');
		//console.log('compress bucket "'+bucket.hash+'": '+[a, bucket.offset, (100*bucket.offset/a).toFixed(0)+'%'].join('\t'));
	}

	function getReadStream() {
		buckets = Object.keys(buckets).map(key => buckets[key]);
		buckets.sort((a,b) => a.hash < b.hash ? -1 : 1);

		return miss.multistream.obj(buckets.map(bucket => {
			return function () {
				var ids = getBucketIds(bucket);
				ids.forEach(id => {
					if (id.length >= 20) throw Error(id)
				})
				return miss.fromArray(ids);
			}
		}))
	}
}

/*
function SetId() {
	const maxIds = 1e6;
	const maxIdLength = 20;
	const maxBlockSize = maxIds*maxIdLength;
	var ids = [];
	var db = [];

	return {
		add: add,
		getReadStream: getReadStream,
	}

	function add(id) {
		if (id.length > maxIdLength) throw Error();
		ids.push(id);
		if (ids.length >= maxIds) flush();
	}

	function flush(force) {
		var block = Buffer.alloc(maxBlockSize, 32);
		
		ids.sort();

		var lastId = '?', pos = 0;
		ids.forEach(id => {
			if (id !== lastId) {
				block.write(id, pos, 'ascii');
				pos += maxIdLength;
				lastId = id;
			}
		})

		ids = [];

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
			db.unshift(mergeBlocks(db.shift(), db.shift()))
			db.sort((a,b) => a.length - b.length);
		}

		function mergeBlocks(b1, b2) {
			b1 = new BlockReader(b1);
			b2 = new BlockReader(b2);

			var b = new BlockWriter();

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
		var prefix, lastPrefix = '';

		flush(true);

		if (db.length !== 1) throw Error();

		var reader = new BlockReader(db[0]);

		return miss.from((size, next) => {
			if (reader.finished) return next(null, null);

			var id = reader.read().trim();
			prefix = id.slice(0,3);
			if (lastPrefix !== prefix) console.log(lastPrefix = prefix);
			next(null, id);
		})
	}
}
*/