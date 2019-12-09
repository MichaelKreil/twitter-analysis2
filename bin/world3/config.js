"use strict"

const resolve = require('path').resolve;
const dataFolder = resolve(__dirname, '../../data/world3/');

/*
var config = {
	slug:              '3K_de',
	minFriendsForScraping: 1,
	criterionIn:       o => config.criterionBasic(o) && (o.friends_count <= 10000),
	criterionBasic:    o => o && !o.protected && (o.statuses_count >= 100) && ((o.followers_count >= 3000) || o.verified),
	criterionLanguage: o => o.langs[0] && (o.langs[0][0] === 'de'),
}
*/

var config = {
	slug:              '100K_int',
	minFriendsForScraping: 2,
	criterionIn:       o => config.criterionBasic(o) && (o.friends_count <= 10000),
	criterionBasic:    o => o && !o.protected && (o.statuses_count >= 100) && ((o.followers_count >= 100000) || o.verified),
	criterionLanguage: o => true,
}

config.dataFolder = dataFolder;
config.getDataFilename = filename => resolve(dataFolder, filename);
config.userFields = 'screen_name,id_str,verified,protected,followers_count,friends_count,listed_count,favourites_count,statuses_count,langs'.split(',');

module.exports = config;