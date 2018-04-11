"use strict"

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const level = require('level');

const fields = [
	{id:'id'},
	{id:'screen_name'},
	{id:'name', convert:JSON.parse},
	{id:'created_at', convert:Date.parse},
	{id:'description', convert:JSON.parse},
	{id:'favourites_count', convert: v => parseInt(v,10)},
	{id:'followers_count', convert: v => parseInt(v,10)},
	{id:'statuses_count', convert: v => parseInt(v,10)},
	{id:'friends_count', convert: v => parseInt(v,10)},
	{id:'listed_count', convert: v => parseInt(v,10)},
	{id:'location', convert:JSON.parse},
	{id:'profile_image_url',},
	{id:'default_profile', convert:JSON.parse},
	{id:'default_profile_image', convert:JSON.parse},
	{id:'verified', convert:JSON.parse},
	{id:'time_zone'},
	{id:'utc_offset', convert: v => parseInt(v,10)}
]

var dataFolder = path.resolve(__dirname, '../../../data/germany/');

var indexes = fields.filter(f => f.index).map(f => f.id);

deleteFolderRec('_server');
var db = level('_server', { keyEncoding: 'utf8', valueEncoding: 'utf8' });

main();

function main() {
	console.log('open node2index');
	
	var data = fs.readFileSync(path.resolve(dataFolder, 'g_node2index.bin.gz'));
	data = zlib.gunzipSync(data);
	var nodeCount = data.length/4;
	var indexes = new Uint32Array(nodeCount);
	data.copy(Buffer.from(indexes.buffer));
	var node = 0;

	console.log('read streams');

	readStreams(
		(obj, index, cbEntry) => {
			if (indexes[node] !== index) return cbEntry();

			if (node % 5e4 === 0) console.log((100*node/nodeCount).toFixed(1)+'%');

			obj.node = node;
			node++;

			var key = 'id_'+obj.id;

			db.batch([
				{type:'put', key:key, value:JSON.stringify(obj) },
				{type:'put', key:'node_'+obj.node, value:key},
				{type:'put', key:'name_'+obj.screen_name.toLowerCase(), value:key}
			], cbEntry)

		},
		() => {
			console.log('Finished');
			console.log('nodes should: '+nodeCount);
			console.log('nodes is: '+node);
		}
	)
}


function readStreams(cbEntry, cbFinished) {
	var index = 0;
	var active = fields.length;

	fields.forEach(field => {
		if (!field.filename) field.filename = 'u_'+field.id;
		field.stream = readStream(field.filename, () => active--);
		field.read = field.stream.read;
		if (!field.convert) field.convert = (v => v)
	});

	next();

	function next() {
		var obj = {};

		fields.forEach(field => {
			var v = field.read();
			try {
				obj[field.id] = field.convert(v);
			} catch (e) {
			}
		});

		cbEntry(obj, index, () => {
			index++;

			if (active < fields.length) {
				if (active !== 0) throw Error();
			}

			if (active > 0) {
				setImmediate(next);
			} else {
				setImmediate(cbFinished);
			}
		});
	}
}

function readStream(filename, cbLast) {
	console.log('read stream "'+filename+'"');
	filename = path.resolve(dataFolder, filename+'.tsv.gz');
	var data = fs.readFileSync(filename);
	data = zlib.gunzipSync(data);

	var length = data.length;
	var i0 = 0;
	var finished = false;

	return {
		read: () => {
			if (finished) throw Error('already finished');

			var i = i0;
			while (data[i] !== 10) i++;

			var result = data.slice(i0,i).toString('utf8');
			i0 = i+1;

			if (i0 >= length) {
				finished = true;
				cbLast();
			}

			return result;
		},
		position: () => i0+' '+length,
		isFinished: () => finished
	}
}

function deleteFolderRec (path) {
	if (fs.existsSync(path)) {
		fs.readdirSync(path).forEach(file => {
			var curPath = path + '/' + file;
			if (fs.lstatSync(curPath).isDirectory()) {
				deleteFolderRec(curPath);
			} else {
				fs.unlinkSync(curPath);
			}
		});
		fs.rmdirSync(path);
	}
}
