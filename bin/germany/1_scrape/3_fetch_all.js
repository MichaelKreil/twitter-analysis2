"use strict";

const fs = require('fs');
const level = require('level');
const async = require('async');
const colors = require('colors');
const scraper = (require('../../lib/scraper.js'))('germany');

var maxTodo = 31928;
var todoIndex = 0;

var dbTodos = level('_todos', { keyEncoding: 'ascii', valueEncoding: 'ascii' });
var output = new Output('data.json');

scrape();
scraper.run();

function scrape() {
	var task1 = scraper.getSubTask();
	var task2 = scraper.getSubTask();

	console.log(colors.green('Scraping '+todoIndex));

	var todoKey = fmt(todoIndex);

	dbTodos.get(todoKey, (err, ids) => {
		if (err) throw err;

		var users = [];

		task1.fetch('users/lookup', {user_id:ids, include_entities:false}, result => {
			if (!result) return endTask2();

			result.forEach(user => {
				users.push(user);

				task2.fetch(
					'friends/ids', {user_id:user.id_str, stringify_ids:true, count:5000},
					result => user.friends = result.ids
				)
				task2.fetch(
					'followers/ids', {user_id:user.id_str, stringify_ids:true, count:5000},
					result => user.followers = result.ids
				)
				task2.fetch(
					'statuses/user_timeline', {user_id:user.id_str, count:200, trim_user:true},
					result => {
						if (!result || !result.map) result = [];
						user.tweets = result.map(t => ({
							created_at:t.created_at,
							id_str:t.id_str,
							text:t.text
						}))
						//console.log(user.tweets);
						//process.exit();
					}
				)
			});
		})

		task2.finished(endTask2);

		function endTask2() {
			//users.forEach(u => output.write(JSON.stringify(u)));
			todoIndex++;
			if (todoIndex <= maxTodo) scrape();
		}
	})
}

function Output(filename) {
	var file = fs.openSync(filename, 'w');
	var buffer = [];

	function flush(force) {
		if (!force && (buffer.length < 100)) return;
		fs.writeSync(file, buffer.join('\n')+'\n')
		buffer = [];
	}
	
	return {
		close: () => { flush(true); fs.closeSync(file); },
		flush: () => flush(true),
		write: (data) => { buffer.push(data); flush(); }
	}
}

function fmt(i) { return ('00000000'+i.toFixed(0)).slice(-8); }