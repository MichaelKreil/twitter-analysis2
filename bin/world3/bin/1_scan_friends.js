"use strict"

const config = require('../config.js');
const miss = require('../lib/mississippi.js');
require('../lib/twitter_stream.js')(miss);

var fileIn  = config.getDataFilename('top_accounts.tsv');
var fileOut = config.getDataFilename('top_accounts_new.tsv');


miss.pipe(
	miss.readTSV(fileIn),
	miss.filter.obj(config.criterionIn),
	miss.spySometimes(o => [o.percentage.toFixed(2)+'%', o.friends_count, o.screen_name].join('\t')),
	miss.twitterUserFriendsIds(),
	miss.splitArrayUniq('friends', config.minFollowers4Scraping),
	//miss.spy(),
	miss.toObject('id_str'),
	miss.twitterLookupId(),
	miss.filter.obj(config.criterionBasic),
	miss.twitterUserLanguages(),
	miss.filter.obj(config.criterionLanguage),
	miss.sortBy('screen_name'),
	miss.writeTSV(config.userFields, fileOut),
)
