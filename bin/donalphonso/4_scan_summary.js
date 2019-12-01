"use strict"

const fs = require('fs');
var result = JSON.parse(fs.readFileSync('../../data/donalphonso/result.json', 'utf8'));

var users = new Map();

result.forEach(r => {
	if (!users.has(r[1])) users.set(r[1], [r[1], 0]);
	users.get(r[1])[1] += r[3];
})

users = Array.from(users.values());
users.sort((a,b) => b[1]-a[1]);

console.log(users);



