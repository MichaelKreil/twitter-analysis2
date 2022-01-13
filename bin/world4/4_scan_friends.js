"use strict"

const fs = require('fs');
const { Readable } = require('stream');

const miss = require('mississippi2');

const { findDataFile, getDataFile, getTempFile, getXZ, xzWriter, count, jq } = require('./lib/helper.js');

start()

function start() {
	let tempFilename = getTempFile();
	let dataFilename = getDataFile('5_friend_ids');
	
	miss.pipe(
		getXZ(findDataFile('4_friends'), true),
		jq('.ids? | join(",")'),
		count(10),
		xzWriter(tempFilename),
		() => fs.renameSync(tempFilename, dataFilename)
	)
}
