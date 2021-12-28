"use strict";

const fs = require('fs');
const async = require('async');
const miss = require('mississippi2');
miss.parallel = require('through2-concurrent');
const scraper = (require('../../lib/scraper.js'))('switzerland_graph');

start()

async function start() {
	let names = fs.readFileSync('blockliste_ch.csv', 'utf8').split(/\r?\n/).filter(l => l.length > 0);
	let task = scraper.getSubTask();
	scraper.run();

	let nodes = new Map();
	let links = new Set();

	let ids = [];
	for (let name of names) {
		let result = await new Promise(res => task.fetch( 'users/lookup', {screen_name:name, stringify_ids:true}, res))
		if (!result) {
			console.log('not found:',name);
			continue;
		}
		result = result[0];
		ids.push(result.id_str)
		nodes.set(result.id_str, 1e10);
	}

	for (let id of ids) {
		let friends   = await new Promise(res => task.fetch('friends/ids',   {user_id:id, stringify_ids:true, count:5000}, result => res(result.ids)));
		if (!friends) {
			console.log('account private:'+id);
			continue
		}
		friends.forEach(f => {
			links.add(id+'\t'+f )
			nodes.set(f, (nodes.get(f) || 0)+1)
		});

		let followers = await new Promise(res => task.fetch('followers/ids', {user_id:id, stringify_ids:true, count:5000}, result => res(result.ids)));
		followers.forEach(f => {
			links.add( f+'\t'+id)
			nodes.set(f, (nodes.get(f) || 0)+1)
		});
	}

	let nodeList = Array.from(nodes.entries())
	nodeList = nodeList.filter(n => n[1] >= 3).map(n => n[0]);
	nodeList.sort();

	nodes = new Map();
	while (nodeList.length > 0) {
		let chunk = nodeList.slice(0, 100);
		nodeList = nodeList.slice(100);
		let users = await new Promise(res => task.fetch('users/lookup', {user_id:chunk.join(','), stringify_ids:true}, res));
		users.forEach(u => {
			nodes.set(u.id_str, [
				u.id_str,
				u.screen_name,
				u.name.replace(/\s+/g, ' '),
				u.followers_count,
				u.friends_count,
				u.created_at,
			])
		})
	}

	links = Array.from(links.values());

	links = links
	console.log(nodes.size);
	process.exit();
	//nodeList.sort();
	//nodeList = 

	//console.log(nodeList);
	//console.log(links.size);
	process.exit();
}
