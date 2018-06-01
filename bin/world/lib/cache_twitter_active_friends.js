"use strict"

const activity = require('../lib/cache_twitter_activity.js');
const async = require('async');
const CacheResults = require('../lib/cache_results.js');
const config = require('../config.js');
const friends = require('../lib/cache_twitter_friends.js');

module.exports = new CacheResults(
	'active_friends_'+config.activityMinimumName,
	(userId, cbActiveFriends) => {
		friends(userId, (err, friendsIds) => {
			async.filterLimit(
				friendsIds.split(',').filter(id => id.length > 0),
				3000,
				(friendId, cbFilter) => activity(
					friendId,
					(err, result) => cbFilter(err, parseInt(result, 10) >= config.activityMinimum)
				),
				(err, activeIds) => cbActiveFriends(err, activeIds.join(','))
			);
		})
	}
)
