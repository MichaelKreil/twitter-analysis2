"use strict"

const colors = require('colors');
const miss = require('mississippi');
const Reader = require('../lib/lzma_reader.js');
const resolve = require('path').resolve;
const scraper = require('../../../lib/scraper.js')('world_friends');
const SortUniqId = require('../lib/sort_uniq_id.js');
const Writer = require('../lib/lzma_writer.js');

var fileIn  = resolve(__dirname, '../../../data/world/1_ids/ids_selected.tsv.xz');
var fileOut = resolve(__dirname, '../../../data/world/1_ids/ids_friends.tsv.xz');

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
