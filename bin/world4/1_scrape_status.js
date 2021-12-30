"use strict"

const fs = require('fs');
const { Readable } = require('stream');
const { resolve } = require('path');

const miss = require('mississippi2');
const transform = require('parallel-transform');

const scraper = require('../../lib/scraper.js')('test');
const { readLinesMulti, xzWriter, getTimeSlug } = require('./lib/helper.js');

const dataFolder = '/root/data/twitter/world4'

start()

function start() {
	miss.pipeline(
		Readable.from(getBlocks()),
		transform(16, (block, callback) => {
			let now = Date.now();
			let ids = block.ids.map(i => i[0]);

			scraper.fetch(
				'users/lookup',
				{ user_id:ids.join(','), include_entities:false, tweet_mode:'extended' },
				result => {
					let lookup = new Map(block.ids.map(e => [e[0],e]));
					result.forEach(u => {
						u.now = now;
						let line = lookup.get(u.id_str);
						if (!line) return;
						line[0] = u.id_str+'\t'+JSON.stringify(u);
					})
					block = block.lines.map(l => l[0]).join('\n')+'\n';
					block = Buffer.from(block);
					callback(null, block);
				}
			)
		}),
		xzWriter(resolve(dataFolder, `2_status-${getTimeSlug()}.tsv.xz`)),
	)
}

async function* getBlocks() {
	const maxIdCount = 100;
	const maxLineCount = 10000;

	let block = newBlock();
	let files = ['1_id-2021-12-28-13-04-00.txt.xz'].map(f => resolve(dataFolder, f));

	for await (let entry of readLinesMulti(files)) {
		let key = entry.key;
		if (!key) throw Error();

		if (!entry.lines[0]) throw Error('id in id file is missing');

		if (entry.lines[1]) {
			block.lines.push([lines[1]]);
		} else {
			let line = [key]
			block.lines.push(line);
			block.ids.push(line);
		}

		if ((block.ids.length >= maxIdCount) || (block.lines.length >= maxLineCount)) {
			yield block;
			block = newBlock();
		}
	}
	console.log('Finished');
	if (block.lines.length > 0) yield block;

	function newBlock() {
		return {ids:[],lines:[]};
	}
}
