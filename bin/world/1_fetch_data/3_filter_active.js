"use strict"

const activeFriends = require('../lib/cache_twitter_active_friends.js');
const colors = require('colors');
const miss = require('mississippi');
const Reader = require('../lib/lzma_reader.js');
const resolve = require('path').resolve;

var fileIn  = resolve(__dirname, '../../../data/world/1_ids/ids_selected.tsv.xz');
var fileOut = resolve(__dirname, '../../../data/world/1_ids/ids_friends.tsv.xz');

miss.pipe(
	new Reader(fileIn),
	miss.parallel(
		32,
		function (user_id, cb) {
			var me = this;
			me.push(user_id);

			activeFriends(
				user_id,
				(err, ids) => {
					ids.split(',').forEach(id => me.push(id));
					cb();
				}
			)
		}
	),
	miss.to((data, enc, cb) => {cb()}),
	//new SortUniqId(),
	//new Writer(fileOut)
)