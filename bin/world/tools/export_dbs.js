"use strict"

const miss = require('mississippi');
const resolve = require('path').resolve;
const MultiDB = require('../lib/multi_db.js');
const Writer = require('../lib/lzma_writer.js');

[
	'activity',
	'active_friends',
	'friends',
].forEach(name => {
	var db = new MultiDB(resolve(__dirname, '../../../data/world/dbs/'+name));

	var fileOut = resolve(__dirname, '../../../data/world/dbs/'+name+'_new.ndjson.xz');

	miss.pipe(
		db.getReadStream(),
		miss.through.obj(
			function (entry, enc, cb) {
				cb(null, entry.key+'\t'+JSON.stringify(entry.value));
			}
		),
		new Writer(fileOut)
	)
})
