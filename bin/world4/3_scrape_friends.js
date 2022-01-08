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
	let active = 0;
	miss.pipe(
		Readable.from(readLinesMulti([
			findDataFile('3_ids'),
			findDataFile('4_friends'),
		])),
		transformParallel(16, (entry, callback) => {
			if (!entry.lines[0]) return callback();
			if ( entry.lines[1]) return callback(null, entry.lines[1]+'\n');
			//console.log(entry);

			let id = entry.key;

			//active++;
			//let start = Date.now();
			//console.log(active, id);

			scraper.fetch(
				'friends/ids',
				{ user_id:id, stringify_ids:true, count:5000 },
				result => {
					//active--;
					//console.log(active, Date.now()-start);
					
					result = { ids:result.ids, now:Date.now() };
					callback(null, id+'\t'+JSON.stringify(result)+'\n');
				}
			)
		}),
		//miss.to((d,e,c) => c()),
		xzWriter(tempFilename, 9),
		() => fs.renameSync(tempFilename, dataFilename)
	)
}
