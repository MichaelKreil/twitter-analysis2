"use strict"

const config = require('../config.js');
const fetchMeta = require('../lib/twitter.js').fetchMeta;
const fs = require('fs');
const miss = require('../lib/mississippi.js');
const resolve = require('path').resolve;

var dir = resolve(__dirname, '../../../data/world/');
var fileIdIn  = resolve(dir, 'dbs/all_accounts_'+config.stepNext+'.tsv.gz');
var fileDbIn  = resolve(dir, 'dbs/meta_'+config.step    +'.tsv.gz');
var fileDbOut = resolve(dir, 'dbs/meta_'+config.stepNext+'.tsv.gz');

if (!fs.existsSync(fileIdIn)) throw Error('Missing '+fileIdIn);

var prefix, lastPrefix = '';

miss.pipe(
	miss.mergeId(
		miss.readGzipLines(fileIdIn),
		miss.readGzipLines(fileDbIn, {optional:true})
	),
	miss.parallel(
		3000,
		(data, cb) => { // data = [idId, lineId, idDb, lineDb]
			
			var id = data[0] || data[2];
			if (!id) throw Error();

			prefix = id.slice(0,3);
			if (lastPrefix !== prefix) console.log(lastPrefix = prefix);
			
			//if (prefix >= '500') return cb(null, null);

			if (data[2] !== null) return cb(null, data[3]);
			
			fetchMeta(id, meta => {
				cb(null, id+'\t'+JSON.stringify(meta));
			})
		}
	),
	miss.checkAscendingIds(),
	miss.writeGzipLines(fileDbOut),
)
