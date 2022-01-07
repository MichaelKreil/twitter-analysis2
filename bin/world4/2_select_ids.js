"use strict"

const fs = require('fs');
const { Readable } = require('stream');

const miss = require('mississippi2');

const { findDataFile, getDataFile, readXzLines, xzWriter, uniq } = require('./lib/helper.js');

start()

function start() {
	miss.pipeline(
		Readable.from(readXzLines(findDataFile('2_status'), true)),
		miss.through.obj(
			(entry, enc, callback) => {
				entry = entry.split('\t');
				if (entry.length < 2) return callback();
				try {
					entry = JSON.parse(entry[1]);
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
		uniq(),
		xzWriter(getDataFile('3_id')),
	)
}
