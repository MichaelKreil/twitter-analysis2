"use strict";

const fs = require('fs');
const lzma = require('lzma-native');
const colors = require('colors');
const path = require('path');


// List of search queries

var query = 'floridashooting';
var dayCount = 9;

var folder = path.resolve(__dirname, '../data/'+query+'/');

var fileDays = [], minDate = 1e10, maxDate = 0;
fs.readdirSync(folder).forEach(f => {
	if (!f.startsWith(query)) return;
	if (!f.endsWith('.jsonstream.xz')) return;

	var date = f.slice(query.length+1, -14);
	if (/^201[7-8]-[0-1][0-9]-[0-3][0-9]$/.test(f)) return;

	var filename = path.resolve(folder, f);

	date = Math.round(Date.parse(date)/86400000-17521);
	
	if (minDate > date) minDate = date;
	if (maxDate < date) maxDate = date;

	fileDays[date] = {
		name: f,
		filename: filename,
		size: fs.statSync(filename).size
	}
})

var maxSize = 0, startIndex = minDate;
for (var i = minDate; i <= maxDate-dayCount+1; i++) {
	var size = 0;
	for (var j = i; j <= i+dayCount-1; j++) {
		if (fileDays[j]) size += fileDays[j].size;
	}
	if (size > maxSize) {
		maxSize = size;
		startIndex = i;
	}
}

var users = new Map();
var hashtags = new Map();
var tweetCount = 0;

var running = 0;
for (var i = startIndex; i <= startIndex+dayCount-1; i++) {
	if (fileDays[i]) {
		running++;
		startScan(fileDays[i].filename, () => {
			running--;
			if (running === 0) finish();
		});
	}
}

function finish() {
	console.log('tweets: '+tweetCount);
	console.log('');



	users = Array.from(users.values());
	users.sort((a,b) => b.count - a.count);

	var minCount = 25*dayCount;
	minCount = Math.min(minCount, users[30].count);
	users = users.filter(u => u.count >= minCount);
	users = users.map(u => u.text+'\t'+u.count).join('\n');
	console.log(users);
	console.log('');



	hashtags = Array.from(hashtags.values());
	hashtags.sort((a,b) => b.count - a.count);
	hashtags = hashtags.slice(0, 30);
	hashtags = hashtags.map(u => u.text+'\t'+u.count).join('\n');
	console.log(hashtags);
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

			var chunk = buffer.slice(i0, i1);
			i0 = i1+1;

			chunk = chunk.toString('utf8');
			chunk = JSON.parse(chunk);

			// add user
			var user = chunk.user.screen_name;
			if (!users.has(user)) users.set(user, {text:'@'+user, count:0})
			users.get(user).count++;

			tweetCount++

			// add hashtags
			chunk.entities.hashtags.forEach(h => {
				var hashtag = h.text.toLowerCase();
				if (!hashtags.has(hashtag)) hashtags.set(hashtag, {text:'#'+hashtag, count:0})
				hashtags.get(hashtag).count++;
			})
		}

		buffer = [buffer.slice(i0)];
	}
}

