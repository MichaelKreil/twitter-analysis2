"use strict"

const miss = require('./mississippi');

module.exports = SetId;

function SetId() {
	const hashLength = 3;
	const maxIds = 1e6;
	const maxLength = maxIds*21;
	var buckets = {};

	return {
		add: add,
		getReadStream: getReadStream,
	}

	function add(id) {
		var hash = id.substr(0, hashLength);
		var bucket = buckets[hash];
		if (!bucket) {
			bucket = (buckets[hash] = {
				hash:hash,
				offset:0,
				data:Buffer.alloc(maxLength+30),
			})
			bucket.data.fill(0);
		}
		bucket.offset += bucket.data.write(id, bucket.offset, 'ascii')+1;
		
		if (bucket.offset < maxLength) return;
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
		console.log('compress bucket "'+bucket.hash+'"');
		console.log('   before: '+bucket.offset);

		var ids = getBucketIds(bucket).join('\0');

		bucket.data.fill(0);
		bucket.offset = bucket.data.write(ids, 0, 'ascii');
		console.log('   after: '+bucket.offset);
	}

	function getReadStream() {
		buckets = Object.keys(buckets).map(key => buckets[key]);
		buckets.sort((a,b) => a.hash < b.hash ? -1 : 1);

		return miss.multistream(buckets.map(bucket => {
			return function () {
				var ids = getBucketIds(bucket);
				return miss.fromArray(ids);
			}
		}))
	}
}