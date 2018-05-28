"use strict"

process.exit();

const colors = require('colors');
const miss = require('mississippi');
const Reader = require('../lib/lzma_reader.js');
const resolve = require('path').resolve;
const MultiDB = require('../lib/multi_db.js');
//const scraper = require('../../../lib/scraper.js')('world_friends');
//const SortUniqId = require('../lib/sort_uniq_id.js');
//const Writer = require('../lib/lzma_writer.js');

var fileIn  = resolve(__dirname, '../../../data/world/dbs/user_activity.tsv.xz');

var activityDB = new MultiDB(resolve(__dirname, '../../../data/world/dbs/activity'));


miss.pipe(
	new Reader(resolve(__dirname, '../../../data/world/dbs/activity.tsv.xz')),
	miss.parallel(
		100,
		function (line, cb) {
			line = line.toString('ascii');
			line = line.split('\t');
			if (line.length !== 2) return cb();

			activityDB.put(line[0], line[1], cb);
		}
	),
	//new SortUniqId(),
	//new Writer(fileOut)
)
/*
miss.pipe(
	new Reader(fileIn),
	miss.parallel(
		32,
		function (user_id, cb) {
			var me = this;

			me.push(user_id);

			scraper.fetch(
				'friends/ids',
				{user_id:user_id, stringify_ids:true, count:5000},
				result => {
					//return cb();
					if (!result.ids) return cb();

					result.ids.forEach(id => me.push(id));
					cb();
				}
			)
		}
	),
	new SortUniqId(),
	new Writer(fileOut)
)
*/