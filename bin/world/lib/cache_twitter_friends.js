"use strict"

const CacheResults = require('../lib/cache_results.js');
const scraper = require('../../../lib/scraper.js')('world2');

module.exports = new CacheResults(
	'friends',
	(userId, cbFriends) => {
		scraper.fetch(
			'friends/ids',
			{user_id:userId, stringify_ids:true, count:5000},
			result => {
				result = (result && result.ids) || [];
				cbFriends(null, result.join(','));
			}
		)
	},
	{dbCount: 10}
)

