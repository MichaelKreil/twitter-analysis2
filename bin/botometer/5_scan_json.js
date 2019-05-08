"use strict";

const fs = require('fs');
const async = require('async');
const botometer = require('../../lib/botometer.js');
//const scraper = require('../../lib/scraper.js')('botometer2');
const cache = require('../../lib/cache.js')('botometer3');
//const colors = require('colors');

var users = JSON.parse(fs.readFileSync('old_congress.json', 'utf8'));


async.eachOfLimit(
	users, 4,
	(user, index, cb) => {
		if (index % 20 === 0) console.log((100*index/users.length).toFixed(1)+'%');
		var screen_name = user.user.screen_name;
		cache(
			screen_name,
			cbResult => botometer(screen_name, cbResult),
			data => {
				if (!data.scores) return cb();
				console.log([screen_name, user.score, (data.scores.english).toFixed(2)].join('\t'));

				cb();
			}
		)
	},
	() => {
	}
)
