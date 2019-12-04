"use strict"

const resolve = require('path').resolve;
const dataFolder = resolve(__dirname, '../../data/world3/');

module.exports = {
	dataFolder: dataFolder,
	minFollowers: 100000,
	maxFriends: 10000,
	getDataFilename: filename => resolve(dataFolder, filename),
	userFields: 'screen_name,id_str,verified,protected,followers_count,friends_count,listed_count,favourites_count,statuses_count,langs'.split(','),
}
