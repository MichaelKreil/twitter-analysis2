"use strict";

const config = require('./config');

const fs = require('fs');
const async = require('async');
const scraper = (require('../../lib/scraper.js'))('list_scraper');
const topListCount = 100;
const maxUserCount = 20000;

var files = config.files;

async.eachSeries(
	files,
	(file, cbFile) => {
		console.log(file.name+' - scan memberships');
		var includeSet = file.includeSet;
		var includeList = Array.from(includeSet.values());
		var excludeSet = file.excludeSet;
		var excludeList = Array.from(excludeSet.values());

		var foundUsers = new Map();

		var task1 = scraper.getSubTask();
		var task2 = scraper.getSubTask();

		var lists = new Map();

		var listsCount = includeList.length + excludeList.length;
		var listsProgress = 0;

		var f = -includeList.length/(excludeList.length+1e-10)
		var list = includeList.map(e => [e,1]).concat(excludeList.map(e => [e,f]));

		async.eachLimit(
			list, 100,
			(entry, cb) => {
				task1.fetch(
					'lists/memberships', {screen_name: entry[0], count: 100},
					result => {
						parseListMembershipResult(result, entry[1]);
						cb();
					}
				)
			}
		)

		function parseListMembershipResult(result, factor) {
			if (listsProgress % 500 === 0) console.log((100*listsProgress/listsCount).toFixed(1)+'%', lists.size);
			listsProgress++;

			if (!result.lists) return;

			//console.log(result.lists);
			//process.exit();

			if (result.next_cursor_str !== '0') {
				console.log(result);
				throw Error();
			}

			result.lists.forEach(l => {
				if (l.mode !== 'public') return;
				if (l.subscriber_count < 5) return;

				var key = l.full_name.toLowerCase();

				if (lists.has(key)) {
					lists.get(key).factor += factor;
				} else {
					lists.set(key, {
						factor:factor,
						id_str: l.id_str,
						member_count: l.member_count
					});
				}
			})
			delete result.lists;
		}

		task1.finished(() => {
			console.log(file.name+' - scan members');
			lists = Array.from(lists.values());

			lists.forEach(l => l.value = l.factor / Math.sqrt(l.member_count));
			lists.sort((a,b) => b.value - a.value);

			lists = lists.slice(0, topListCount).concat(lists.slice(-topListCount));

			lists.forEach(list => {
				task2.fetch(
					'lists/members',
					{
						list_id: list.id_str,
						count: 5000,
						skip_status: true,
					},
					result => {
						if (!result.users) return;

						var includeCount = 0;
						var excludeCount = 0;
						result.users.forEach(u => {
							var key = u.screen_name.toLowerCase().trim();
							if (includeSet.has(key)) includeCount++;
							if (excludeSet.has(key)) excludeCount++;
						})

						var includeProp = includeCount/(includeCount+excludeCount);
						var excludeProp = excludeCount/(includeCount+excludeCount);
						var confidence  = Math.abs(includeCount-excludeCount)/result.users.length;

						result.users.forEach(u => {
							var key = u.screen_name.toLowerCase().trim();
							if (!foundUsers.has(key)) foundUsers.set(key, {user: key, count:0, includeProp:0, excludeProp:0, confidence:1});
							var user = foundUsers.get(key);
							user.count++;
							user.includeProp += includeProp*confidence;
							user.excludeProp += excludeProp*confidence;
							user.confidence  += confidence;
						})
					}
				)
			})

		})


		task2.finished(() => {
			var foundUserList = Array.from(foundUsers.values());
			foundUserList.forEach(u => {
				var y = Math.pow(u.includeProp/u.confidence,0.5);
				var x = Math.pow(u.excludeProp/u.confidence,0.5);
				var r = Math.sqrt(x*x + y*y);
				u.x = Math.atan2(x,y)*2/Math.PI;
				u.y = r;
			})
			foundUserList.sort((a,b) => b.y-a.y);
			foundUserList = foundUserList.slice(0, maxUserCount);

			var svg = ['<svg version="1.1" baseProfile="full" width="1000" height="1000" viewBox="0 0 1000 1000" xmlns="http://www.w3.org/2000/svg">'];
			svg.push('<rect x="0" y="0" width="1000" height="1000" fill="#000" />')
			foundUserList.reverse().forEach(u => {
				var color = '#888';
				if (includeSet.has(u.user)) color = '#00F';
				if (excludeSet.has(u.user)) color = '#F00';
				svg.push('<circle cx="'+(u.x*1000).toFixed(3)+'" cy="'+((1-u.y)*1000).toFixed(3)+'" r="1" fill="'+color+'" id="_'+u.user+'" onclick="'+u.user+'" />')
			})
			svg.push('</svg>');

			fs.writeFileSync(file.name+'.svg', svg.join('\n'), 'utf8');

			foundUserList.forEach(u => {
				if (includeSet.has(u.user)) return;
				if (excludeSet.has(u.user)) return;
				//console.log(u.user);
			})

			cbFile();
		});
	},
	() => {}
)



scraper.run();




