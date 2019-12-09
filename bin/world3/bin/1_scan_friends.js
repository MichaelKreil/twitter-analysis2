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
	miss.twitterUserFriendsLanguage(config.criterionBasic, config.criterionLanguage),
	miss.splitArrayUniq(config.minFriendsForScraping),
	miss.twitterUserById(),
	miss.twitterUserLanguages(),
	miss.sort((a,b) => b.followers_count - a.followers_count),
	miss.writeTSV(config.userFields, fileOut),
	() => {
		console.log('Finished');
		process.exit();
	}
)
