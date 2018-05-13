"use strict";

const fs = require('fs');
const lzma = require('lzma-native');
const path = require('path');
const colors = require('colors');
const extractText = require('../../lib/extract-text.js');

var query = 'rp18';

var folder = path.resolve(__dirname, '../../data/search_and_dump/'+query+'/');

var fileDays = [];
fs.readdirSync(folder).forEach(f => {
	if (!f.startsWith(query)) return;
	if (!f.endsWith('.jsonstream.xz')) return;

	var date = f.slice(query.length+1, -14);
	if (/^201[7-8]-[0-1][0-9]-[0-3][0-9]$/.test(f)) return;

	var filename = path.resolve(folder, f);

	var dateIndex = Math.round(Date.parse(date)/86400000-17521);

	fileDays[dateIndex] = {
		name: f,
		date: date,
		filename: filename,
		size: fs.statSync(filename).size
	}
})

var texts = [];

var running = 0;

fileDays.forEach(f => {
	if (!f) return;
	running++;
	startScan(f.filename, () => {
		running--;
		if (running === 0) finish();
	});
})

function finish() {
	texts = texts.join('\n');
	fs.writeFileSync('result.txt', texts, 'utf8');
}

function startScan(filename, cb) {
	console.log(colors.grey('start '+filename));

	var input = fs.createReadStream(filename);
	var decompressor = lzma.createDecompressor();

	input.pipe(decompressor);

	var buffer = [];
	decompressor.on('data', chunk => {
		buffer.push(chunk);
		if (buffer.length > 1000) flush();
	})
	decompressor.on('end', () => {
		flush()
		console.log(colors.grey('finished '+filename));
		cb();
	});

	function flush() {
		buffer = Buffer.concat(buffer);
		var i0 = 0;

		while (true) {
			var i1 = buffer.indexOf(10, i0);
			if (i1 < 0) break;

			var tweet = buffer.slice(i0, i1);
			i0 = i1+1;

			tweet = tweet.toString('utf8');
			tweet = JSON.parse(tweet);

			if (tweet.retweeted_status) continue;

			var text = extractText(tweet.full_text);

			texts.push(text);
		}

		buffer = [buffer.slice(i0)];
	}
}
