"use strict"

const fs = require('fs');
const zlib = require('zlib');
const colors = require('colors');

analyse(JSON.parse(fs.readFileSync('./web/nodes_web.json')));
//analyse(JSON.parse(fs.readFileSync('../result/agh_2017_ext.topojson')));

function analyse(data, depth) {
	if (!depth) depth = 0;

	console.log(colors.grey(indent(0)+size(data)));

	switch (typeof data) {
		case 'string':
		case 'number':
		break;
		case 'object':
			if (Array.isArray(data)) {
				//console.dir(data, {colors:true, depth:2});
				//console.log(colors.white(indent()+'[]'));
			} else {
				console.log(colors.white(indent()+'{'));
				Object.keys(data).forEach(key => {
					console.log(colors.white(indent(1)+key+':'));
					analyse(data[key], depth+2);
				});
				console.log(colors.white(indent()+'}'));
			}
		break;
		default: console.error('Unknown data type: '+(typeof data));
	}

	function indent(inc) {
		if (!inc) inc = 0;
		return '  '.repeat(inc+depth);
	}
	function size(data) {
		data = Buffer.from(JSON.stringify(data), 'utf8');
		var gzip = zlib.gzipSync(data, {level:9});
		return fmt(data.length)+' ('+fmt(gzip.length)+')';

		function fmt(v) {
			v = v.toFixed(0);
			var s = '';
			while (v.length > 3) {
				s = '.'+v.slice(-3)+s;
				v = v.slice(0,-3);
			}
			return v+s;
		}
	}
}