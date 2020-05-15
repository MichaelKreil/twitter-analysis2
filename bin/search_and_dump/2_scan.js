"use strict";

const fs = require('fs');
const lzma = require('lzma-native');
const resolve = require('path').resolve;
const async = require('async');
const colors = require('colors');
const stream = require('stream');


var query = '#maennerwelten';
var filestream = fs.createWriteStream(query+'.txt');

var files = getFiles(resolve(__dirname, '../../data/search_and_dump/'));

var users = new Map();
var hashtags = new Map();
var tweetCount = 0;
var startTime = Date.now();
var filesizeSum = files.reduce((sum,file) => sum+file.filesize, 0);
var filesizePos = 0;

async.eachLimit(
	files,
	4,
	(file, cb) => startScan(file.fullname, cb),
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

	var minCount = 20;
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
	hashtags = hashtags.filter(h => h.count >= minCount);
	hashtags.sort((a,b) => b.count - a.count);
	hashtags = hashtags.map(h => h.text+'\t'+h.count).join('\n');
	output('\nhashtags');
	output(hashtags);
}

function startScan(filename, cb) {
	var shortName = filename.split('/').pop();
	console.log(colors.grey('   start '+shortName));

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
		console.log(colors.grey('   finished '+shortName));
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

function getFiles(folder) {
	var subfolders = fs.readdirSync(folder).map(f => {
		if (!f.startsWith(query)) return false;
		f = resolve(folder, f);
		if (!fs.statSync(f).isDirectory) return false;
		return f;
	}).filter(f => f);

	var files = [];
	subfolders.forEach(subfolder => {
		fs.readdirSync(subfolder).forEach(filename => {
			if (!filename.startsWith(query)) return;
			if (!filename.endsWith('.jsonstream.xz')) return;

			var date = filename.slice(query.length+1, -14);
			if (/^20\d\d-\d\d-\d\d$/.test(filename)) return;

			var fullname = resolve(subfolder, filename);

			files.push({
				name: filename,
				date: date,
				fullname: fullname,
				filesize: fs.statSync(fullname).size
			})
		})
	})

	return files;
}



function fmtTime(timestamp) {
	return [
		 Math.floor(timestamp/3600000),
		(Math.floor(timestamp/  60000) % 60 + 100).toFixed(0).slice(1),
		(Math.floor(timestamp/   1000) % 60 + 100).toFixed(0).slice(1),
	].join(':');
}


