"use strict"

const fs = require('fs');
const colors = require('colors');
const scraper = (require('../../lib/scraper.js'))('find_verified_users_lookup');
//const scraper = require('../../lib/scraper.js');

//var oldAccounts = [];//fs.readFileSync('accounts_known.txt', 'utf8').split('\n').filter(t => t.length > 1)
//var curAccounts = [];//fs.readFileSync('accounts_next.txt',  'utf8').split('\n').filter(t => t.length > 1)
//
//var ignoreAccounts = new Set(oldAccounts.concat(curAccounts));

var newAccounts = new Set();

var key = 'ao';

var ids = fs.readFileSync('data/3_ids_segment'+key);

var task1 = scraper.getSubTask();
var nMax = ids.length, n = 0, step = 0, running = 0;
next();

function next() {
	if (running > 100) return;
	if (ids.length < 1) return;

	running++;
	var count = 0;
	for (var i = 0; i < ids.length; i++) {
		if (ids[i] === 10) count++;
		if (count === 100) {
			var block = ids.slice(0,i).toString('utf8').split('\n');
			block = block.filter(id => id.length > 0);
			ids = ids.slice(i+1);
			n += i+1;
			break;
		}
	}

	setTimeout(next, 1);

	if (!block) return;

	task1.fetch(
		'users/lookup',
		{user_id:block.join(','), include_entities:false},
		data => {
			running--;
			step++;
			if (step % 1000 === 0) console.log((100*n/nMax).toFixed(1)+'% '+newAccounts.size);
			data.forEach(a => {
				if (!a.verified) return;
				if (a.protected) return;
				var name = a.screen_name.toLowerCase();
				//if (ignoreAccounts.has(name)) return;
				newAccounts.add(name);
				if (newAccounts.size % 10000 === 0) fs.writeFileSync('temp.txt', Array.from(newAccounts.values()).join('\n'),'utf8')
			})
			next();
		}
	)
}

task1.finished(() => {
	newAccounts = Array.from(newAccounts.values());
	newAccounts = newAccounts.join('\n');
	fs.writeFileSync('data/4_verified_'+key+'.txt', newAccounts+'\n', 'utf8');
})