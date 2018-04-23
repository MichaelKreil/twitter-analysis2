"use strict";

const fs = require('fs');
const lzma = require('lzma-native');
const path = require('path');
const async = require('async');
const colors = require('colors');
const extractText = require('../../lib/extract-text.js');

var query = 'rechts2';

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

fileDays = fileDays.filter(f => f);

var tweets = new Map();

async.eachLimit(
	fileDays,
	2,
	(f, cb) => { startScan(f.filename, cb) },
	() => {
		tweets = Array.from(tweets.values());
		tweets.forEach(t => {
			t.retweeters = Array.from(t.retweeters.values());
		});

		fs.writeFileSync('tweets.json', JSON.stringify(tweets), 'utf8');
	}
)

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
		console.log(tweets.size);

		buffer = Buffer.concat(buffer);
		var i0 = 0;

		while (true) {
			var i1 = buffer.indexOf(10, i0);
			if (i1 < 0) break;

			var tweet = buffer.slice(i0, i1);
			i0 = i1+1;

			tweet = tweet.toString('utf8');
			tweet = JSON.parse(tweet);

			if (tweet.retweeted_status) {
				if (!tweets.has(tweet.retweeted_status.id_str)) addTweet(tweet.retweeted_status);

				var temp = tweets.get(tweet.retweeted_status.id_str);
				temp.retweeters.set(tweet.id_str, {
					user: tweet.user.screen_name,
					created_at: tweet.created_at,
				})
			} else {
				addTweet(tweet);
			}

			function addTweet(tweet) {
				tweets.set(tweet.id_str, {
					id_str: tweet.id_str,
					created_at: tweet.created_at,
					text: extractText(tweet.full_text),
					user: tweet.user.screen_name,
					retweeters: new Map(),
				})
			}
		}

		buffer = [buffer.slice(i0)];
	}
}

