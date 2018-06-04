"use strict"

const async = require('async');
const colors = require('colors');
const miss = require('mississippi');
const MultiDB = require('../lib/multi_db.js');
const Progress = require('../lib/progress.js');
const resolve = require('path').resolve;
const Writer = require('../lib/lzma_writer.js');



async.eachSeries(
	[
		'activity',
		'friends',
		//'active_friends_45',
	],
	(name, cbDB) => {
		var db = new MultiDB(resolve(__dirname, '../../../data/world/dbs/'+name));
		var fileOut = resolve(__dirname, '../../../data/world/dbs/'+name+'_new.ndjson.xz');
		
		console.log(colors.green.bold('Exporting "'+name+'"'));
		var progress = new Progress();
		var lastId = '0';
		var interval = setInterval(() => {
			var percent = getPercent(lastId);
			if (percent) progress.set(percent);
		}, 500)

		miss.finished(
			miss.pipe(
				db.getReadStream(),
				miss.through.obj(
					function (entry, enc, cb) {
						if (!entry.key) return cb();
						
						lastId = entry.key;
						cb(null, entry.key+'\t'+JSON.stringify(entry.value));
					}
				),
				new Writer(fileOut)
			),
			() => {
				clearInterval(interval);
				progress.end();
				cbDB();
			}
		)
	}
)

function getPercent(id) {
	id = parseInt(id.slice(0,3),10);
	if (id < 100) return false;
	return 2.266469E-09*Math.pow(id,3)-4.678916E-06*Math.pow(id,2)+3.742342E-03*id-3.297115E-01;
}
