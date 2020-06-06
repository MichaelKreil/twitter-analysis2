"use strict";

const fs = require('fs');
const async = require('async');
const scraper = (require('../../lib/scraper.js'))('dump');

var users = 'NieTwojInteresQ'.split(',');

users.forEach(username => {
	var task = scraper.getSubTask();
	var keys = new Set();

	task.allUserTweets(username, tweets => {
		tweets.forEach(t => scanKeys(t))

		var keyList = Array.from(keys.values());
		keyList.sort();
		keys = keyList.map(k => k.split('.'));

		var tsv = tweets.map(t => 
			keys.map(keyPath => {
				var v = t;
				keyPath.forEach(k => v = (v === null) || (v === undefined) ? undefined : v[k]);
				if (typeof v === 'string') return v.replace(/[\t\n]/g, ' ');
				return v && v.toString();
			})
		)
		tsv.unshift(keyList);

		tsv = tsv.map(r => r.join('\t')).join('\n');

		fs.writeFileSync(username+'.tsv', tsv, 'utf8');
	});
	function scanKeys(obj, prefix) {
		if (obj === null) return;

		prefix = prefix ? prefix+'.' : '';
		Object.keys(obj).forEach(key => {
			//console.log(prefix+key, obj[key]);
			if ((obj[key] !== null) && (typeof obj[key] === 'object')) {
				scanKeys(obj[key], prefix+key);
			} else {
				keys.add(prefix+key);
			}
		})
	}
})







