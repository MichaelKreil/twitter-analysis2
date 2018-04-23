"use strict";

const fs = require('fs');

var tweets = fs.readFileSync('tweets.json', 'utf8');
tweets = JSON.parse(tweets);

var users = new Map();

tweets.forEach(t => {
	addUser(t.user);
	t.retweeters.forEach(r => {
		addUser(r.user);
	})
})

users = Array.from(users.values());

users = users.map(u => u.name+'\t'+u.count).join('\n');

fs.writeFileSync('users.tsv', users, 'utf8');

function addUser(u) {
	if (users.has(u)) {
		users.get(u).count++;
	} else {
		users.set(u, {
			name:u,
			count:1
		})
	}
}