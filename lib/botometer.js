"use strict";

const fs = require('fs');
const async = require('async');
const request = require('request');
const scraper = require('./scraper.js')('botometer');

module.exports = botometer;

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
					'X-RapidAPI-Key': '93d7a2d726msh7335f8001189e83p1bfb3ajsn71bff4333b19',
					'Content-Type': 'application/json',
				},
				json:true,
				body:obj,
			},
			function (error, response, body) {
				if (response.statusCode === 502) throw Error('restart');

				if (body.error === 'No Timeline') return cbBotometer(false);
				if (body.error === 'JSON Error') return cbBotometer(false);

				if (response.statusCode !== 200) {
					console.log(response);
					throw new Error(error);
				}
				if (error) throw new Error(error);

				if (body && body.scores) body.score = (body.user.lang === 'en') ? body.scores.english : body.scores.universal;

				cbBotometer(body);
			}
		);
	})
}