"use strict";

const fs = require('fs');
const async = require('async');
const colors = require('colors');
const config = require('./config.js');
const scraper = (require('../../lib/scraper.js'))('measure_interactions');

var lists, users;

async.eachSeries(
	config.parlaments,
	(parl, cbParl) => {
		var lists, users;

		async.series([fetchLists, fetchTweets, saveData], cbParl)

		function fetchLists(cbFetchList) {
			lists = [];
			parl.lists.forEach(l => {
				var parts = l.url.match(/^https:\/\/twitter\.com\/([^\/]+)\/lists\/([^\/]+)\/?$/i);
				if (!parts) throw Error();
				l.user = parts[1];
				l.slug = parts[2];
				lists.push(l)
			});

			var task = scraper.getSubTask();

			lists.forEach(list => {
				task.fetch(
					'lists/members',
					{ owner_screen_name: list.user, slug: list.slug, count: 5000, skip_status:true, include_entities:false },
					result => list.users = result.users.map(u => ({user:u}))
				)
			})

			task.finished(cbFetchList);
		}

		function fetchTweets(cbFetchTweets) {
			users = [];
			lists.forEach(l => l.users.forEach(u => users.push(u)))

			var task = scraper.getSubTask();

			var index = 0;
			async.eachLimit(
				users, 50,
				(user, cb) => {
					task.allUserTweets(
						user.user.screen_name,
						tweets => {
							if (index % 10 === 0) console.log((100*index/users.length).toFixed(1)+'%');
							index++;
							if (user.user.screen_name === 'kahrs') {
								fs.writeFileSync('kahrs.json', JSON.stringify(tweets), 'utf8');
								console.log('written');
							}
							//console.dir(tweets, {colors:true, depth:6});
							//process.exit();
							//if (tweets.length > 100) process.exit();
							user.tweets = tweets.map(t => ([
								t.id_str,
								Math.round(Date.parse(t.created_at)/1000),
								t.entities.user_mentions.map(u => u.id_str).join(',') || 0,
								t.in_reply_to_status_id_str || 0,
								t.in_reply_to_user_id_str || 0,
							]));
							cb();
						}
					)
				},
				cbFetchTweets
			)
		}

		function saveData(cbSaveData) {
			fs.writeFileSync(parl.name.toLowerCase()+'.json', JSON.stringify(parl), 'utf8');
			cbSaveData();
		}
	},
	() => {
		console.log(colors.green('finished'));
	}
)







