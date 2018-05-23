"use strict"

const colors = require('colors');
const Joiner = require('../lib/joiner.js');
const miss = require('mississippi');
const Reader = require('../lib/lzma_reader.js');
const resolve = require('path').resolve;
const scraper = require('../../../lib/scraper.js')('world_users');
const SortUniqId = require('../lib/sort_uniq_id.js');
const Writer = require('../lib/lzma_writer.js');

var fileIn  = resolve(__dirname, '../../../data/world/1_ids/ids_1.tsv.xz');
var fileOut = resolve(__dirname, '../../../data/world/1_ids/ids_2.tsv.xz');

const minFactor = 1e6;

miss.pipe(
	new Reader(fileIn),
	new Joiner(100),
	miss.parallel(
		16,
		function (ids, cb) {
			scraper.fetch(
				'users/lookup',
				{user_id:ids.join(','), include_entities:false, tweet_mode:'extended'},
				result => {
					result.forEach(u => {
						if (u.protected) return;
						if (u.followers_count * u.statuses_count < minFactor) return;
						this.push(u.id_str)
					})
					cb();
				}
			)
		}
	),
	new SortUniqId(),
	new Writer(fileOut)
)