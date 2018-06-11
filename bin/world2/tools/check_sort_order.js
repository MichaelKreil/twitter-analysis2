"use strict"

const config = require('../config.js');
const miss = require('../lib/mississippi.js');
const resolve = require('path').resolve;

var fileId  = resolve(__dirname, '../../../data/world/1_ids/ids_selected_'+config.activityMinimumName+'_1.tsv.gz');

var lastId = '';
miss.pipe(
	miss.readGzipLines(fileId),
	miss.through.obj(
		(data, enc, cb) => {
			var i = data.indexOf('\t');
			if (i >= 0) data = data.slice(0, i);
			//console.log(data, data.indexOf('\t'), data);
			if (data <= lastId) throw Error('"'+data+'" <= "'+lastId+'"');
			lastId = data;
			cb()
		}
	),
	miss.sink()
)