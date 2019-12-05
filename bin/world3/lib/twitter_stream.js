"use strict";

const config = require('../config.js');
const async = require('async');
const scraper = require('../../../lib/scraper.js')();

const maxConcurrency = 4;

module.exports = function (miss) {
	miss.twitterLookupId = function twitterLookupId() {
		const cache = require('../../../lib/cache.js')('world3_user');
		const maxActive = maxConcurrency;

		var todos = [], active = 0, finished = false;
		var cbFlush;

		scrape();

		return miss.parallel.obj(
			{maxConcurrency: 400},
			function (obj, enc, cb) {
				var me = this;
				//console.log('check\t'+obj.id_str);
				cache(
					obj.id_str,
					cbCache => todos.push([obj.id_str, cbCache]),
					result => {
						if (result) Object.keys(result).forEach(key => obj[key] = result[key]);
						//console.log('result\t'+obj.id_str);
						cb(null, obj);
					}
				)
			},
			cb => {
				console.log('twitterLookupId flush');
				cbFlush = cb
			}
		);

		function scrape() {
			if (finished) return;
			if (active >= maxActive) return;

			if (cbFlush && (todos.length === 0) && (active === 0)) {
				console.log('twitterLookupId finished');
				cbFlush();
				finished = true;
				return
			}

			if (todos.length === 0) {
				setTimeout(scrape, 100);
				return
			}

			var next = todos.slice(0,100);
			todos = todos.slice(100);

			active++;
			//console.log('twitterLookupId count:'+next.length);
			scraper.fetch(
				'users/lookup',
				{user_id:next.map(e => e[0]).join(','), include_entities:false},
				result => {
					active--;
					var lookup = new Map();
					(result || []).forEach(u => lookup.set(u.id_str.toLowerCase(), u));
					next.forEach(e => e[1](lookup.get(e[0])));
					setTimeout(scrape, 0);
				}
			)

			if (todos.length > 0) setTimeout(scrape, 0);
		}
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
								if (!tweets) return cbCache([]);

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



