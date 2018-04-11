"use strict"

const screen_name = 'Station51_';

const fs = require('fs');
const colors = require('colors');
const scraper = (require('../lib/scraper.js'))('tweetsources');

var sources = new Map();
var count = 0;

var task = scraper.getSubTask();
task.fetch(
	'statuses/user_timeline',
	{screen_name:screen_name, count:200},
	data => {
		data.forEach(t => {
			var source = t.source;
			source = source.replace(/^.*\">|<\/.*$/g, '');
			if (!sources.has(source)) sources.set(source, [source, 0]);
			sources.get(source)[1]++;
			count++;
		})
	}
)

task.finished(() => {
	sources = Array.from(sources.values());
	sources = sources.map(s => s.join('\t'));
	console.log(sources.join('\n'));
})

scraper.run();

//console.dir(data.accounts.id, {depth:0, colors:true});