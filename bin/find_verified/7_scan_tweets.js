"use strict"

const fs = require('fs');


var data = fs.readFileSync('verified_accounts.json', 'utf8');
data = JSON.parse(data);

data.forEach(account => {
	console.log(account);
	process.exit();
})
