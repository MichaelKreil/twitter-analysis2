"use strict";

const fs = require('fs');
const level = require('level');
const async = require('async');
const zlib = require('zlib');
const colors = require('colors');
const scraper = (require('../../lib/scraper.js'))('germany');

var maxTodo = 31927;
//var maxTodo = 1;
var todoIndex = 0;

var dbTodos = level('_todos', { keyEncoding: 'ascii', valueEncoding: 'ascii' });

var streams = [
	['u_id', u => ''+u.id_str],
	['u_name', u => JSON.stringify(u.name)],
	['u_screen_name', u => ''+u.screen_name],
	['u_location', u => JSON.stringify(u.location)],
	['u_description', u => JSON.stringify(u.description)],
	['u_url', u => ''+u.url],
	['u_followers_count', u => ''+u.followers_count],
	['u_friends_count', u => ''+u.friends_count],
	['u_listed_count', u => ''+u.listed_count],
	['u_created_at', u => ''+u.created_at],
	['u_favourites_count', u => ''+u.favourites_count],
	['u_utc_offset', u => ''+u.utc_offset],
	['u_time_zone', u => ''+u.time_zone],
	['u_verified', u => ''+u.verified],
	['u_statuses_count', u => ''+u.statuses_count],
	['u_lang', u => ''+u.lang],
	['u_default_profile', u => ''+u.default_profile],
	['u_default_profile_image', u => ''+u.default_profile_image],
	['u_profile_background_image_url', u => ''+u.profile_background_image_url],
	['u_profile_image_url', u => ''+u.profile_image_url],
	['u_profile_banner_url', u => ''+u.profile_banner_url],
	['u_profile_use_background_image', u => ''+u.profile_use_background_image],
	['l_friends', u => (u.friends || []).join(',')],
	['l_followers', u => (u.followers || []).join(',')],
	['l_tweets_created_at', u => JSON.stringify(u.tweets.map(t => t.created_at))],
	['l_tweets_id', u => JSON.stringify(u.tweets.map(t => t.id_str))],
	['l_tweets_text', u => JSON.stringify(u.tweets.map(t => t.text))],
].map(s => ({
	name: s[0],
	extractor: s[1],
	stream: new Output(s[0]+'.tsv')
}))

scrape();
scraper.run();

function scrape() {
	var task1 = scraper.getSubTask();
	var task2 = scraper.getSubTask();

	console.log(colors.green('Scraping '+todoIndex));

	var todoKey = fmt(todoIndex);

	dbTodos.get(todoKey, (err, ids) => {
		if (err) throw err;

		var users = [];

		task1.fetch('users/lookup', {user_id:ids, include_entities:false}, result => {
			if (!result) return endTask2();

			result.forEach(user => {
				users.push(user);

				task2.fetch(
					'friends/ids', {user_id:user.id_str, stringify_ids:true, count:5000},
					result => user.friends = result.ids
				)
				task2.fetch(
					'followers/ids', {user_id:user.id_str, stringify_ids:true, count:5000},
					result => user.followers = result.ids
				)
				task2.fetch(
					'statuses/user_timeline', {user_id:user.id_str, count:200, trim_user:true},
					result => {
						if (!result || !result.map) result = [];
						user.tweets = result.map(t => ({
							created_at:t.created_at,
							id_str:t.id_str,
							text:t.text
						}))
					}
				)
			});
		})

		task2.finished(endTask2);

		function endTask2() {
			async.eachLimit(
				streams,
				4,
				(s,cb) => s.stream.write(users.map(s.extractor).join('\n'), cb),
				() => {
					//process.exit();
					todoIndex++;
					if (todoIndex < maxTodo) {
						scrape();
					} else {
						async.each(
							streams,
							(s,cb) => s.stream.close(cb),
							() => console.log('finished')
						)
					}
				}
			)
		}
	})
}

function Output(filename) {
	var file = fs.createWriteStream('../data/'+filename+'.gz');
	var stream = zlib.createGzip({level:9});
	stream.pipe(file);
	var buffer = [];
	var size = 0;

	function flush(force, cb) {
		if (!force && (size < 1e6)) return cb();
		stream.write(buffer.join('\n')+'\n', 'utf8', cb)
		buffer = [];
		size = 0;
	}
	
	return {
		close: (cb) => {
			flush(true, () => stream.end(cb))
		},
		write: (data, cb) => {
			buffer.push(data);
			size += data.length;
			flush(false, cb);
		}
	}
}

function fmt(i) { return ('00000000'+i.toFixed(0)).slice(-8); }



