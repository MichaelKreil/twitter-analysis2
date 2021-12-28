"use strict"

const fs = require('fs');
const { Readable } = require('stream');
const { resolve } = require('path');

const miss = require('mississippi2');
const through2Concurrent = require('through2-concurrent');

const scraper = require('../../lib/scraper.js')();
const { readLinesMulti, xzWriter } = require('./lib/helper.js');

const dataFolder = '/root/data/twitter/world4'

start()

function start() {
	miss.pipeline(
		Readable.from(getBlocks()),
		through2Concurrent.obj(
			{ maxConcurrency: 8 },
			(block, enc, callback) => {
				let now = Date.now();
				scraper.fetch(
					'users/lookup',
					{ user_id:block.ids.join(','), include_entities:false, tweet_mode:'extended' },
					result => {
						let lookup = new Map(block.ids.map(e => [e[0],e]));
						result.forEach(u => {
							u.now = now;
							let line = lookup.get(u.id_str);
							if (!line) return;
							line[0] = u.id_str+'\t'+JSON.stringify(u);
						})
						let buffer = Buffer.from(block.lines.join('\n')+'\n');
						callback(null, buffer);
					}
				)
			}
		),
		xzWriter(resolve(dataFolder, `2_status-${getTime()}.tsv.xz`)),
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

function getTime() {
	return (new Date()).toISOString().split(/[^0-9]+/g).slice(0,6).join('-');
}
