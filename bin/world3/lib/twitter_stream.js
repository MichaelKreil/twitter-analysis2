"use strict";

const config = require('../config.js');
const async = require('async');
const scraper = require('../../../lib/scraper.js')('world3');

const maxConcurrency = 4;

module.exports = function (miss) {
	miss.twitterLookup = function twitterLookup() {
		return miss.bundle(100, miss.parallel.obj(
			{maxConcurrency: maxConcurrency},
			(chunk, enc, cb) => {
				scraper.fetch(
					'users/lookup',
					{user_id:chunk.join(','), include_entities:false},
					result => {
						var lookup = new Map();
						result.forEach(u => lookup.set(u.id_str.toLowerCase(), u));

						chunk = chunk.map(c => lookup.get(c.toLowerCase()) || false);
						cb(null, chunk);
					}
				)
			}
		))
	}

	miss.twitterUserFriends = function twitterUserFriends() {
		return miss.parallel.obj(
			{maxConcurrency: maxConcurrency},
			(chunk, enc, cb) => {
				scraper.fetch(
					'friends/ids',
					{user_id:chunk, stringify_ids:true, count:5000},
					result => {
						if (!result.ids) return cb();
						cb(null, result.ids);
					}
				)
			}
		)
	}

	miss.twitterUserLanguages = function twitterUserLanguages() {
		const cache = require('../../../lib/cache.js')('world3_user_langs');
		return miss.parallel.obj(
			{maxConcurrency: maxConcurrency},
			(user, enc, cbParallel) => {

				cache(
					user.id_str,
					cbCache => {
						scraper.fetch(
							'statuses/user_timeline',
							{user_id:user.id_str, count:200, trim_user:true, exclude_replies:true, include_rts:false},
							tweets => {
								var langs = new Map();
								tweets.forEach(t => {
									var length = t.text.length;
									var lang = t.lang;
									if (!langs.has(lang)) {
										langs.set(lang, [lang, length]);
									} else {
										langs.get(lang)[1] += length;
									}
								})
								langs = Array.from(langs.values());
								langs.sort((a,b) => b[1]-a[1]);
								cbCache(langs);
							}
						)
					},
					result => {
						user.langs = result;
						cbParallel(null, user);
					}
				)
			}
		)
	}

	miss.twitterUserFriendsIdsFilteredCached = function twitterUserFriendsIdsFilteredCached(filter) {
		const cache = require('../../../lib/cache.js')('world3_user_friends_filtered_'+config.minFollowers);
		return miss.parallel.obj(
			{maxConcurrency: maxConcurrency},
			(user, enc, cbParallel) => {
				cache(
					user.id_str,
					cbCache => getUserFriendsFiltered(user.id_str, filter, result => cbCache(result.map(r => r.id_str))),
					result => {
						user.friends = result;
						cbParallel(null, user);
					}
				)
			}
		)
	}


	function getUserFriendsFiltered(id, filter, cb) {
		scraper.fetch(
			'friends/ids',
			{user_id:id, stringify_ids:true, count:5000},
			result => {
				result = result.ids || [];
				var blocks = [];
				while (result.length > 0) {
					blocks.push(result.slice(-100));
					result = result.slice(0, -100);
				}

				result = [];
				async.eachLimit(
					blocks,
					maxConcurrency,
					(block, cb) => scraper.fetch(
						'users/lookup',
						{user_id:block.join(','), include_entities:false},
						users => {
							if (!users) users = [];
							users.forEach(u => {
								if (filter(u)) result.push(u)
							})
							cb();
						}
					),
					() => cb(result)
				)
			}
		)
	}
}



