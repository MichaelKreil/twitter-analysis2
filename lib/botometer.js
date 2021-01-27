"use strict";

const fs = require('fs');
const async = require('async');
const request = require('request');
let scraper;

let token, cookie;
request('https://botometer.osome.iu.edu', (error, response, body) => {
	cookie = response.headers['set-cookie'][0].split(';')[0];
	token = body.match(/CSRF_TOKEN = '(.*?)';/)[1];
})

module.exports = function (dbname) {
	scraper = require('./scraper.js')(dbname);
	return botometer;
}

function fixTweetObject(t) {
	if (!t) return;
	fixText(t);
	fixTweetObject(t.retweeted_status);
	fixTweetObject(t.quoted_status);

	function fixText(t) {
		t.text = t.full_text;
		delete t.full_text;
	}
}

function botometer(screen_name, cbBotometer) {
	let obj = {};
	let error = false;
	async.parallel([
		cb => scraper.fetch('users/show', {screen_name:screen_name, tweet_mode:'compact'}, (data, err) => {
			obj.user = data;
			cb();
		}),
		cb => scraper.fetch('statuses/user_timeline', {screen_name:screen_name, count:200, include_rts:true, tweet_mode:'compact'}, (data, err) => {
			if (!data) return cb();
			obj.timeline = data;
			cb();
		}),
		cb => scraper.fetch('search/tweets', {q:'@'+screen_name, count:100, tweet_mode:'compact'}, (data, err) => {
			data = data.statuses;
			obj.mentions = data;
			cb();
		}),
	], () => {

		//console.log(token);
		request(
			{
				method:'POST',
				url:'https://botometer.osome.iu.edu/botometer-api/4/check_account',
				headers: {
					'accept-language': 'de-DE,de;q=0.9,en-US;q=0.8,en;q=0.7',
					'cache-control': 'no-cache',
					'content-type': 'application/json;charset=UTF-8',
					'pragma': 'no-cache',
					'sec-ch-ua': '\"Chromium\";v=\"88\', \"Google Chrome\";v=\"88\', \";Not A Brand\";v=\"99\"',
					'sec-ch-ua-mobile': '?0',
					'sec-fetch-dest': 'empty',
					'sec-fetch-mode': 'cors',
					'sec-fetch-site': 'same-origin',
					//'X-CSRFToken': 'ImMzMTQ2NWE5NDJhODZlNzM3YzRkNTk5YTM2MmNmYjE1YmQxNjc2MzUi.YA8HNg.dXhuEYYPQZbWGD9USwYkRVLnw-w',
					'X-CSRFToken': token,
					'cookie': cookie,
				},
				'mode': 'cors',
				'referrer': 'https://botometer.osome.iu.edu/',
				'referrerPolicy': 'strict-origin-when-cross-origin',
				gzip:true,
				json:true,
				body:obj,
			},
			function (error, response, body) {
				body.screen_name = screen_name;
				body.user = obj.user;
				body.timeline = obj.timeline;
				body.mentions = obj.mentions;

				if (response.statusCode === 502) {
					console.log('response.statusCode', response.statusCode);
					setTimeout(() => {
						botometer(screen_name, cbBotometer);
					}, 5000)
					return;
				}

				if (body.error === 'JSON Error') return cbBotometer(body);
				if (body.error === 'No Timeline') return cbBotometer(body);

				if (body.error) {
					console.log(body);
					console.log(response);
					throw new Error(body.error);
				}

				if (response.statusCode !== 200) {
					console.log(response);
					throw new Error(error);
				}
				if (error) throw new Error(error);

				if (body && body.user && body.scores) {
					body.score = (body.user.lang && body.user.lang.startsWith('en')) ? body.scores.english : body.scores.universal;
				}

				cbBotometer(body);
			}
		);
	})
}