"use strict"

const fs = require('fs');
const { Readable } = require('stream');

const miss = require('mississippi2');

const { findDataFile, getDataFile, getTempFile, getXZ, xzCompressor, getRust } = require('./lib/helper.js');

start()

function start() {
	let inputFilename = findDataFile('4_friends');
	let tempFilename = getTempFile();
	let dataFilename = getDataFile('5_friend_ids');
	/*
	inputFilename = 'lib/friends_3000.tsv.xz';
	tempFilename = 'lib/temp.tsv.xz';
	dataFilename = 'lib/result.tsv.xz';
	*/
	miss.pipe(
		getXZ(inputFilename, true),
		getRust('count_in_array', [10, 64*1024*1024]),
		xzCompressor(),
		fs.createWriteStream(tempFilename),
		() => fs.renameSync(tempFilename, dataFilename)
	)
}
