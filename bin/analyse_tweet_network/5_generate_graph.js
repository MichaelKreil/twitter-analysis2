"use strict";

const fs = require('fs');
const streamReader = require('../../lib/streamreader.js')('userdata.ndjson.xz');
const extractText = require('../../lib/extract-text.js');

var nodeFile = fs.openSync('nodes.ndjson', 'w');

var nodes = new Map();
var edgeList = [];

streamReader.onLine(line => {
	var u = JSON.parse(line);
	var info = u.info[0];
	if (!info) return;
	if (!Array.isArray(u.tweets)) return;

	var id = info.id_str;

	var node = {
		id: id,
		name: info.screen_name,
		count: u.count,
		followers_count: info.followers_count,
		friends_count: info.friends_count,
		created_at: info.created_at,
		tweets: u.tweets.map(t => {
			if (t.retweeted_status) {
				edgeList.push([id,t.retweeted_status.user.id_str,2]);
				return extractText(t.retweeted_status.full_text)
			} else {
				return extractText(t.full_text)
			}
		}),
	}
	fs.writeSync(nodeFile, JSON.stringify(node)+'\n');

	nodes.set(id, info.screen_name)

	u.friends.ids.forEach(id2 => edgeList.push([id,id2,1]))
})

var progressInterval = setInterval(() => {
	var progress = streamReader.getProgress();
	console.log((100*progress).toFixed(1)+'%');
}, 5000)

streamReader.onEnd(() => {
	fs.closeSync(nodeFile);

	var edges = new Map();

	edgeList.forEach(e => {
		if (!nodes.has(e[1])) return;
		if (e[0] == e[1]) return;

		var key = (e[0] < e[1]) ? e[0]+'_'+e[1] : e[1]+'_'+e[0];
		if (!edges.has(key)) edges.set(key, {
			from:nodes.get(e[0]),
			to:nodes.get(e[1]),
			retweets:0,
			direction:0,
		});

		if (e[2] === 2) return edges.get(key).retweets++;
		edges.get(key).direction++;
	});

	edgeList = Array.from(edges.values());

	edgeList = edgeList.map(e => {
		var weight = 0;
		if (e.direction === 1) weight = 0.1;
		if (e.direction > 1) weight = 1;
		weight += Math.round(Math.sqrt(e.retweets)*100)/100;
		return [e.from, e.to, weight, Math.min(e.direction,2), e.retweets];
	})

	fs.writeFileSync('edges.json', JSON.stringify(edgeList), 'utf8')

	edgeList = edgeList.map(e => e.join('\t'));

	edgeList.unshift('source\ttarget\tweight\tdirections\tretweeting');
	edgeList = edgeList.join('\n');


	fs.writeFileSync('edges.tsv', edgeList, 'utf8')

	console.log('finished');

	clearInterval(progressInterval);
})
