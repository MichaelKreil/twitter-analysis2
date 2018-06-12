"use strict"

const config = require('../config.js');
const fetchFriends = require('../lib/twitter.js').fetchFriends;
const fs = require('fs');
const miss = require('../lib/mississippi.js');
const resolve = require('path').resolve;

var dir = resolve(__dirname, '../../../data/world/');
var fileIdIn    = resolve(dir, '1_ids/ids_selected_'+config.activityMinimumName+'_'+config.step+'.tsv.gz');
var fileDbIn  = resolve(dir, 'dbs/friends_'+config.step    +'.tsv.gz');
var fileDbOut = resolve(dir, 'dbs/friends_'+config.stepNext+'.tsv.gz');

if (!fs.existsSync(fileIdIn)) throw Error('Missing '+fileIdIn);
if (!fs.existsSync(fileDbIn)) throw Error('Missing '+fileDbIn);

var prefix, lastPrefix = '';

miss.pipe(
	miss.mergeId(
		miss.readGzipLines(fileIdIn),
		miss.readGzipLines(fileDbIn)
	),
	miss.parallel(
		64,
		(data, cb) => { // data = [idId, lineId, idDb, lineDb]
			
			var id = data[0] || data[2];
			if (!id) throw Error();

			prefix = id.slice(0,3);
			if (lastPrefix !== prefix) {
				console.log(prefix);
				lastPrefix = prefix;
			}
			if (prefix >= '200') return cb(null, null);

			if (data[2] !== null) return cb(null, data[3]);

			console.log('fetch '+id);
			
			fetchFriends(id, friends => {
				friends.sort();
				cb(null, id+'\t'+friends.join(','));
			})
		}
	),
	miss.checkAscendingIds(),
	miss.writeGzipLines(fileDbOut),
)
