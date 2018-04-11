"use strict";

const fs = require('fs');
const level = require('level');
const async = require('async');
const colors = require('colors');
const scraper = (require('../../lib/scraper.js'))('germany');

var todoIndex = 13352;
var writeIndex = 26176;


var dbTodos   = level('_todos',   { keyEncoding: 'ascii', valueEncoding: 'ascii' });
var dbChecked = level('_checked', { keyEncoding: 'ascii', valueEncoding: 'ascii' });

scrape();
scraper.run();

function scrape() {
	var task1 = scraper.getSubTask();
	var task2 = scraper.getSubTask();

	console.log(colors.green('Scraping '+todoIndex+' - '+writeIndex));
	fs.appendFileSync('scrape.log', todoIndex+'\t'+writeIndex+'\n', 'utf8')

	var todoKey = fmt(todoIndex);

	dbTodos.get(todoKey, (err, ids) => {
		if (err) throw err;

		ids = ids.split(',');

		var newIds = new Set();

		console.log(colors.white('   fetch friends and followers ('+ids.length+')'));

		ids.forEach(id => {
			task1.fetch(
				'friends/ids', {user_id:id, stringify_ids:true, count:5000},
				result => { if (result.ids) result.ids.forEach(id => newIds.add(id)); }
			)
			task1.fetch(
				'followers/ids', {user_id:id, stringify_ids:true, count:5000},
				result => { if (result.ids) result.ids.forEach(id => newIds.add(id)); }
			)
		})

		task1.finished(() => {

			console.log(colors.white('   generate list of new users ('+newIds.size+')'));

			newIds = Array.from(newIds.values());
			newIds.sort();

			console.log(colors.white('   filter duplications ('+newIds.length+')'));

			async.filterLimit(
				newIds,
				16,
				(id, cb) => {
					dbChecked.get(id, (err, value) => {
						if (err && (err.type === 'NotFoundError')) return cb(false, true);
						cb(false, todoKey <= value);
					})
				},
				(err, newIds) => {
					if (newIds.length === 0) return finalize();

					console.log(colors.white('   mark as known ('+newIds.length+')'));

					var ops1 = newIds.map(id => ({type:'put',key:id,value:todoKey}));

					var ops2 = [];
					while (ops1.length > 0) {
						ops2.push(ops1.slice(0,100000));
						ops1 = ops1.slice(100000)
					}

					async.eachSeries(
						ops2,
						(ops, cb) => dbChecked.batch(ops, cb),
						() => {
							console.log(colors.white('   scan for aimed accounts ('+newIds.length+')'));
							
							var nextIds = [];
							for (var i = 0; i < newIds.length; i += 100) {
								var idBlock = newIds.slice(i, i+100).join(',')
								task2.fetch('users/lookup', {user_id:idBlock, include_entities:false}, result => {
									if (!result) return;

									result.forEach(user => {
										if (user.lang !== 'de') return;
										if (user.protected) return;
										if (user.statuses_count < 50) return;
										if (user.followers_count === 0) return;
										nextIds.push(user.id_str);
									});
								})
							}

							task2.finished(() => {
								console.log(colors.white('   adding todos ('+nextIds.length+')'));

								if (nextIds.length === 0) return finalize();

								var ops = [];
								for (var i = 0; i < nextIds.length; i += 100) {
									var idBlock = nextIds.slice(i, i+100).join(',');
									ops.push({type:'put', key:fmt(writeIndex), value:idBlock});
									writeIndex++;
								}
								dbTodos.batch(ops, finalize);
							})
						}
					)


					function finalize() {
						todoIndex++;
						scrape();
					}
				}
			)
		})
	})
}


function fmt(i) { return ('00000000'+i.toFixed(0)).slice(-8); }