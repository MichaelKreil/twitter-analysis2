"use strict"

const fs = require('fs');
const { Readable } = require('stream');

const miss = require('mississippi2');
const transformParallel = require('parallel-transform');

const scraper = require('../../lib/scraper.js')('temp');
const { findDataFile, getDataFile, getTempFile, readLinesMulti, xzWriter, getTimeSlug } = require('./lib/helper.js');

start()

function start() {
	let tempFilename = getTempFile();
	let dataFilename = getDataFile('4_friends');

	let index = 0;
	miss.pipe(
		Readable.from(readLinesMulti([findDataFile('3_ids'), findDataFile('4_friends')])),
		transformParallel(16, (entry, callback) => {
			index++;
			if (index % 1000 === 0) console.log('index:',index);
			//console.log({key:entry.key, lines:entry.lines.map(l => l && l.slice(0,20))});

			if (!entry.lines[0]) return callback();
			if (entry.lines[1]) callback(null, entry.lines[1]+'\n');

			let id = entry.key;

			scraper.fetch(
				'friends/ids',
				{ user_id:id, stringify_ids:true, count:5000 },
				result => {
					result = { ids:result.ids, now:Date.now() };
					callback(null, Buffer.from(id+'\t'+JSON.stringify(result)+'\n'));
				}
			)
		}),
		xzWriter(tempFilename),
		() => fs.renameSync(tempFilename, dataFilename)
	)
}
