"use strict"

const fs = require('fs');
const async = require('async');
const colors = require('colors');
const resolve = require('path').resolve;
const Reader = require('../lib/lzma_reader.js');
const Writer = require('../lib/id_unique_writer.js');
const scraper = require('../../../lib/scraper.js')('world_friends');
const Progress = require('../lib/progress.js');

const minFactor = 1000;

var input = resolve(__dirname, '../../../data/world/1_ids/ids_1.tsv.xz');

var progress = new Progress();
var writer = new Writer('../../../data/world/1_ids/ids_1.tsv.xz');

var running = 0;

var task = scraper.getSubTask();

var buffer = [];

Reader(
	input,
	(user_id, cbEntry, progressValue) => {
		buffer.push(user_id);
		if (buffer.length >= 100) {
			progress.set(progressValue);
			var copy = buffer;
			buffer = [];
			scan(copy, cbEntry);
		} else {
			setImmediate(cbEntry);
		}
	},
	check
)

function scan(list, cbScan) {
	running++;
	var paused = (running > 100);
	task.fetch(
		'users/lookup',
		{user_id:list.join(','), include_entities:false, tweet_mode:'extended'},
		result => {
			result = result.filter(u => {
				if (u.protected) return false;
				return (u.followers_count * u.statuses_count > minFactor)
			})
			result = result.map(u => u.id_str);

			writer.addList(result, finalize);

			function finalize() {
				running--;
				if (paused) setImmediate(cbScan);
			}
		}
	)
	if (!paused) cbScan();
}

function check() {
	if (running > 0) return setTimeout(check, 1000);
	progress.end();
	console.log('\nFinished'.green);
	writer.close();
}
