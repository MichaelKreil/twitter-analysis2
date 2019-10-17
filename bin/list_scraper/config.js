"use strict"

var files = 'afd,cdu,fdp,gruene,linke,spd';

const fs = require('fs');

var allUsers = new Map();

files = files.split(',').map(name => {
	var filename = 'data/'+name+'.txt';
	var data = fs.readFileSync(filename, 'utf8');
	var users = data.toLowerCase().split('\n').map(e => e.trim()).filter(e => e.length > 0);
	
	users.forEach(u => allUsers.set(u, [u,name]));

	return {
		name: name,
		userList: users,
		userSet: new Set(users),
	}
})

allUsers = Array.from(allUsers.values());

console.log(allUsers);
process.exit();

module.exports = {
	files: files,
}