"use strict";

const fs = require('fs');
const async = require('async');
const request = require('request');
var scraper;

module.exports = function (dbname) {
	scraper = require('./scraper.js')(dbname);
	return botometer;
}

function botometer(screen_name, cbBotometer) {
	var obj = {};
	async.parallel([
		cb => scraper.fetch('users/show', {screen_name:screen_name}, data => {
			obj.user = data;
			cb();
		}),
		cb => scraper.fetch('statuses/user_timeline', {screen_name:screen_name, count:200, include_rts:true}, data => {
			obj.timeline = data;
			cb();
		}),
		cb => scraper.fetch('search/tweets', {q:'@'+screen_name, count:100}, data => {
			obj.mentions = data;
			cb();
		}),
	], () => {
		//console.log(obj);
		request(
			{
				method:'POST',
				url:'https://osome-botometer.p.rapidapi.com/2/check_account',
				headers: {
					'X-RapidAPI-Host': 'osome-botometer.p.rapidapi.com',
					'X-RapidAPI-Key': 'e8193ba3femsh2b9650da1c59a72p1c7cf4jsn11a8f268ff36',
					'Content-Type': 'application/json',
				},
				gzip:true,
				json:true,
				body:obj,
			},
			function (error, response, body) {
				if (response.statusCode === 502) {
					setTimeout(() => {
						botometer(screen_name, cbBotometer);
					}, 5000)
					return;
				}

				if (body.error === 'No Timeline') return cbBotometer(false);
				if (body.error === 'JSON Error') return cbBotometer(false);

				if (response.statusCode !== 200) {
					console.log(response);
					throw new Error(error);
				}
				if (error) throw new Error(error);

				if (body && body.user && body.scores) {
					//console.log(body.user);
					body.score = (body.user.lang && body.user.lang.startsWith('en')) ? body.scores.english : body.scores.universal;
				}

				body.user = obj.user;
				body.timeline = obj.timeline;
				body.mentions = obj.mentions;

				cbBotometer(body);
			}
		);
	})
}