"use strict";

const fs = require('fs');
const lzma = require('lzma-native');
const colors = require('colors');
const path = require('path');


// List of search queries
/*
floridashooting
floridashooting2
iranprotests
iranprotests2
metoo
olympics_2018
pyeongchang2018
trump_mentions
*/

var query = 'bahn';
var dayCount = 9;
var filestream = fs.createWriteStream(query+'.txt');

var folder = path.resolve(__dirname, '../data/'+query+'/');

var fileDays = [], minDate = 1e10, maxDate = 0;
fs.readdirSync(folder).forEach(f => {
	if (!f.startsWith(query)) return;
	if (!f.endsWith('.jsonstream.xz')) return;

	var date = f.slice(query.length+1, -14);
	if (/^201[7-8]-[0-1][0-9]-[0-3][0-9]$/.test(f)) return;

	var filename = path.resolve(folder, f);

	var dateIndex = Math.round(Date.parse(date)/86400000-17521);
	
	if (minDate > dateIndex) minDate = dateIndex;
	if (maxDate < dateIndex) maxDate = dateIndex;

	fileDays[dateIndex] = {
		name: f,
		date: date,
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

var endIndex = startIndex+dayCount-1;
while (!fileDays[endIndex]) endIndex--;

var users = new Map();
var hashtags = new Map();
var tweetCount = 0;

var running = 0;
output('\ninterval: '+fileDays[startIndex].date+' - '+fileDays[endIndex].date);
for (var i = startIndex; i <= endIndex; i++) {
	if (fileDays[i]) {
		running++;
		startScan(fileDays[i].filename, () => {
			running--;
			if (running === 0) finish();
		});
	}
}

function finish() {
	output('\ntweets: '+tweetCount);

	users = Array.from(users.values());
	users.sort((a,b) => b.count - a.count);

	var minCount = 25*dayCount;
	minCount = Math.min(minCount, users[30] && users[30].count);
	users = users.filter(u => u.count >= minCount);
	users = users.map(u => {
		var sources = Array.from(u.sources.values());
		sources.sort((a,b) => b.count - a.count);
		sources = sources.map(s => s.text+':'+s.count).join(',');
		return [u.text, u.count, sources].join('\t')
	}).join('\n');
	output('\nusers');
	output(users);

	hashtags = Array.from(hashtags.values());
	hashtags.sort((a,b) => b.count - a.count);
	hashtags = hashtags.slice(0, 30);
	hashtags = hashtags.map(u => u.text+'\t'+u.count).join('\n');
	output('\nhashtags');
	output(hashtags);
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
			if (!users.has(user)) users.set(user, {text:'@'+user, count:0, sources:new Map()})
			user = users.get(user);
			user.count++;
			var source = chunk.source.replace(/[^0-9<>a-z="/.]+/ig, ' ');
			source = source.replace(/^<a href=\"http/,'');
			source = source.replace(/\" rel=\"nofollow\">/,' ');
			source = source.replace(/<\/a>$/,'');
			if (!user.sources.has(source)) user.sources.set(source, {text:source, count:0})
			user.sources.get(source).count++;

			tweetCount++;

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

function output(text) {
	console.log(colors.yellow(text));
	filestream.write(text+'\n');
}

