"use strict"

const fs = require('fs');
const { Readable } = require('stream');

const miss = require('mississippi2');
const transformParallel = require('pipeline-pipe');

const scraper = require('../../lib/scraper.js')('world4_temp3');
const { findDataFile, getDataFile, getTempFile, readLinesMulti, xzCompressor, getTimeSlug } = require('./lib/helper.js');

start()

function start() {
	let tempFilename = getTempFile();
	let dataFilename = getDataFile('4_friends');

	let index = 0;
	let active = 0;
	miss.pipe(
		Readable.from(readLinesMulti([
			findDataFile('3_ids'),
			findDataFile('4_friends'),
		])),
		transformParallel(async entry => {
			if (!entry.lines[0]) return null;
			if ( entry.lines[1]) return entry.lines[1]+'\n';

			return new Promise(res => {
				let id = entry.key;
				scraper.fetch(
					'friends/ids',
					{ user_id:id, stringify_ids:true, count:5000 },
					result => {
						result = { ids:result.ids, now:Date.now() };
						res(id+'\t'+JSON.stringify(result)+'\n');
					}
				)
			})
		}, 16),
		xzCompressor(5),
		fs.createWriteStream(tempFilename),
		() => fs.renameSync(tempFilename, dataFilename)
	)
}
