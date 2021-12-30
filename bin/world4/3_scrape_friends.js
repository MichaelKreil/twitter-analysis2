"use strict"

const fs = require('fs');
const { Readable } = require('stream');
const { resolve } = require('path');

const miss = require('mississippi2');
const transform = require('parallel-transform');

const scraper = require('../../lib/scraper.js')('test2');
const { readLinesMulti, xzWriter, getTimeSlug } = require('./lib/helper.js');

const dataFolder = '/root/data/twitter/world4'

start()

function start() {
	let files = ['3_id-2021-12-28-22-26-15.tsv.xz'].map(f => resolve(dataFolder, f));
	let index = 0;
	miss.pipeline(
		Readable.from(readLinesMulti(files)),
		transform(16, (entry, callback) => {
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
		xzWriter(resolve(dataFolder, `4_friends-${getTimeSlug()}.tsv.xz`)),
	)
}
