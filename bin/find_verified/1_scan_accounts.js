"use strict"

const fs = require('fs');
const colors = require('colors');
const scraper = (require('../../lib/scraper.js'))('find_verified');

var curAccounts = fs.readFileSync('data/1_accounts.tsv', 'utf8').split('\n').filter(t => t.length > 1)

var checkAccounts = [];

var task1 = scraper.getSubTask();

var idfile = fs.openSync('data/2_ids.txt', 'w');

var nMax = 0, n = 0;
curAccounts.forEach(name => {
	nMax++;
	task1.fetch(
		'friends/ids',
		{screen_name:name, count:5000, stringify_ids:true},
		data => {
			n++;
			if (n % 100 === 0) console.log((100*n/nMax).toFixed(1)+'%');
			checkAccounts = checkAccounts.concat(data.ids);
			if (checkAccounts.length > 1e6) dump();
		}
	)
})
task1.finished(() => {
	dump();
	fs.closeSync(idfile);
});

function dump() {
	checkAccounts = new Set(checkAccounts);
	checkAccounts = Array.from(checkAccounts.values());
	checkAccounts.sort();
	checkAccounts = checkAccounts.join('\n')+'\n';
	fs.writeSync(idfile, checkAccounts);
	checkAccounts = [];
}
