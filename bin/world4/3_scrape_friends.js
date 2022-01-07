"use strict"

const fs = require('fs');
const { Readable } = require('stream');

const miss = require('mississippi2');
const transform = require('parallel-transform');

const scraper = require('../../lib/scraper.js')('test2');
const { findDataFile, getDataFile, readLinesMulti, xzWriter, getTimeSlug } = require('./lib/helper.js');

start()

function start() {
	let index = 0;
	miss.pipeline(
		transform(16, (entry, callback) => {
		Readable.from(readLinesMulti([findDataFile('3_ids'), findDataFile('4_friends')])),
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
