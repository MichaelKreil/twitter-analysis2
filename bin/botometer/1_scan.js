"use strict";

const prefix = '2021-01-25';

const dontSave = false;

const fs = require('fs');
const child_process = require('child_process');
const async = require('async');
const miss = require('mississippi2');
const botometer = require('../../lib/botometer.js')('botometer_'+prefix+'_1');
const cache = require('../../lib/cache.js')('botometer_'+prefix+'_3');
const colors = require('colors');

async.series([
	cb => scanFile2('climate.txt', cb),
])


function fetchFollowers(screen_name, cbFetch) {
	console.log('scan followers of '+screen_name)
	scraper.fetch('followers/list', {screen_name:screen_name, count:200, skip_status:true, include_user_entities:false}, result => {
		result = result.users;
		result.forEach(u => {
			u.order = u.id_str.split('').reverse().join('');
		})
		result.sort((a,b) => a.order.localeCompare(b.order));
		result = result.map(u => u.screen_name);
		result = result.filter(name => name.length > 0);
		var blocks = [];
		while (result.length > 0) {
			blocks.push(result.slice(0,10000));
			result = result.slice(10000)
		}
		console.log('generated '+blocks.length+' blocks');
		async.eachOfSeries(
			blocks,
			(block, index, cb) => scanUsers(block, screen_name+'_followers_'+index, cb),
			cbFetch
		)
	})
}

function fetchFriends(screen_name, cb) {
	console.log('scan friends of '+screen_name)
	scraper.fetch('friends/list', {screen_name:screen_name, count:200, skip_status:true, include_user_entities:false}, result => {
		result = result.users.map(u => u.screen_name);
		scanUsers(result, screen_name+'_friends', cb);
	})
}



function fetchList(screen_name, slug, cb) {
	console.log('scan list '+screen_name+'/'+slug)
	scraper.fetch('lists/members', { owner_screen_name:screen_name, slug:slug, count: 5000, skip_status:true, skip_status:true, include_user_entities:false}, result => {
		result = result.users.map(u => u.screen_name);
		scanUsers(result, screen_name+'_list_'+slug, cb);
	})
}

function scanFile(filename, cb) {
	var users = fs.readFileSync(filename, 'utf8').split('\n');
	scanUsers(
		users,
		'file_'+filename.replace(/\..*?$/g,'').replace(/\//g,'_'),
		cb
	);
}

function scanFile2(filename, cb) {
	var users = fs.readFileSync(filename, 'utf8').split('\n');
	users = users.map(u => u.trim().split(/\s+/)[1]);
	users = users.filter(u => u && (u.length > 0));
	scanUsers(
		users,
		'file_'+filename.replace(/\..*?$/g,'').replace(/\//g,'_'),
		cb
	);
}

function scanUsers(users, slug, cbScanUsers) {
	let file = fs.createWriteStream('/root/data/temp/botometer_2021-01-25.ndjson.lz4');
	//let compress = child_process.spawn('xz', ['-z9ec'], {stdio:['pipe','pipe','pipe']});
	let compress = child_process.spawn('lz4', ['-z1'], {stdio:['pipe','pipe','pipe']});
	compress.stdout.pipe(file);

	var results = [];
	users = users.slice(0,1e6+100);

	async.eachOfLimit(
		users, 1,
		(user, index, cb) => {
			//console.log(JSON.stringify(user));
			
			if (index % 100 === 0) {
				console.log('status\t'+index+'\t'+(100*index/users.length).toFixed(3)+'%');
			}
			cache(
				user,
				cbCache => botometer(user, cbCache),
				data => {
					if (!data) data = {};

					if (data.raw_scores) {
						let englishCount = 0;
						data.timeline.forEach(t => {
							if (t.lang === 'en') englishCount++;
						})
						if (englishCount > data.timeline.length/2) {
							data.finale_score = data.raw_scores.english;
						} else {
							data.finale_score = data.raw_scores.universal;
						}
					}

					data.user = user;
					data = JSON.stringify(data)+'\n';

					compress.stdin.write(data, cb);
				}
			)
		},
		() => {
			compress.stdin.end();
		}
	)
}

