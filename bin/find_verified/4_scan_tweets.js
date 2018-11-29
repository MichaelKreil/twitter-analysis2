"use strict"

const fs = require('fs');
const zlib = require('zlib');
const colors = require('colors');
const scraper = (require('../../lib/scraper.js'))();

const dateStart = new Date('2018-06-01 00:00:00');
const maxProcesses = 4;

var accounts = fs.readFileSync('data/4_verified.tsv', 'utf8').split('\n').filter(t => t.length > 1);
var task1 = scraper.getSubTask();
var processCount = 0;

var accountsCount = accounts.length;

next();

function next() {
	if (processCount >= maxProcesses) return;
	if (accounts.length === 0) return;

	if (accounts.length % 100 === 0) {
		console.log(colors.grey((100*(accountsCount-accounts.length)/accountsCount).toFixed(2)+' %'));
	}

	var name = accounts.pop();

	processCount++;

	fetchTweets(name, () => {
		processCount--;
		next();
	});

	next();
}

function fetchTweets(name, cbfetchTweets) {
	var filename = 'data/tweets/'+name.replace(/[^a-z0-9_-]/g, '_')+'.json.gz';

	if (fs.existsSync(filename)) return cbfetchTweets();

	var data = {};
	task1.fetch('users/show', {screen_name:name}, user => {
		data.user = user;

		scanTweets(name, tweets => {
			data.tweets = tweets;
			data = Buffer.from(JSON.stringify(data), 'utf8');
			data = zlib.gzipSync(data, {level:9});
			fs.writeFileSync(filename, data);

			cbfetchTweets();
		})
	})
}

task1.finished(() => {
	console.log('Finished'.bold().green());
})

function scanTweets(name, cbscanTweets) {
	//console.log(colors.grey('start '+name));
	var tweets = [];
	scan();

	function scan(maxId) {
		task1.fetch(
			'statuses/user_timeline',
			{screen_name: name, count:200, max_id:maxId, trim_user:true},
			result => {
				if (result.error) return finalize();

				if (!result) result = [];

				var finished = !result.length;
				if (!finished) {
					var date = new Date(result[result.length-1].created_at);
					if (date < dateStart) finished = true;
				}
				if (!finished) {
					var minId = result[result.length-1].id_str;
					minId = dec(minId);
				}

				result = result.map(t => ({
					created_at: t.created_at,
					id_str: t.id_str,
					text: t.text,
					entities: t.entities,
					source: t.source,
					user: t.user,
					retweet_count: t.retweet_count,
					favorite_count: t.favorite_count,
					lang: t.lang,
				}))
				tweets.push(result);

				if (finished) return finalize();
				
				scan(minId);
			}
		)
	}

	function finalize() {
		tweets = Array.prototype.concat.apply([], tweets);
		//console.log(colors.grey('finish '+name));
		cbscanTweets(tweets);
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



