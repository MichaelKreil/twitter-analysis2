"use strict"

const fs = require('fs');
const { Readable } = require('stream');

const miss = require('mississippi2');

const { uniqSortedLines, lineMerger, findDataFile, getDataFile, getTempFile, readXzLines, xzWriter } = require('./lib/helper.js');

start()

function start() {
	let inputFilename1 = findDataFile('3_ids');
	let inputFilename2 = findDataFile('5_friend_ids');
	let tempFilename = getTempFile();
	let dataFilename = getDataFile('1_ids');

	miss.pipe(
		uniqSortedLines([
			readXzLines(inputFilename1),
			readXzLines(inputFilename2, true),
		]),
		lineMerger(),
		xzWriter(tempFilename),
		() => fs.renameSync(tempFilename, dataFilename)
	)
}
