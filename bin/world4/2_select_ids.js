"use strict"

const fs = require('fs');
const { Readable } = require('stream');

const miss = require('mississippi2');

const { findDataFile, getDataFile, getTempFile, readXzLines, xzCompressor, getRust } = require('./lib/helper.js');

start()

function start() {
	let tempFilename = getTempFile();
	let dataFilename = getDataFile('3_ids');
	
	miss.pipe(
		Readable.from(readXzLines(findDataFile('2_status'), true)),
		miss.through.obj(
			(entry, enc, callback) => {
				try {
					entry = JSON.parse(entry);
				} catch (err) {
					console.error(entry);
					console.error(err);
					return callback();
				}
				if (entry.protected) return callback();
				if (entry.followers_count < 1000) return callback();
				callback(null, entry.id_str+'\n');
			}
		),
		getRust('uniq'),
		xzCompressor(),
		fs.createWriteStream(tempFilename),
		() => fs.renameSync(tempFilename, dataFilename)
	)
}
