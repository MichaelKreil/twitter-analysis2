"use strict"

const config = require('../config.js');
const miss = require('../lib/mississippi.js');
require('../lib/twitter_stream.js')(miss);

var fileIn  = config.getDataFilename('top_accounts.tsv');
var fileOut = config.getDataFilename('top_accounts.json');

miss.pipe(
	miss.readTSV(fileIn),
	miss.filter.obj(o => !o.protected && (o.friends_count < maxFriends)),
	miss.spy(o => console.log([o.percentage.toFixed(2)+'%', o.friends_count, o.screen_name].join('\t'))),
	miss.twitterUserFriendsIdsFilteredCached(
		o => o && !o.protected && (o.followers_count >= config.minFollowers)
	),
	miss.splitArraySortUniq('friends'),
	miss.twitterLookup(),
	miss.filter.obj(o => o && !o.protected && (o.followers_count >= config.minFollowers)),
	miss.twitterUserLanguages(),
	miss.writeTSV(config.userFields, fileOut),
)

