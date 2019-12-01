"use strict"

const fs = require('fs');
const scraper = require('../../lib/scraper.js')('donalphonso');

scraper.fetch(
	'followers/ids',
	{screen_name:'_donalphonso', stringify_ids:true, count:5000},
	res => {
		fs.writeFileSync('../../data/donalphonso/followers.txt', res.ids.join('\n'), 'utf8');
	}
)

scraper.run();