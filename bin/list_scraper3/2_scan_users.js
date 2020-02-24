"use strict";

const fs = require('fs');
const async = require('async');
const scraper = require('../../lib/scraper.js')('list_scraper');

var lists = new Map();

var users = fs.readFileSync('users_in.txt', 'utf8').split('\n').map(l => {
	l = l.trim();
	if (l.length < 3) return false;
	l = l.split('\t');
	return {group:l[0], screen_name:l[1], lists:[]};
}).filter(t => t)

var index = 0;
async.eachLimit(
	users, 10,
	(user, cb) => scraper.fetch(
		'lists/memberships', {screen_name: user.screen_name, count: 200},
		result => {
			index++;
			if (index % 30 === 0) console.log((100*index/users.length).toFixed(1)+'%');
			if (!result.lists) return;

			if (result.next_cursor_str !== '0') {
				console.log(result);
				throw Error();
			}

			result.lists.forEach(l => {
				if (l.mode !== 'public') return;
				if (l.user.protected) return;
				user.lists.push(l);
			})

			delete result.lists;

			cb();
		}
	)
)

scraper.finished(() => {
	console.log(users);
})

scraper.run();




