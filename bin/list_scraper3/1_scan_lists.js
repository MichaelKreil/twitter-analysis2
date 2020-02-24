"use strict";

const fs = require('fs');
const async = require('async');
const scraper = require('../../lib/scraper.js')('list_scraper');

var accounts = new Set();

var lists = fs.readFileSync('lists_in.txt', 'utf8').split('\n')
lists.forEach(list => {
	list = list.split('\t');
	var group = list[0];
	var listId = list[1];
	scraper.fetch(
		'lists/members',
		{
			list_id: listId,
			count: 5000,
			skip_status: true,
		},
		result => {
			if (!result.users) return;
			result.users.forEach(u => {
				var key = (group+'\t'+u.screen_name).toLowerCase();
				accounts.add(key);
			})
		}
	)
})


scraper.finished(() => {
	accounts = Array.from(accounts.values());
	accounts.sort();
	console.log(accounts.join('\n'));
});

scraper.run();
