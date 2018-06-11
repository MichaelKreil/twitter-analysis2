"use strict"

const config = require('../config.js');
const miss = require('../lib/mississippi.js');
const resolve = require('path').resolve;
const fetchFriends = require('../lib/twitter.js').fetchFriends;

var fileId = resolve(__dirname, '../../../data/world/1_ids/ids_selected_'+config.activityMinimumName+'_'+config.step+'.tsv.gz');
var fileDb = resolve(__dirname, '../../../data/world/dbs/friends.tsv.gz');

var active = 0;

miss.pipe(
	miss.merge(
		miss.readGzipLines(fileId),
		miss.readGzipLines(fileDb),
		(idId, lineId, idDb, lineDb, cb) => {
			console.log(idId+'\t'+idDb);
			if (idDb !== null) return cb(null, lineDb);
			
			fetchFriends(idId, friends => {
				friends.sort();
				cb(null, idId+'\t'+friends.join(','));
			})
		}
	),
	miss.writeGzipLines(fileDb+'.tmp.gz'),
)
