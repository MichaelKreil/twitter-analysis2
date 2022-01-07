"use strict"

const fs = require('fs');
const { Readable } = require('stream');

const miss = require('mississippi2');
const transform = require('parallel-transform');

const scraper = require('../../lib/scraper.js')('temp');
const { findDataFile, getDataFile, readXzLines, xzWriter } = require('./lib/helper.js');

const dataFolder = '/root/data/twitter/world4'

start()

function start() {
	miss.pipeline(
		Readable.from(getBlocks()),
		transform(16, (ids, callback) => {
			let now = Date.now();

			scraper.fetch(
				'users/lookup',
				{ user_id:ids.join(','), include_entities:false, tweet_mode:'extended' },
				result => {
					result.sort((a,b) => (a.id_str.length - b.id_str.length) || (a.id_str < b.id_str ? -1 : 1));
					result = result.map(e => JSON.stringify(e)+'\n').join('');
					result = Buffer.from(result);
					callback(null, result);
				}
			)
		}),
		xzWriter(getDataFile('2_status')),
	)
}

async function* getBlocks() {
	const maxIdCount = 100;

	let block = [];

	for await (let line of readXzLines(findDataFile('1_ids'), true)) {
		if (!line) throw Error('id is missing');
		block.push(line);

		if (block.length >= maxIdCount) {
			yield block;
			block = [];
		}
	}
	console.log('Finished');
	if (block.length > 0) yield block;

}
