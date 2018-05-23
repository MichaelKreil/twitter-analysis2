"use strict"

const fs = require('fs');
const async = require('async');
const colors = require('colors');
const resolve = require('path').resolve;
const Reader = require('../lib/lzma_reader.js');
const Writer = require('../lib/id_unique_writer.js');
const Progress = require('../lib/progress.js');

const minFactor = 1e6;

var input = resolve(__dirname, '../../../data/world/1_ids/ids_1.tsv.xz');

var progress = new Progress();

var writer = new Writer('../../../data/world/1_ids/temp.tsv.xz');

var buffer = [];

Reader(
	input,
	(user_id, cbEntry, progressValue) => {
		buffer.push(user_id);
		progress.set(progressValue);
		setImmediate(cbEntry);
	},
	() => {
		console.log('add');
		writer.addList(buffer);
		console.log('close');
		writer.close();
	}
)
