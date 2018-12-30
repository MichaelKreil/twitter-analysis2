"use strict"

const fs = require('fs');
const zlib = require('zlib');
const miss = require('mississippi2');

miss.pipe(
	getProgressStream('data/verified_accounts.ndjson.gz'),
	zlib.createGunzip(),
	miss.split('\n'),
	miss.through.obj(
		(data, encoding, cb) => {
			data = JSON.parse(data);
			//console.log(data.user);
			//process.exit();
			//if (data.tweets.length < 450) return cb();
			cb(null, [
				data.user.id_str,
				data.user.screen_name,
				data.user.followers_count,
				data.user.friends_count,
				(new Date(data.user.created_at)).toISOString(),
				data.user.statuses_count,
				data.user.lang,
				data.tweets.length,
				data.user.profile_image_url_https,
			].join('\t')+'\n');
		}
	),
	fs.createWriteStream('data/summary.tsv')
)


function getProgressStream(filename) {
	var size = fs.statSync(filename).size;
	var pos = 0;
	var index = 0;

	return miss.pipeline(
		fs.createReadStream(filename),
		miss.spy(chunk => {
			pos += chunk.length;
			if (index % 200 === 0) console.log((100*pos/size).toFixed(1)+'%');
			index++;
		})
	)
}