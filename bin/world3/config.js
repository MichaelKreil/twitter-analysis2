"use strict"

const resolve = require('path').resolve;
const dataFolder = resolve(__dirname, '../../data/world3/');

module.exports = {
	dataFolder: dataFolder,
	minFollowers: 10000,
	maxFriends: 5000,
	minFollowers4Scraping: 2,
	getDataFilename: filename => resolve(dataFolder, filename),
	userFields: 'screen_name,id_str,verified,protected,followers_count,friends_count,listed_count,favourites_count,statuses_count,langs'.split(','),
}
