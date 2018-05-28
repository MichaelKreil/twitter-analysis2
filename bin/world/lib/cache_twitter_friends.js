"use strict"

const CacheResults = require('../lib/cache_results.js');
const Scraper = require('../../../lib/scraper.js');


module.exports = new (function () {
	var scraper = new Scraper('world_friends');

	return new CacheResults(
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
		}
	)
})()

