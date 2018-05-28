"use strict"

const activity = require('../lib/cache_twitter_activity.js');
const async = require('async');
const CacheResults = require('../lib/cache_results.js');
const friends = require('../lib/cache_twitter_friends.js');

module.exports = new CacheResults(
	'active_friends',
	(userId, cbActiveFriends) => {
		friends(userId, (err, friendsIds) => {
			async.filterLimit(
				friendsIds.split(','),
				3000,
				(friendId, cbFilter) => activity(
					friendId,
					(err, result) => cbFilter(err, parseInt(result, 10) > 1e5)
				),
				(err, activeIds) => cbActiveFriends(err, activeIds.join(','))
			);
		})
	}
)
