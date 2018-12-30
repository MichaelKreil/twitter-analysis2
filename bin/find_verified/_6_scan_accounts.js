"use strict"

const fs = require('fs');

var input = 'data/times/';

var day0 = Date.parse('2018-11-20T00:00:00Z')/1000;
var day1 = Date.parse('2018-11-28T23:59:59Z')/1000;
var dayCount = Math.floor((day1-day0)/86400);
console.log('dayCount: '+dayCount);

var result = [];

fs.readdirSync(input).forEach(f => {
	if (!f.endsWith('.ndjson')) return;
	console.log(f);
	fs.readFileSync(input+f, 'utf8').split('\n').forEach(account => {
		if (!account) return;
		account = JSON.parse(account);

		account.times = account.times.filter(t => {
			if (t < day0) return false;
			if (t > day1) return false;
			return true;
		})

		result.push(account);
	})
})

fs.writeFileSync('verified.json', JSON.stringify(result), 'utf8');