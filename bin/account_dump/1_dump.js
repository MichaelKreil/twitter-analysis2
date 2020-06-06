"use strict";

const fs = require('fs');
const async = require('async');
const scraper = require('../../lib/scraper.js')();

const userKeys = 'id_str,name,screen_name,location,description,url,entities,protected,followers_count,friends_count,listed_count,created_at,favourites_count,utc_offset,time_zone,verified,statuses_count,lang,default_profile,default_profile_image'.split(',');

var users = 'NieTwojInteresQ'.split(',');

users.forEach(username => {
	var data = {};

	var task = scraper.getSubTask();

	var listManager  = new ListManager();
	var userManager  = new UserManager();
	var tweetManager = new TweetManager();

	task.fetch('users/show', {screen_name: username}, result => {
		data.meta = result;
	});

	task.allUserTweets(username, tweets => data.tweets = tweets.map(tweetManager.check));
	task.allUserFavs(username, tweets => data.favs = tweets.map(tweetManager.check));

	task.fetch('lists/memberships', {screen_name: username, count:1000}, result => {
		data.listMembering = result.lists.map(listManager.check);
	});
	task.fetch('lists/ownerships', {screen_name: username, count:1000}, result => {
		data.listOwning = result.lists.map(listManager.check);
	});
	task.fetch('lists/subscriptions', {screen_name: username, count:1000}, result => {
		data.listSubscribing = result.lists.map(listManager.check);
	});
	task.fetch('followers/ids', {screen_name: username, count:5000, stringify_ids:true}, result => {
		data.followers = result.ids.map(userManager.check);
	});
	task.fetch('friends/ids', {screen_name: username, count:5000, stringify_ids:true}, result => {
		data.friends = result.ids.map(userManager.check);
	});

	task.finished(() => {
		async.parallel([
			cb => listManager.fetchData(result => { data.lists = result; cb(); }),
			cb => userManager.fetchData(result => { data.users = result; cb(); }),
		], () => {
			fs.writeFileSync(username+'.json', JSON.stringify(data), 'utf8');
			console.log('Finished');
		})
	})

	function ListManager() {
		var ids = new Set();
		return {
			check:check,
			fetchData:fetchData,
		}
		function check(list) {
			if (typeof list === 'object') list = list.id_str;
			ids.add(list);
			return list;
		}
		function fetchData(cbFetchData) {
			ids = Array.from(ids.values());
			ids.sort();
			var resultList = [];

			var task1 = scraper.getSubTask();
			async.eachLimit(
				ids,
				32,
				(id, cbAsync) => {
					task1.fetch('lists/show', {list_id:id}, list => {
						if (!list) return cbAsync();

						list.subscribers = [];
						list.members = [];
						task1.fetch('lists/members', {list_id:id, count:5000, include_entities:false, skip_status:true}, result => {
							if (result && result.users) list.members = result.users.map(userManager.check);
							task1.fetch('lists/subscribers', {list_id:id, count:5000, include_entities:false, skip_status:true}, result => {
								if (result && result.users) list.subscribers = result.users.map(userManager.check);
								resultList.push(list);
								cbAsync();
							})
						})
					})
				},
				() => {
					console.log(resultList);
					cbFetchData(resultList);
				}
			)
		}
	}

	function UserManager() {
		var ids = new Set();
		return {
			fetchData:fetchData,
			check:check,
		}
		function check(user) {
			if (typeof user === 'object') user = user.id_str;
			ids.add(user);
			return user;
		}
		function fetchData(cbFetchData) {

		}
	}
})







