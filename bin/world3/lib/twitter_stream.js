"use strict";

const config = require('../config.js');
const async = require('async');
const scraper = require('../../../lib/scraper.js')();

const maxConcurrency = 1;
const waitSlow = 500;
const waitFast = 500;

module.exports = function (miss) {

	miss.twitterUserById = function twitterUserById() {
		return miss.parallel.obj(
			{maxConcurrency: 1000},
			(id, enc, cb) => getUser(id, obj => cb(null, obj))
		);
	}

	miss.twitterUserLanguages = function twitterUserLanguages() {
		return miss.parallel.obj(
			{maxConcurrency: maxConcurrency},
			(user, enc, cbParallel) => {
				getUserLanguage(user.id_str, obj => {
					user.langs = obj;
					cbParallel(null, user);
				})
			}
		)
	}

	miss.twitterUserFriendsIds = function twitterUserFriendsIds() {
		return miss.parallel.obj(
			{maxConcurrency: maxConcurrency},
			(user, enc, cbParallel) => {
				getUserFriendsIds(
					user.id_str,
					obj => {
						console.log(obj);
						throw Error();
						user.friends = obj;
						cbParallel(null, user)
					}
				)
			}
		)
	}

	miss.twitterUserFriendsLanguage = function twitterUserFriendsLanguage(basicFilter, languageFilter) {
		return miss.parallel.obj(
			{maxConcurrency: maxConcurrency},
			(user, enc, cbParallel) => {
				getUserFriendsLanguage(
					user.id_str,
					basicFilter,
					languageFilter,
					result => cbParallel(null, result)
				)
			}
		)
	}

	const cacheUserFriendsLanguageFiltered = require('../../../lib/cache.js')('world3_user_friends_language_filtered_'+config.slug);
	function getUserFriendsLanguage(id, basicFilter, languageFilter, cbUserFriendsLanguage) {
		cacheUserFriendsLanguageFiltered(
			id,
			cbCache => getUserFriendsIds(
				id,
				result => {
					async.mapLimit(
						result, 100,
						(id, cb) => getUser(id, user => cb(null, user)),
						(err, result) => {
							result = result.filter(basicFilter);
							async.eachLimit(
								result, 4,
								(obj, cb) => getUserLanguage(obj.id_str, langs => { obj.langs = langs; cb(null); }),
								() => {
									result = result.filter(languageFilter);
									result = result.map(u => u.id_str);
									cbCache(result);
								}
							)
						}
					)
				}
			),
			cbUserFriendsLanguage
		)
	}

	const cacheUser = require('../../../lib/cache.js')('world3_user');
	var userTodos = [], activeHandleUser = 0;
	handleUser();
	function getUser(id, cbGetUser) {
		cacheUser(
			id,
			cbCache => userTodos.push([id, cbCache]),
			user => {
				cbGetUser(user);
			}
		)
	}
	function handleUser() {
		if (activeHandleUser >= maxConcurrency) return;

		if (userTodos.length === 0) {
			setTimeout(handleUser, waitSlow);
			return
		}

		var next = userTodos.slice(0,100);
		userTodos = userTodos.slice(100);

		activeHandleUser++;
		//console.log('users/lookup '+next.length);
		scraper.fetch(
			'users/lookup',
			{user_id:next.map(e => e[0]).join(','), include_entities:false},
			result => {
				activeHandleUser--;
				var lookup = new Map();
				(result || []).forEach(u => lookup.set(u.id_str.toLowerCase(), u));
				next.forEach(e => e[1](lookup.get(e[0])));

				if (userTodos.length < 100) {
					setTimeout(handleUser, waitSlow);
				} else {
					setTimeout(handleUser, waitFast);
				}
			}
		)

		if (userTodos.length > 100) setTimeout(handleUser, waitFast);
	}

	const cacheLang = require('../../../lib/cache.js')('world3_user_langs');
	function getUserLanguage(id, cbUserLanguage) {
		cacheLang(
			id,
			cbCache => {
				console.log('statuses/user_timeline');
				scraper.fetch(
					'statuses/user_timeline',
					{user_id:id, count:200, trim_user:true, exclude_replies:true, include_rts:false},
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
			result => cbUserLanguage(result)
		)
	}

	const cacheUserFriendsIds = require('../../../lib/cache.js')('world3_user_friends_ids');
	function getUserFriendsIds(id, cb) {
		cacheUserFriendsIds(
			id,
			cbCache => {
				//console.log('friends/ids');
				scraper.fetch(
					'friends/ids',
					{user_id:id, stringify_ids:true, count:5000},
					result => cbCache(result.ids || [])
				)
			},
			cb
		)
	}
}



