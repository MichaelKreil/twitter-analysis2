"use strict";

const scraper = (require('../../lib/scraper.js'))();
const async = require('async');
const zlib = require('zlib');
const fs = require('fs');
const path = require('path');

var entries = [
	'afd:AfD',
	'afd:AfD/bundestagsabgeordnete',
	'afd:AfD/bundesvorstand',
	'afd:AfD/europawahl',
	'afd:AfD/landtagsabgeordnete',
	'afd:guidoreil',
	'afd:joachim_kuhs',
	'afd:Joerg_Meuthen',
	'afd:KrahMax',
	'afd:larspatrickberg',
	'afd:Nicolaus_Fest',

	'cdu_csu:CDU',
	'cdu_csu:CDU_CSU_EP',
	'cdu_csu:CDU_CSU_EP/cdu-csu-ep',
	'cdu_csu:cducsubt',
	'cdu_csu:cducsubt/csu-mdbs',
	'cdu_csu:cducsubt/mdbs-19-wp1',
	'cdu_csu:cducsupm',
	'cdu_csu:CSU',
	'cdu_csu:_FriedrichMerz',
]

var users = new Set();

async.eachLimit(
	entries,
	4,
	(entry, cb) => {
		entry = entry.toLowerCase();
		var parts = entry.split(':');
		if (parts[1].includes('/')) {
			getAccounts(parts[1], accounts => {
				accounts.forEach(account => users.add(parts[0]+':'+account.toLowerCase()))
				cb();
			})
		} else {
			users.add(entry)
			cb();
		}
	},
	() => {
		users = Array.from(users.values());
		async.eachLimit(
			users,
			4,
			(entry, cb) => {
				console.log('scan '+entry);
				var parts = entry.split(':');
				scanTweets(parts[1], newTweets => {
					var folder = path.resolve(__dirname, 'results', parts[0]);
					ensureFolder(folder);

					var filename = path.resolve(folder, parts[1]+'.json.gz');

					var oldTweets = fs.existsSync(filename) ? loadTweets(filename) : [];
					newTweets = updateTweets(oldTweets, newTweets);

					saveTweets(filename, newTweets);

					cb();
				})
			},
			() => {
				console.log('finished');
			}
		)
	}
)

scraper.run();

function loadTweets(filename) {
	var tweets = fs.readFileSync(filename);

	tweets = zlib.gunzipSync(tweets);
	tweets = tweets.toString('utf8');
	tweets = JSON.parse(tweets);

	return tweets;
}

function saveTweets(filename, tweets) {
	tweets = JSON.stringify(tweets);
	tweets = Buffer.from(tweets);
	tweets = zlib.gzipSync(tweets, {level:9});

	fs.writeFileSync(filename, tweets);
}

function updateTweets(listOld, listNew) {
	var entries = new Map();
	listOld.forEach(t => entries.set(t.id_str, t));

	listNew.forEach(t => {
		if (entries.has(t.id_str)) {
			var oldEntry = entries.get(t.id_str);
			var diff = getDiff(oldEntry.tweet, t);
			oldEntry.history.push(diff);
			//if (JSON.stringify(diff).length > 40) console.log(diff);
			oldEntry.tweet = t;
		} else {
			entries.set(t.id_str, {
				id_str:t.id_str,
				tweet:t,
				history:[],
			})
		}
	})

	entries = Array.from(entries.values());

	return entries;
}

function getDiff(obj1, obj2, path) {
	// generate a diff:
	// use the diff to patch obj2, to generate obj1

	if (!path) path = '';
	var diff = {};

	if (!isObject(obj1)) { console.log(obj1); throw Error() };
	if (!isObject(obj2)) { console.log(obj2); throw Error() };

	var keys = new Set();
	Object.keys(obj1).forEach(k => keys.add(k));
	Object.keys(obj2).forEach(k => keys.add(k));

	keys = Array.from(keys.values());

	keys.forEach(k => {
		if (obj1[k] === obj2[k]) return;
		if (JSON.stringify(obj1[k]) === JSON.stringify(obj2[k])) return;

		if ((typeof obj1[k]) !== (typeof obj2[k])) return diff[k] = obj1[k];

		if ((typeof obj1[k]) === 'string' ) return diff[k] = obj1[k];
		if ((typeof obj1[k]) === 'number' ) return diff[k] = obj1[k];
		if ((typeof obj1[k]) === 'boolean') return diff[k] = obj1[k];

		if (isObject(obj1[k]) && isObject(obj2[k])) return diff[k] = getDiff(obj1[k], obj2[k]);

		return diff[k] = obj1[k];
	})

	return diff;

	function isObject(obj) {
		if (typeof obj !== 'object') return false
		if (obj === null) return false;
		return true;
	}

	function isDefined(obj) {
		if (obj === undefined) return false;
		if (obj === null) return false;
		return true;
	}
}


function getAccounts(list, cb) {
	var url = list.split('/');
	var task = scraper.getSubTask();
	task.fetch(
		'lists/members',
		{
			owner_screen_name: url[0],
			slug: url[1],
			count: 5000,
			skip_status: true,
		},
		result => {
			var list = result.users.map(u => u.screen_name);
			cb(list);
		}
	)
}


function scanTweets(name, cbScanTweets) {
	//console.log(colors.grey('start '+name));
	var task = scraper.getSubTask();
	var tweets = [];
	scan();

	function scan(maxId) {
		task.fetch(
			'statuses/user_timeline',
			{screen_name: name, count:200, max_id:maxId, tweet_mode:'extended'},
			result => {
				if (result.error) return finalize();

				if (!result) result = [];

				var finished = !result.length;
				if (!finished) {
					var minId = result[result.length-1].id_str;
					minId = dec(minId);
				}
				result.forEach(t => {
					t.updated = (new Date()).toISOString();
				})

				tweets.push(result);

				if (finished) return finalize();
				
				scan(minId);
			}
		)
	}

	function finalize() {
		tweets = Array.prototype.concat.apply([], tweets);
		cbScanTweets(tweets);
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
}

function ensureFolder(folder) {
	if (fs.existsSync(folder)) return;
	ensureFolder(path.dirname(folder));
	fs.mkdirSync(folder);
}



