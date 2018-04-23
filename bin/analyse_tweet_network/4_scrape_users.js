"use strict";

const fs = require('fs');
const async = require('async');
const stream = require('../../lib/streamwriter.js')('userdata.ndjson.xz');
const scraper = require('../../lib/scraper.js')('scrape_user');

var minTweetNumber = 10;

var users = fs.readFileSync('users.tsv', 'utf8');
users = users.split('\n');
users = users.map(u => {
	u = u.split('\t');
	return {name:u[0], count:parseInt(u[1], 10)};
});
users = users.filter(u => u.count >= minTweetNumber);

console.log('Start scraping '+users.length+' users');
if (users.length > 10000) throw Error('Too many users!!!');

var progress = 0;

async.eachLimit(
	users,
	16,
	(entry, cb) => {
		var user = {
			name: entry.name,
			count: entry.count,
		}

		var task = scraper.getSubTask();
		task.finished(() => {
			progress++;
			if (progress % 100 === 0) console.log((100*progress/users.length).toFixed(1)+'%');

			if (user.info) {
				stream.write(JSON.stringify(user)+'\n', cb);
			} else {
				cb();
			}
		})

		task.fetch(
			'statuses/user_timeline',
			{screen_name:entry.name, count:200, exclude_replies:false, include_rts:true, tweet_mode:'extended'},
			tweets => user.tweets = tweets
		)

		task.fetch(
			'friends/ids',
			{screen_name:entry.name, count:5000, stringify_ids:true},
			friends => user.friends = friends
		)

		task.fetch(
			'users/lookup',
			{screen_name:entry.name, tweet_mode:'extended'},
			info => user.info = info
		)
	},
	() => {
		stream.close(() => {
			console.log('Finished');
		});
	}
)

scraper.run();