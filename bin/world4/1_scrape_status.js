"use strict"

const scraper = require('../../../lib/scraper.js')();


start()

async function start() {
	await pipeline([
		getBlocks(),
		parallelTransform(processBlock, 8),
		writeBlocks(),
	])
}

async function* getBlocks() {
	const maxIdCount = 100;
	const maxLineCount = 10000;

	let block = newBlock();
	for await (let entry of readLinesMulti(['1_ids-2021-12-28-13-04.txt.xz'])) {
		let id = entry.id;
		if (!id) throw Error();

		let line = [id]
		block.lines.push(line);
		block.ids.push(line);

		if ((block.ids.length >= maxIdCount) || (block.lines.length >= maxLineCount)) {
			yield block;
			block = newBlock;
		}
	}
	if (block.lines.length > 0) yield block;

	function newBlock() {
		return {ids:[],lines:[]};
	}
}

function processBlock(block) {
	return new Promise(resolve => {
			



		scraper.fetch(
			'users/lookup',
			{ user_id:ids.join(','), include_entities:false, tweet_mode:'extended' },
			result => {
				console.log(result)
				/*
			if (resolve) resolve();
			processResults(result);
			concurrentBlocks--;
			*/
			}
		)
	})
}

function processResults(result) {

}
