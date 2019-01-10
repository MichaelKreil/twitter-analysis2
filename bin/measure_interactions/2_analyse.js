"use strict";

const fs = require('fs');
const async = require('async');
const colors = require('colors');
const TSV = require('tsv');
const config = require('./config.js');

var data = JSON.parse(fs.readFileSync('bundestag.json', 'utf8'));

var result = [];

data.lists.forEach(party => {
	party.users.forEach(user => {
		//console.log(user);
		var minDate =  1e10;
		var maxDate = -1e10;
		var count = user.tweets.length;
		var countM = 0, countR = 0, countMR = 0;
		user.tweets.forEach(tweet => {
			var date = tweet[1];
			if (minDate > date) minDate = date;
			if (maxDate < date) maxDate = date;
			if (tweet[2]) countM++;
			if (tweet[3]) countR++;
			if (tweet[2] && tweet[3]) countMR++;
		})
		result.push({
			party: party.name,
			color: party.color,
			user: user.user.screen_name,
			minDate: minDate,
			maxDate: maxDate,
			count: count,
			countM: countM,
			countR: countR,
			countMR: countMR,
		})
	})
})

console.log(TSV.stringify(result));




