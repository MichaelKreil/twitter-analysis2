"use strict"

const config = require('../config.js');
const miss = require('../lib/mississippi.js');
require('../lib/twitter_stream.js')(miss);

var fileIn  = config.getDataFilename('top_accounts.tsv');
var fileOut = config.getDataFilename('top_accounts_new.tsv');

miss.pipe(
	miss.readTSV(fileIn),
	miss.filter.obj(o => !o.protected && (o.friends_count < config.maxFriends)),
	miss.spySometimes(o => console.log([o.percentage.toFixed(2)+'%', o.friends_count, o.screen_name].join('\t'))),
	miss.twitterUserFriendsIdsFilteredCached(
		o => o && !o.protected && (o.followers_count >= config.minFollowers)
	),
	miss.splitArrayUniq('friends', config.minFollowers4Scraping),
	miss.toObject('id_str'),
	miss.twitterLookupId(),
	miss.filter.obj(o => o && !o.protected && (o.followers_count >= config.minFollowers)),
	miss.sortBy('screen_name'),
	miss.twitterUserLanguages(),
	miss.writeTSV(config.userFields, fileOut),
)

