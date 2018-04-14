"use strict";

const fs = require('fs');
const lzma = require('lzma-native');
const path = require('path');
const async = require('async');
const colors = require('colors');
const stream = require('stream');


var query = 'afd_orgs_01';
var dayCount = 7;
var filestream = fs.createWriteStream(query+'.txt');

var folder = path.resolve(__dirname, '../../data/search_and_dump/'+query+'/');

var fileDays = getDays();

var users = new Map();
var hashtags = new Map();
var tweetCount = 0;
var startTime = Date.now();
var filesizeSum = fileDays.reduce((sum,day) => sum+day.filesize, 0);
var filesizePos = 0;

output('\ninterval: '+fileDays[0].date+' - '+fileDays[fileDays.length-1].date);
async.eachSeries(
	fileDays,
	(day, cb) => startScan(day.filename, cb),
	finish
)

var progressInterval = setInterval(() => {
	var duration = Date.now()-startTime;
	console.log([
		(100*filesizePos/filesizeSum).toFixed(1)+'%',
		(tweetCount*1000/duration).toFixed(0)+' tweets/s',
		fmtTime(duration*(filesizeSum-filesizePos)/filesizePos)+' left',
	].join('\t'));
}, 10000)

function finish() {
	clearInterval(progressInterval);
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
	var passthrough = new stream.PassThrough();
	var decompressor = lzma.createDecompressor();

	passthrough.on('data', chunk => filesizePos += chunk.length);

	input.pipe(passthrough).pipe(decompressor);

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
			tweet = tweet.replace(/\"retweeted_status\":\{.*\},\"is_quote_status/, '"is_quote_status');
			//console.dir(tweet);
			tweet = JSON.parse(tweet);
			//console.dir(tweet);
			//process.exit();

			// add user
			var user = tweet.user.screen_name;
			if (!users.has(user)) users.set(user, {text:'@'+user, count:0, sources:new Map()})
			user = users.get(user);
			user.count++;
			var source = tweet.source.replace(/[^0-9<>a-z="/.]+/ig, ' ');
			source = source.replace(/^<a href=\"http/,'');
			source = source.replace(/\" rel=\"nofollow\">/,' ');
			source = source.replace(/<\/a>$/,'');
			if (!user.sources.has(source)) user.sources.set(source, {text:source, count:0})
			user.sources.get(source).count++;

			tweetCount++;

			// add hashtags
			tweet.entities.hashtags.forEach(h => {
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

function getDays() {
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
			filesize: fs.statSync(filename).size
		}
	})

	var maxSize = 0, startIndex = minDate;
	for (var i = minDate; i <= maxDate-dayCount+1; i++) {
		var size = 0;
		for (var j = i; j <= i+dayCount-1; j++) {
			if (fileDays[j]) size += fileDays[j].filesize;
		}
		if (size > maxSize) {
			maxSize = size;
			startIndex = i;
		}
	}

	var endIndex = startIndex+dayCount-1;
	while (!fileDays[endIndex]) endIndex--;

	fileDays = fileDays.slice(startIndex, endIndex+1);
	fileDays = fileDays.filter(d => d);

	return fileDays;
}

function fmtTime(timestamp) {
	return [
		Math.floor(timestamp/3600000),
		(Math.floor(timestamp/60000) % 60 + 100).toFixed(0).slice(1),
		(Math.floor(timestamp/1000) % 60 + 100).toFixed(0).slice(1),
	].join(':');
}


