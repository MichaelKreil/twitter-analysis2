"use strict"

const fs = require('fs');
const async = require('async');
const colors = require('colors');
const resolve = require('path').resolve;
const Reader = require('../lib/lzma_reader.js');
const Writer = require('../lib/id_unique_writer.js');
const scraper = require('../../../lib/scraper.js')('world_friends');
const Progress = require('../lib/progress.js');

var input = resolve(__dirname, '../../../data/world/1_ids/ids_1.tsv.xz');

var progress = new Progress();
var writer = new Writer('../../../data/world/1_ids/ids_2.tsv.xz');

var running = 0;

var task = scraper.getSubTask();

Reader(
	input,
	(user_id, cbEntry, progressValue) => {
		progress.set(progressValue);
		running++;
		var pause = (running > 100);
		task.fetch(
			'friends/ids',
			{user_id:user_id, stringify_ids:true, count:5000},
			result => {
				if (!result.ids) return finalize();

				async.eachSeries(
					result.ids,
					(friend_id, cb) => writer.add(friend_id, cb),
					finalize
				)

				function finalize() {
					running--;
					writer.add(user_id, () => {
						if (pause) setImmediate(cbEntry);
					});
				}
			}
		)
		if (!pause) cbEntry();
	},
	check
)

function check() {
	if (running > 0) return setTimeout(check, 1000);
	progress.end();
	console.log('\nFinished'.green);
	writer.close();
}
