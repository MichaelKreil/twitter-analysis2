"use strict";

const fs = require('fs');
const async = require('async');
const scraper = require('../../lib/scraper.js')('sibelschick');


var accounts = fs.readFileSync('sibelschick_screennames.txt', 'utf8').split('\n');

var nodes = new Map();

accounts.forEach(screen_name => {
	scraper.fetch(
		'users/lookup',
		{screen_name:screen_name},
		result => {
			result = result[0];
			if (!result) return;
			if (result.followers_count > 10000) return;
			
			var u1 = result.id_str;

			getNode(u1).isMain = true;
			getNode(u1).followers_count = result.followers_count;
			getNode(u1).label = screen_name;

			scraper.fetch(
				'friends/ids',{user_id:u1, stringify_ids:true, count:5000},
				result => ((result && result.ids) || []).forEach(u2 => addLink(u1,u2))
			)
			scraper.fetch(
				'followers/ids',{user_id:u1, stringify_ids:true, count:5000},
				result => ((result && result.ids) || []).forEach(u2 => addLink(u2,u1))
			)
		}
	)
})

function getNode(u) {
	if (!nodes.has(u)) nodes.set(u, {id:u, links:new Set()})
	return nodes.get(u);
}

function addLink(u1,u2) {
	u1 = getNode(u1);
	u2 = getNode(u2);
	u1.links.add(u2);
	u2.links.add(u1);
}

scraper.finished(() => {
	nodes = Array.from(nodes.values());
	nodes.forEach(n => {
		if (n.isMain) n.use = true;
		if (n.links.size > 1) n.use = true;
	})
	var links = new Set();
	nodes = nodes.filter(n1 => {
		if (n1.use) Array.from(n1.links.values()).forEach(n2 => {
			if (n2.use) links.add([n1.id,n2.id].join('\t'));
		})
		return n1.use;
	})
	
	links = Array.from(links.values());
	links.unshift('Source\tTarget');
	fs.writeFileSync('sibelschick_links.tsv', links.join('\n'));
	
	nodes = nodes.map(n => [n.id, n.label, n.isMain, n.followers_count].join('\t'));
	nodes.unshift('id\tlabel\tisMain\tfollowers_count');
	fs.writeFileSync('sibelschick_nodes.tsv', nodes.join('\n'));
})
scraper.run();
