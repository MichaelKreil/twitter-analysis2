"use strict"

const fs = require('fs');
const colors = require('colors');
const scraper = (require('../../lib/scraper.js'))('scan_verified');

const dateStart = new Date('2018-02-05 00:00:00');
const dateEnd   = new Date('2018-02-12 00:00:00');

var accounts = fs.readFileSync('accounts.txt', 'utf8').split('\n').filter(t => t.length > 1);

var file = fs.openSync('result.txt', 'w');

var task1 = scraper.getSubTask();
var buffer = [];

for (var i = 0; i < 4; i++) next();

function next() {
	if (accounts.length === 0) return;
	var name = accounts.pop();

	task1.fetch('users/show', {screen_name:name}, user => {
		if (!user.verified) return next();
		if (user.protected) return next();

		scanTweets(name, dayCount => {
			if (!dayCount) return next();
			var sum = 0, min = 1e10;
			for (var i = 0; i < 7; i++) {
				sum += dayCount[i];
				if (min > dayCount[i]) min = dayCount[i];
			}
			var result = [user.screen_name,user.followers_count,user.statuses_count,sum,min,dayCount.join('\t')].join('\t')+'\n';
			buffer.push(result);
			if (buffer.length > 10000) dump();

			if (sum >= 350) console.log(result);
			next();
		})
	})
}

function dump() {
	fs.writeSync(file, buffer.join(''));
	buffer = [];
}

task1.finished(() => {
	dump();
	fs.closeSync(file);
})

function scanTweets(name, cb) {
	var days = [];
	for (var i = 0; i < 7; i++) days[i] = 0;
	scan();

	function scan(maxId) {
		task1.fetch(
			'statuses/user_timeline',
			{screen_name: name, count:200, max_id:maxId, trim_user:true},
			result => {
				if (result.error) return cb(false);
				//console.log(result);
				//process.exit();
				var finished = (result.length < 10);
				result.forEach(tweet => {
					var date = new Date(tweet.created_at);
					if (date < dateStart) finished = true;
					date = date.getTime() - dateStart.getTime();
					date = Math.floor(date/86400000);
					if (date < 0) return;
					if (date > 6) return;
					days[date]++;
				})
				if (finished) {
					return cb(days);
				} else {
					var minId = result[result.length-1].id_str;
					scan(dec(minId));
				}
			}
		)
	}
}

function dec(id) {
	id = id.split('');
	for (var i = id.length-1; i >= 0; i--) {
		var c = parseInt(id[i], 10);
		if (c === 0) {
			id[i] = '9';
		} else {
			id[i] = (c-1).toFixed(0);
			return id.join('');
		}
	}
}



