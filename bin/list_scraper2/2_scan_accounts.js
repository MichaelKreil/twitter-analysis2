"use strict";

const fs = require('fs');
const helper = require('./helper.js');
const async = require('async');
const scraper = require('../../lib/scraper.js')('list_scraper');

var lists = new Map();

var accounts = fs.readFileSync('accounts_in.txt', 'utf8').split('\n').map(l => {
	l = l.split('\t')[0];
	if (l.length <= 1) return;
	return l;
}).filter(t => t)

async.eachLimit(
	accounts, 100,
	(entry, cb) => scraper.fetch(
		'lists/memberships', {screen_name: entry, count: 300},
		result => {
			if (!result.lists) return;

			if (result.next_cursor_str !== '0') {
				console.log(result);
				throw Error();
			}

			result.lists.forEach(l => {
				if (l.subscriber_count < 3) return;
				if (l.mode !== 'public') return;
				if (l.user.protected) return;

				var name = l.full_name.slice(1);
				var key = name.toLowerCase();

				if (!lists.has(key)) lists.set(key, [name, 0])
				lists.get(key)[1]++;
			})

			delete result.lists;
		}
	)
)

scraper.finished(() => {
	helper.save('lists_new.txt', lists);
})

scraper.run();




