"use strict";

var name = 'botometer2';

const fs = require('fs');
const miss = require('mississippi2');
const Levelup = require('level');
const lzma = require('lzma-native');

var path = require('path').resolve(__dirname, '../cache/', name);
var db = Levelup(path, {keyEncoding:'utf8', valueEncoding:'utf8'});

db.createReadStream()
	.pipe(miss.through.obj((chunk, enc, cb) => cb(null, JSON.stringify(chunk)+'\n')))
	.pipe(lzma.createCompressor(
		{
			check: lzma.CHECK_NONE,
			preset: 9,
			synchronous: false,
			threads: 1,
		}
	))
	.pipe(fs.createWriteStream('dbdump_'+name+'.xz'));