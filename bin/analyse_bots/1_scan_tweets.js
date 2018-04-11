"use strict"

const fs = require('fs');

var data = 'tweets/tweets_AJMC_117.txt';
data = fs.readFileSync(data, 'utf8');
data = data.split('\n');
data.shift();

var sources = new Map();
var times = [];

data = data.map(t => JSON.parse(t));

data.sort((a,b) => (a.id_str < b.id_str) ? -1 : 1);

data.forEach(t => {
	var time = new Date(t.created_at);
	//time.setUTCHours(time.getUTCHours()-10);
	//time = time.toTimeString();
	time = time.toLocaleTimeString('de-DE', {timeZone:'America/Yakutat'});
	times.push(time);

	add(sources, t.source);
	console.log([
		time,
		t.id_str,
		t.retweet_count,
		t.favorite_count,
		t.source.replace(' rel="nofollow"', ''),
		t.text.replace(/[^\x20-\x7F]+/g, ' ')
	].join('\t'));
	//console.log(t.text.replace(/[\r\n]+/g, ' '));
	//console.log(t);
})


sources = Array.from(sources.values());
sources.sort((a,b) => b[1]-a[1]);
sources = sources.map(l => l.join('\t')).join('\n');
console.log('');
console.log(sources);

console.log('');
console.log(times.join('\n'));


function add(list, key) {
	if (!list.has(key)) list.set(key, [key,0]);
	list.get(key)[1]++;
}


