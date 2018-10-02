"use strict"

const config = require('../config.js');
const fetchMeta = require('../lib/twitter.js').fetchMeta;
const fs = require('fs');
const miss = require('../lib/mississippi.js');
const resolve = require('path').resolve;

var dir = resolve(__dirname, '../../../data/world/');
var fileDbIn  = resolve(dir, 'dbs/meta_'+config.stepNext+'.tsv.gz');
var fileIdOut = resolve(dir, '1_ids/ids_selected_'+config.activityMinimumName+'_'+config.stepNext+'.tsv.gz');

if (!fs.existsSync(fileIdIn)) throw Error('Missing '+fileIdIn);

miss.pipe(
	miss.readGzipLines(fileDbIn),
	miss.parallel(
		4,
		(data, cb) => {
			data = data.split('\t')[1];
			data = JSON.parse(data);

			if (data.protected) return cb(null, null);

			var activity = Math.sqrt(data.followers_count * data.statuses_count);
			if (activity < config.activityMinimum) return cb(null, null);

			return cb(null, data.id_str);
		}
	),
	miss.checkAscendingIds(),
	miss.writeGzipLines(fileIdOut),
)
