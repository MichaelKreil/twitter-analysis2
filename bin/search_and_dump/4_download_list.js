"use strict";

const scraper = (require('../../lib/scraper.js'))();

var owner = 'tamuench';
var slug  = 'spd';

var task = scraper.getSubTask();
task.fetch(
	'lists/members',
	{
		owner_screen_name: owner,
		slug: slug,
		count: 5000,
		skip_status: true,
	},
	result => {
		var list = result.users.map(u => u.screen_name).join('\n');
		console.log(list);
	}
)

scraper.run();



