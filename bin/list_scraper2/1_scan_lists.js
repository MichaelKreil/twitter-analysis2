"use strict";

const fs = require('fs');
const helper = require('./helper.js');
const async = require('async');
const scraper = require('../../lib/scraper.js')('list_scraper');

var accounts = new Map();

var lists = helper.load('lists_in.txt');
lists = helper.remove(lists, 'lists_out.txt');

lists.forEach(list => {
	list = list.split('/');
	scraper.fetch(
		'lists/members',
		{
			owner_screen_name: list[0],
			slug: list[1],
			count: 5000,
			skip_status: true,
		},
		result => {
			if (!result.users) return;
			result.users.forEach(u => {
				var key = u.screen_name.toLowerCase();
				if (!accounts.has(key)) accounts.set(key, [u.screen_name, 0])
				accounts.get(key)[1]++;
			})
		}
	)
})

scraper.finished(() => {
	helper.save('accounts_new.txt', accounts);
});

scraper.run();




