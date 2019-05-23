"use strict";

var name = 'botometer_2019-05-08_2';

const fs = require('fs');
const miss = require('mississippi2');
const Levelup = require('level');
const lzma = require('lzma-native');

var path = require('path').resolve(__dirname, '../cache/', name);
var db = Levelup(path, {keyEncoding:'utf8', valueEncoding:'utf8'});

var count = 0, index = 0, startTime;
countEntries(() => dumpEntries())

function countEntries(cb) {
	console.log('Counting ...')
	miss.pipe(
		db.createKeyStream(),
		miss.to.obj((chunk, enc, cb) => {
			count++;
			if (count % 10000 === 0) console.log('   '+count);
			cb();
		}),
		() => { if (cb) cb() }
	)
}

function dumpEntries(cb) {
	console.log('Dumping '+count+' entries ...');
	startTime = Date.now();
	miss.pipe(
		db.createReadStream(),
		miss.through.obj((chunk, enc, cb) => {
			index++;
			if (index % 1000 === 0) console.log([
				'   '+(100*index/count).toFixed(1)+'%   ',
				(new Date((Date.now()-startTime)*(count-index)/index)).toLocaleTimeString()
			].join(''));
			cb(null, JSON.stringify(chunk)+'\n')
		}),
		lzma.createCompressor({
			check: lzma.CHECK_NONE,
			preset: 9,
			synchronous: false,
			threads: 1,
		}),
		fs.createWriteStream('dbdump_'+name+'.xz'),
		() => { if (cb) cb() }
	)
}