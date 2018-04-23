"use strict";

const minWordCount = 20;

const fs = require('fs');
const StreamReader = require('../../lib/streamreader.js');
var streamReader = StreamReader('nodes.ndjson');
var nodeFile = fs.openSync('nodes_web.ndjson', 'w');

var words = new Map();
var wordList;
var usersIndex = new Map();
var userList = [];

streamReader.onLine(line => {
	var u = JSON.parse(line);
	u.tweets.forEach(t => {
		t.split(' ').forEach(w => {
			if (w.length <= 3) return;
			if (words.has(w)) {
				words.get(w).count++;
			} else {
				words.set(w, {word:w, count:1});
			}
		})
	})
})

var progressInterval = setInterval(() => {
	var progress = streamReader.getProgress();
	console.log((100*progress).toFixed(1)+'%');
}, 2000)

streamReader.onEnd(() => {
	wordList = Array.from(words.values());
	wordList = wordList.filter(w => w.count > minWordCount);
	wordList.sort((a,b) => b.count - a.count);
	wordList.forEach((w,i) => w.index = i);
	words = new Map();
	wordList.forEach(w => words.set(w.word, w));

	phase2();
	
	clearInterval(progressInterval);
})

function phase2() {
	var streamReader = StreamReader('nodes.ndjson');
	streamReader.onLine(line => {
		var u = JSON.parse(line);
		var user_words = new Map();
		u.tweets.forEach(t => {
			t.split(' ').forEach(w => {
				if (w.length <= 3) return;
				if (!words.has(w)) return;
				if (user_words.has(w)) {
					user_words.get(w).count++;
				} else {
					user_words.set(w, {index:words.get(w).index, count:1});
				}
			})
		})
		delete u.tweets;
		delete u.id;
		user_words = Array.from(user_words.values());
		user_words.sort((a,b) => a.index - b.index);

		u.word_index = user_words.map(w => w.index);
		u.word_count = user_words.map(w => w.count);

		u.word_index = compressRLE(compressDiff(u.word_index));

		u.word_count = compressRLE(u.word_count);

		usersIndex.set(u.name, userList.length);
		userList.push(u);
	})

	var progressInterval = setInterval(() => {
		var progress = streamReader.getProgress();
		console.log((100*progress).toFixed(1)+'%');
	}, 2000)

	streamReader.onEnd(() => {
		console.log('preparing nodes_web.json');
		userList = compressObjectArray(userList);

		console.log('saving nodes_web.json');
		fs.writeFileSync('./web/data/nodes_web.json', JSON.stringify(userList), 'utf8');



		console.log('preparing words_web.json');
		wordList = compressObjectArray(wordList);
		delete wordList.index;
		wordList.count = compressDiff(wordList.count);
		wordList.count = compressRLE(wordList.count);

		console.log('saving words_web.json');
		fs.writeFileSync('./web/data/words_web.json', JSON.stringify(wordList), 'utf8');



		console.log('preparing edges_web.json');
		var edges = JSON.parse(fs.readFileSync('edges.json', 'utf8'));
		edges = edges.map(e => ({
			from:usersIndex.get(e[0]),
			to:usersIndex.get(e[1]),
			//weight:Math.round(e[2]*100)/100,
			directions:e[3],
			retweeting:e[4],
		}))

		edges.sort((a,b) => a.from===b.from ? a.to-b.to : a.from-b.from);
		edges = compressObjectArray(edges);
		edges.from = compressRLE(compressDiff(edges.from));
		edges.to   = compressRLE(compressDiff(edges.to));
		//edges.weight = compressRLE(edges.weight);
		edges.directions = compressRLE(edges.directions);
		edges.retweeting = compressRLE(edges.retweeting);

		console.log('saving edges_web.json');
		fs.writeFileSync('./web/data/edges_web.json', JSON.stringify(edges), 'utf8');



		console.log('finished');
		clearInterval(progressInterval);
	})
}

function compressDiff(data) {
	for (var i = data.length-1; i > 0; i--) data[i] -= data[i-1];
	return data;
}

function compressObjectArray(data) {
	var keys = new Set();
	data.forEach(obj => Object.keys(obj).forEach(k => keys.add(k)));
	keys = Array.from(keys.values());
	var result = {};
	keys.forEach(key => result[key] = data.map(obj => obj[key]))
	return result;
}

function compressRLE(data) {
	for (var i = 0; i < data.length-1; i++) {
		var v = data[i];
		var lastIndex = i;
		for (var j = i+1; j < data.length; j++) {
			lastIndex = j;
			if (data[j] !== v) {
				lastIndex = j-1;
				break;
			}
		}

		if (lastIndex-i < 4) continue;

		var newValue = [v,lastIndex-i];
		if (JSON.stringify(newValue).length >= JSON.stringify(data.slice(i,lastIndex+1)).length-2) continue;

		for (var j = i; j <= lastIndex; j++) data[j] = false;
		data[i] = newValue;
		i = lastIndex;
	}
	return data.filter(e => e !== false);
}
