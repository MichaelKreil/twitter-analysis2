"use strict"

const fs = require('fs');
const { Readable } = require('stream');

const miss = require('mississippi2');

const { findDataFile, getDataFile, getTempFile, getXZ, xzWriter, getRust } = require('./lib/helper.js');

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
		getRust('count_in_array', [30, 64*1024*1024]),
		xzWriter(tempFilename),
		() => fs.renameSync(tempFilename, dataFilename)
	)
}
