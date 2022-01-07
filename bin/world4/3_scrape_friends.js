"use strict"

const fs = require('fs');
const { Readable } = require('stream');

const miss = require('mississippi2');
const transformParallel = require('parallel-transform');

const scraper = require('../../lib/scraper.js')('temp');
const { findDataFile, getDataFile, readLinesMulti, xzWriter, getTimeSlug } = require('./lib/helper.js');

start()

function start() {
	let index = 0;
	miss.pipeline(
		Readable.from(readLinesMulti([findDataFile('3_ids'), findDataFile('4_friends')])),
		transformParallel(1, (entry, callback) => {
			console.log(entry);
			if (entry.lines[0].length > entry.key.length) {
				return callback(null, entry.lines[0]+'\n')
			}

			let id = entry.key;
			let now = Date.now();

			index++;
			if (index % 1000 === 0) console.log('index:',index);

			scraper.fetch(
				'friends/ids',
				{ user_id:id, stringify_ids:true, count:5000 },
				result => {
					result = {
						ids:result.ids,
						now
					};
					callback(null, Buffer.from(id+'\t'+JSON.stringify(result)+'\n'));
				}
			)
		}),
		//process.stderr,
		xzWriter(getDataFile('4_friends')),
	)
}
