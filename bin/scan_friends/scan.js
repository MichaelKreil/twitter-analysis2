"use strict";

const index = '0';

const fs = require('fs');
const async = require('async');
const miss = require('mississippi2');
miss.parallel = require('through2-concurrent');
const scraper = (require('../../lib/scraper.js'))('germany_graph_'+index);

var ids = fs.readFileSync(, 'utf8').split('\n').filter(l => l.length > 0);

miss.pipe(
	fs.createReadStream('/id_block_'+index+'.tsv'),
	miss.split('\n'),
	miss.parallel.obj(
		{maxConcurrency: 16},
		(id, enc, cb) => {
			var task = scraper.getSubTask();
			var obj = {id:id};
			task.fetch(
				'friends/ids', {user_id:id, stringify_ids:true, count:5000},
				result => { obj.friends = result.ids }
			)
			task.fetch(
				'followers/ids', {user_id:id, stringify_ids:true, count:5000},
				result => { obj.followers = result.ids }
			)
			task.finished(() => cb(null, JSON.stringify(obj)+'\n'));
		}
	),
	utils.createXzip(),
	fs.createWriteStream('meta_block_'+index+'.ndjson.xz'),
)

scraper.run();
