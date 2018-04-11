"use strict";

const fs = require('fs');
const zlib = require('zlib');
const async = require('async');
const level = require('levelup');
const colors = require('colors');
const ProgressBar = require('progress');
const ProgressStream = require('progress-stream');

var id2node = new Map();
var indexUse = [];
var index2node = [];
var node2index = new Uint32Array(1.6e6);

var nodes = new Writer('g_nodes');

deleteFolderRec('_edges');

var edgeDB = level('_edges', { keyEncoding:'ascii', valueEncoding:'json' });
var node = 0;

console.log('reading ids');
readStream(
	'u_id', 
	(id, index, cb) => {
		if (id2node.has(id)) return cb();

		if (!/^[0-9]{3,}$/.test(id)) return cb();

		id2node.set(id, node);
		indexUse[index] = true;
		index2node[index] = node;
		node2index[node] = index;
		node++;

		nodes.write(id+'\t'+index, cb);
	},
	() => {
		nodes.close();

		node2index = Buffer.from(node2index.buffer).slice(0,node*4);
		fs.writeFileSync('../data/g_node2index.bin', node2index);

		console.log('reading friends');
		readStream(
			'l_friends',
			(friends, index, cbRead) => {
				if (!indexUse[index]) return cbRead();

				var node1 = index2node[index];
				friends = friends.split(',');
				friends = friends.filter(id => id2node.has(id));
				friends = friends.map(id => id2node.get(id));
				friends.sort((a,b) => a-b);

				if (friends.length === 0) return cbRead();

				async.eachSeries(
					friends,
					(node2, cbFriend) => {
						if (node1 === node2) return cbFriend(); // It is possible! @sammelsurium
						
						var nodeMin = Math.min(node1,node2);
						var nodeMax = Math.max(node1,node2);

						var edgeKey = nodeMin+'_'+nodeMax;

						var value = (node1 === nodeMin) ? 1 : 2;

						edgeDB.get(edgeKey, (err, entry) => {
							if (err && err.notFound) {
								edgeDB.put(
									edgeKey,
									{edge:[nodeMin,nodeMax], value:value},
									cbFriend
								);
							} else {
								if (err) console.log(err);
								edgeDB.put(
									edgeKey,
									{edge:entry.edge, value:entry.value | value},
									cbFriend
								)
							}
						})
					},
					cbRead
				)
			},
			() => {
				console.log('finished');
			}
		)
	}
)

function readStream(filename, cbEntry, cbFinished) {
	filename = '../data/'+filename+'.tsv.gz';

	var stat = fs.statSync(filename);

	var bar = new ProgressBar(':bar :percent (ETA :etas)', { total: 10000, width:50 });
	var progress = ProgressStream({
		length: stat.size,
		time: 100 /* ms */
	});

	progress.on('progress', p => {
		bar.update(p.percentage/100);
	})

	progress.on('close', () => {
		console.log('');
	})


	var stream = zlib.createGunzip({highWaterMark:1e6});
	var file = fs.createReadStream(filename);
	stream = file.pipe(progress).pipe(stream);
	var index = 0;
	var active = true;

	var buffer = [];
	
	stream.on('data', chunk => {
		buffer.push(chunk);
		flush(false, () => {});
	});

	stream.on('end', () => {
		//console.log('end event');
		active = false;
		flush(true, () => {
			//console.log('end');
			cbFinished()
		});
	})

	function flush(force, cbFlush) {
		if (!force && buffer.length < 16) return cbFlush();
		stream.pause();

		//console.log(buffer);
		buffer = Buffer.concat(buffer);
		buffer = buffer.toString('utf8');
		var lines = buffer.split('\n');
		if (!force) buffer = [Buffer.from(lines.pop())];

		if (lines.length === 0) {
			stream.resume();
			cbFlush();
			return
		}

		async.eachSeries(
			lines,
			(line,cb) => {
				cbEntry(line, index, () => {
					index++;
					cb()
				});
			},
			() => {
				//console.log('parse lines finished');
				stream.resume();
				cbFlush();
			}
		);
	}
}

function Writer(filename) {
	var file = fs.createWriteStream('../data/'+filename+'.tsv.gz');
	var stream = zlib.createGzip({level:9});
	stream.pipe(file);
	var buffer = [];
	var size = 0;

	function flush(force, cb) {
		if (!force && (size < 1e6)) return setImmediate(cb);
		stream.write(buffer.join('\n')+'\n', 'utf8', cb)
		buffer = [];
		size = 0;
	}
	
	return {
		close: (cb) => {
			flush(true, () => stream.end(cb))
		},
		write: (data, cb) => {
			buffer.push(data);
			size += data.length;
			flush(false, cb);
		}
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