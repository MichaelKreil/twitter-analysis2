"use strict"

const fs = require('fs');
const async = require('async');
const scraper = require('../../lib/scraper.js')('temp');

const account = 'nonyc3';
var allIds = new Map();

scraper.fetch(
	'friends/ids',{screen_name:account, stringify_ids:true, count:5000},
	result => {
		console.log(result.ids.length);
		async.eachLimit(
			result.ids,
			4,
			(id, cb) => {
				scraper.fetch(
					'followers/ids',{user_id:id, stringify_ids:true, count:5000},
					result2 => {
						result2.ids.forEach(id => {
							if (!allIds.has(id)) allIds.set(id, {id:id, count:0});
							allIds.get(id).count++;
						})
						cb();
					}
				)
			},
			() => {
				console.log(allIds.size);
				allIds = Array.from(allIds.values());
				allIds.sort((a,b) => b.count - a.count);
				allIds = allIds.slice(0,10);
				console.log(allIds);
			}
		)
	}
)

scraper.run();