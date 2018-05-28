"use strict"

const activeFriends = require('../lib/cache_twitter_active_friends.js');
const colors = require('colors');
const miss = require('mississippi');
const Reader = require('../lib/lzma_reader.js');
const resolve = require('path').resolve;
const sortUniqId = require('../lib/sort_uniq_id.js');
const Writer = require('../lib/lzma_writer.js');

var fileIn  = resolve(__dirname, '../../../data/world/1_ids/ids_selected_0.tsv.xz');
var fileOut = resolve(__dirname, '../../../data/world/1_ids/ids_selected_1.tsv.xz');

miss.pipe(
	new Reader(fileIn),
	miss.parallel(
		32,
		function (user_id, cb) {
			user_id = user_id.toString('utf8');

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
	miss.through((data, enc, cb) => cb()),
	//sortUniqId,
	//new Writer(fileOut)
)