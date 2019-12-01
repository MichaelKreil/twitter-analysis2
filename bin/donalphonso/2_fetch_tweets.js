"use strict"

const fs = require('fs');
const miss = require('mississippi2');
miss.parallel = require('through2-concurrent');
const scraper = require('../../lib/scraper.js')('donalphonso');
const utils = require('../../lib/utils.js');
const minId = '1145082215656775680';

var task = scraper.getSubTask();
scraper.run();

var count = 0;

miss.pipe(
	fs.createReadStream('../../data/donalphonso/followers.txt'),
	miss.split(),
	miss.parallel.obj(
		{maxConcurrency: 4},
		(id, enc, cb) => {
			scrapeTimeline(id, res => {
				res.unshift(id);
				count++;
				if (count % 100 === 0) console.log(count);
				cb(null, JSON.stringify(res)+'\n')
			})
		}
	),
	utils.createXzip(),
	fs.createWriteStream('../../data/donalphonso/tweets.ndjson.xz'),
)

function scrapeTimeline(id, cb) {
	var data = [];
	scrapeRec();

	function scrapeRec(max_id) {
		task.fetch(
			'statuses/user_timeline',
			{user_id:id, since_id:minId, max_id:max_id, count:200, trim_user:true, include_rts:true},
			result => {
				if (!result.length) return returnData();
				data.push(result);

				var min_id = utils.getTweetsMinId(result);
				if (!min_id) return returnData();

				scrapeRec(min_id);
			}
		)
	}

	function returnData() {
		cb([].concat.apply([], data));
	}
}





