"use strict"

const miss = require('mississippi');
const resolve = require('path').resolve;
const Reader = require('../lib/lzma_reader.js');
const activity = require('../lib/cache_twitter_activity.js');

var map = new Map();
var key = [];

var fileIn  = resolve(__dirname, '../../../data/world/1_ids/ids_selected_0.tsv.xz');

miss.pipe(
	new Reader(fileIn),
	miss.parallel(
		30,
		function (user_id, cb) {
			user_id = user_id.toString('utf8');

			activity(
				user_id,
				(err, result) => {
					return cb();
				}
			)
		}
	),
	miss.through((data, enc, cb) => cb()),
)

