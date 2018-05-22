"use strict"

const fs = require('fs');
const async = require('async');
const colors = require('colors');
const resolve = require('path').resolve;
const Progress = require('../lib/progress.js');
const Reader = require('../lib/lzma_reader.js');
const Writer = require('../lib/id_unique_writer.js');

var files = scanFolder(resolve(__dirname, '../../../data/search_and_dump/'));
files = files.filter(f => f.ext === 'jsonstream.xz');
files = files.filter(f => f.size < 10*1e6);

var sum = 0;
files.forEach(f => {
	sum += f.size;
	f.order = Math.random();
})
files.sort((a,b) => a.order-b.order);

var progress = new Progress(sum);
var writer = new Writer('../../../data/world/1_ids/ids_1.tsv.xz');

async.eachSeries(
	files,
	(f, cbFile) => {
		Reader(
			f.name,
			(tweet,cbEntry) => {
				tweet = JSON.parse(tweet);
				writer.add(tweet.user.id_str, () => {
					if (tweet.retweeted_status) {
						writer.add(tweet.retweeted_status.user.id_str, cbEntry);
					} else {
						setImmediate(cbEntry);
					}
				});
			},
			() => {
				progress.increase(f.size);
				setImmediate(cbFile);
			}
		)
	},
	() => {
		progress.end();
		console.log('\nFinished'.green);
		writer.close();
	}
)

function scanFolder(path) {
	var files = [];
	fs.readdirSync(path).forEach(f => {
		f = resolve(path,f);
		var stat = fs.statSync(f);
		if (stat.isDirectory()) {
			files = files.concat(scanFolder(f));
		} else {
			files.push({
				name:f,
				size:stat.size,
				ext: f.replace(/^.*?\.([^\/]*)$/,'$1').toLowerCase(),
			})
		}
	})
	return files;
}