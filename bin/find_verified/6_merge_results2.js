"use strict"

const fs = require('fs');
const cluster = require('cluster');
const zlib = require('zlib');

var input = 'data/tweets/';
var day0 = Date.parse('2018-11-20T00:00:00Z');
var day1 = Date.parse('2018-11-28T23:59:59Z');


var files = fs.readdirSync(input);
var results = [];

files = files.filter(f => f.endsWith('.json.gz'))

var fd = fs.openSync('verified_accounts.ndjson', 'w')

files.forEach((f, index) => {
	if (index % 100 === 0) console.log((100*index/files.length).toFixed(1)+'%');

	var data = fs.readFileSync(input+f);
	data = zlib.gunzipSync(data);
	data = JSON.parse(data);
	
	if (!data.user.verified) return;

	data.tweets = data.tweets.filter(t => {
		var time = Date.parse(t.created_at);
		if (time < day0) return false;
		if (time > day1) return false;
		return true;
	})

	results.push(Buffer.from(JSON.stringify(data)+'\n'));
	if (results > 1000) flush();
})
flush();

fs.closeSync(fd);

function flush() {
	fs.writeSync(fd, Buffer.concat(results));
	results = [];
}
