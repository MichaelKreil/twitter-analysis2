"use strict"

const fs = require('fs');

module.exports.save = function (name, data) {
	data = Array.from(data.values());
	data.sort((a,b) => b[1]-a[1]);
	data = data.map(l => l.join('\t')).join('\n');
	fs.writeFileSync(name, data, 'utf8');
}

module.exports.load = function (name) {
	var lists = fs.readFileSync(name, 'utf8')
		.split('\n')
		.map(l => l.split('\t')[0])
		.filter(l => l.length > 2);
		
	return lists
}