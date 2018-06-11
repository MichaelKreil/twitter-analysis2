"use strict"

const scraper = require('../../../lib/scraper.js')('world2');

module.exports = {
	fetchFriends: fetchFriends,
}

function fetchFriends(userId, cbFriends) {
	scraper.fetch(
		'friends/ids',
		{user_id:userId, stringify_ids:true, count:5000},
		result => {
			result = (result && result.ids) || [];
			cbFriends(result);
		}
	)
}

