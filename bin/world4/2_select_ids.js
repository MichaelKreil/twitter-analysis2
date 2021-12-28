"use strict"

const fs = require('fs');
const { Readable } = require('stream');
const { resolve } = require('path');

const miss = require('mississippi2');

const { readXzLines, xzWriter, uniq } = require('./lib/helper.js');

const dataFolder = '/root/data/twitter/world4';

start()

function start() {
	miss.pipeline(
		Readable.from(readXzLines(resolve(dataFolder, '2_status-2021-12-28-19-10-25.tsv.xz'), true)),
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
		xzWriter(resolve(dataFolder, `3_id-${getTime()}.tsv.xz`)),
	)
}

function getTime() {
	return (new Date()).toISOString().split(/[^0-9]+/g).slice(0,6).join('-');
}
