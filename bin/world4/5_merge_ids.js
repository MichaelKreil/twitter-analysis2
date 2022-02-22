"use strict"

const fs = require('fs');
const { Readable } = require('stream');

const miss = require('mississippi2');

const { uniqSortedLines, lineMerger, findDataFile, getDataFile, getTempFile, getXZ, xzWriter } = require('./lib/helper.js');

start()

function start() {
	//let inputFilename1 = findDataFile('3_ids');
	//let inputFilename2 = findDataFile('5_friend_ids');
	//let tempFilename = getTempFile();
	//let dataFilename = getDataFile('1_ids');

	let inputFilename1 = 'lib/1_ids-2022_01_06_205348.tsv.xz';
	let inputFilename2 = 'lib/5_friend_ids-2022_01_06_143013.tsv.xz';
	let tempFilename   = 'lib/tempFile.tsv.xz';
	let dataFilename   = 'lib/dataFile.tsv.xz';

	miss.pipe(
		uniqSortedLines([
			getXZ(inputFilename1).pipe(miss.split()),
			getXZ(inputFilename2, true).pipe(miss.split()),
		]),
		lineMerger(),
		xzWriter(tempFilename),
		() => fs.renameSync(tempFilename, dataFilename)
	)
}
