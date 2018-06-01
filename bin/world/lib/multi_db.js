"use strict"

const async = require('async');
const fs = require('fs');
const colors = require('colors');
const Levelup = require('level');
const Path = require('path');
const MultiStream = require('multistream')

const singleDatabase = true;

module.exports = Multi_DB

function Multi_DB(path, opts) {
	if (!opts) opts = {};
	ensureDir(path);

	var dbs = [];

	var digitLookup = [0,0,1,1,2,2,3,3,4,4];
	if (singleDatabase) digitLookup = [0,0,0,0,0,0,0,0,0,0];

	var charLookup = {};
	digitLookup.forEach((dbIndex, digit) => {
		if (!dbs[dbIndex]) {
			dbs[dbIndex] = new Levelup(
				Path.resolve(path, dbIndex.toFixed(0)),
				{ keyEncoding:'ascii', valueEncoding: 'utf8', cacheSize:1024*1024*1024*8 }
			);
			dbs[dbIndex].index = dbIndex;
		}
		charLookup[digit.toFixed(0).charCodeAt(0)] = dbs[dbIndex];
	})
	
	function put(key, value, cb) {
		var db = singleDatabase ? dbs[0] : charLookup[key.charCodeAt(key.length-1)];
		db.put(key, value, cb);
	}
	
	function get(key, cb) {
		var db = singleDatabase ? dbs[0] : charLookup[key.charCodeAt(key.length-1)];
		db.get(key, cb);
	}
	
	function batch(batch, cbBatch) {
		var todos = [];
		dbs.forEach((db, index) => todos[index] = []);

		batch.forEach(entry => {
			var index = singleDatabase ? 0 : charLookup[key.charCodeAt(key.length-1)].index;
			todos[index].push(entry);
		})

		async.eachOf(
			todos,
			(batch, index, cb) => dbs[index].batch(batch, cb),
			cbBatch
		)
	}

	function getReadStream() {
		return MultiStream.obj(dbs.map(db => (() => db.createReadStream())));
	}


	return {
		put: put,
		//putBatch: putBatch,
		get: get,
		batch: batch,
		//getAll: getAll,
		getReadStream: getReadStream,
	}
}


function ensureDir(path) {
	if (fs.existsSync(path)) return;

	ensureDir(Path.dirname(path));
	fs.mkdirSync(path);
}