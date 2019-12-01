"use strict"

const fs = require('fs');
const utils = require('../../lib/utils.js');
const miss = require('mississippi2');

var count = 0;
var result = new Map();


miss.pipe(
	fs.createReadStream('../../data/donalphonso/tweets.ndjson.xz', {highWaterMark: 16*1024*1024}),
	utils.createXunzip(),
	utils.createCollector(4*1024*1024),
	miss.split('\n'),
	miss.through.obj((data, enc, cb) => {
		count++;
		if (count % 1000 === 0) console.log(count);

		data = JSON.parse(data);
		data.shift();
		data.forEach(t => {
			if (t.retweeted_status) return;
			var day = (new Date(t.created_at)).toISOString().slice(0,10);

			if (t.in_reply_to_screen_name) add(t.in_reply_to_screen_name, 'reply');

			t.entities.user_mentions.forEach(m => add(m.screen_name, 'mention'));

			function add(name, type) {
				var key = [day, name, type].join('\t');
				if (!result.has(key)) result.set(key, [day, name, type, 0]);
				result.get(key)[3]++;
			}
		})

		cb(null);
	}),
	() => {
		result = Array.from(result.values());
		fs.writeFileSync('../../data/donalphonso/result.json', JSON.stringify(result), 'utf8');
		fs.writeFileSync('../../data/donalphonso/result.tsv', result.map(r => r.join('\t')).join('\n'), 'utf8');
	}
)




