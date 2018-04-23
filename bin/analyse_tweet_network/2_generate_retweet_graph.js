"use strict";

const fs = require('fs');

var tweets = fs.readFileSync('tweets.json', 'utf8');
tweets = JSON.parse(tweets);

var edges = new Map();

tweets.forEach(t => {
	t.retweeters.forEach(r => {
		addEgde(t.user, r.user);
	})
})

edges = Array.from(edges.values());

edges = edges.map(e => ([e.from, e.to, Math.sqrt(e.count)]));
edges.unshift(['source','target','weight']);
edges = edges.map(e => e.join('\t')).join('\n');

fs.writeFileSync('edges.tsv', edges, 'utf8');

function addEgde(u1, u2) {
	if (u1 > u2) {
		var t = u1; u1 = u2; u2 = t;
	}

	var key = (u1+'+'+u2).toLowerCase();

	if (edges.has(key)) {
		edges.get(key).count++;
	} else {
		edges.set(key, {
			from:u1,
			to:u2,
			count:1
		})
	}
}