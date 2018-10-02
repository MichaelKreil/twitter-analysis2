"use strict"

const config = require('../config.js');
const fs = require('fs');
const async = require('async');
const miss = require('../lib/mississippi.js');
const resolve = require('path').resolve;
const set = require('../lib/set_id.js')();

var dir = resolve(__dirname, '../../../data/world/');
var fileDbOut = resolve(dir, 'dbs/all_accounts_'+config.stepNext+'.tsv.gz');

var prefix, lastPrefix = '';

async.eachSeries(
	[
		'dbs/all_accounts_'+config.step+'.tsv.gz',
		'1_ids/ids_selected_'+config.activityMinimumName+'_'+config.step+'.tsv.gz',
		'dbs/friends_'+config.stepNext+'.tsv.gz',
		'dbs/followers_'+config.stepNext+'.tsv.gz',
	],
	(filename, cbFile) => {
		console.log('read "'+filename+'"');

		miss.each(
			miss.readGzipLines(resolve(dir, filename), {optional:true}),
			(data, cbLine) => {
				prefix = data.slice(0,3);
				if (lastPrefix !== prefix) process.stdout.write('\r'+(lastPrefix = prefix));
				
				data.split(/[\t,]/).forEach(id => {
					if (id.length > 0) set.add(id)
				});
				cbLine();
			},
			() => {
				console.log('\n');
				cbFile()
			}
		)
	},
	() => {
		console.log('save stream')
		miss.pipe(
			set.getReadStream(),
			miss.checkAscendingIds(),
			miss.writeGzipLines(fileDbOut),
		)
	}
)