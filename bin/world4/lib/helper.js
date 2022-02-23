"use strict"

const fs = require('fs');
const child_process = require('child_process');
const miss = require('mississippi2');
const { resolve } = require('path');

const dataFolder = '/root/data/twitter/world4';

let compiled = false;

module.exports = {
	findDataFile,
	getDataFile,
	getRust,
	getSpawn,
	getTempFile,
	getXZ,
	jq,
	lineMerger,
	readLinesMulti,
	readXzLines,
	smallerThan,
	uniqSortedLines,
	xzWriter,
}

function lineMerger() {
	return miss.through((chunk, enc, cb) => cb(null, chunk+'\n'));
}

function uniqSortedLines(streams) {
	let compare = (a,b) => (a.length - b.length) || ((a < b) ? -1 : 1);
	let lastLine = '';
	let readyCount = 0;
	let finishedCount = 0;
	let streamCount = streams.length;
	let handler = new Handler();

	streams = streams.map((stream,i) => {
		let obj = { stream };
		stream.pipe(miss.to.obj(
			(line, enc, cbTo) => {
				obj.value = line;
				obj.cb = () => {
					obj.cb = false;
					cbTo();
				}
				readyCount++;
				//console.log('read',i,line,readyCount);
				handler.trigger();
			},
			cb => {
				//console.log('finished',i,readyCount);
				finishedCount++;
				readyCount++;
				handler.trigger();
				cb();
			}
		))
		return obj;
	})

	return miss.from.obj((size, next) => {
		handler.once(() => {
			if (finishedCount === streamCount) {
				return next(null, null);
			}
			let line = 'AAAAAAAAAAAAAAAAAAAA';
			streams.forEach(s => {
				if (!s.cb) return;
				if (compare(line, s.value) < 0) return;
				line = s.value;
			})

			//console.log('write',line,readyCount);

			if (compare(lastLine, line) >= 0) throw Error()
			lastLine = line;

			streams.forEach(s => {
				if (s.value === line) {
					process.nextTick(s.cb);
					s.cb = false;
					s.value = false;
					readyCount--;
				}
			})

			next(null, line);
		})
	})

	function Handler() {
		let callback;
		return { trigger, once }
		function trigger() {
			if (readyCount !== streamCount) return;
			if (callback) {
				process.nextTick(callback);
				callback = false;
			}
		}
		function once(cb) {
			if (callback) throw Error();
			callback = cb;
			trigger();
		}
	}
}

function getRust(name, args) {
	child_process.spawnSync(resolve(__dirname, './build.sh'), { stdio:'inherit', cwd:resolve(__dirname) })
	compiled = true;
	return getSpawn(resolve(__dirname, 'release', name), args)
}

function getSpawn() {
	let cp = child_process.spawn(...arguments)
	cp.stderr.pipe(process.stderr);
	return miss.duplex(cp.stdin, cp.stdout);
}

function findDataFile(name) {
	name += '-';
	let files = fs.readdirSync(dataFolder);
	files = files.filter(f => f.startsWith(name) && f.endsWith('.tsv.xz'));
	files.sort();
	return resolve(dataFolder, files.pop());
}

function getDataFile(name) {
	let d = (new Date()).toISOString().split(/[^0-9]+/g);
	d = d[0]+'_'+d[1]+'_'+d[2]+'_'+d[3]+d[4]+d[5];
	return resolve(dataFolder, name+'-'+d+'.tsv.xz');
}

function getTempFile(name) {
	let d = (new Date()).toISOString().split(/[^0-9]+/g);
	d = d[0]+'_'+d[1]+'_'+d[2]+'_'+d[3]+d[4]+d[5];
	return resolve(dataFolder, 'temp-'+d+'-'+Math.random().toString(36).slice(2,10)+'.tsv.xz');
}

function jq(query) {
	return getSpawn('jq', ['-rc', query]);
}

function sleep(time) {
	return new Promise(res => setTimeout(res, time));
}

function sluggify(text) {
	return text.trim().toLowerCase().replace(/./g, c => {
		switch (c) {
			case 'ä': return 'ae';
			case 'ö': return 'oe';
			case 'ü': return 'ue';
			case 'ß': return 'ss';
		}
		return c;
	}).replace(/[^a-z0-9]+/g,'_').replace(/^_+|_+$/g, '');
}

function smallerThan(a,b) {
	return (a.length === b.length) ? (a < b) : (a.length < b.length);
}

async function* readLinesMulti(filenames) {
	//console.log('readLinesMulti',filenames);
	let streams = filenames.map((f,i) => ({
		i,
		dirty:true,
		active:true,
		iter:readXzLines(f, i === filenames.length-1),
	}));

	while (true) {
		let minKey = false;
		for (let stream of streams) {
			//console.log({i:stream.i, dirty:stream.dirty, active:stream.active});
			if (stream.dirty) {
				if (stream.active) {
					let result = await stream.iter.next();
					stream.line = result.value;
					//console.log('read', stream.line.slice(0,30))
					if (result.done) {
						stream.active = false;
						continue;
					}
					let tabPos = stream.line.indexOf('\t');
					stream.key = (tabPos < 0) ? stream.line : stream.line.slice(0, tabPos);
					stream.dirty = false;
				}
			}
			if (stream.active) {
				if (!minKey || smallerThan(stream.key, minKey)) minKey = stream.key;
			}
		}
		if (!minKey) return;
		yield {
			key:minKey,
			lines: streams.map(stream => {
				if (!stream.active) return false;
				if (stream.key !== minKey) return false;
				stream.dirty = true;
				return stream.line;
			})
		}
	}
}

async function* readLines(stream) {
	let buffer = Buffer.alloc(0);
	for await (let block of stream) {
		buffer = Buffer.concat([buffer, block]);

		let pos, lastPos = 0;
		while ((pos = buffer.indexOf(10, lastPos)) >= 0) {
			let line = buffer.slice(lastPos, pos).toString();
			try {
				yield line;
			} catch (e) {
			}
			lastPos = pos+1;
		}
		buffer = buffer.slice(lastPos);
	}
	if (buffer.length > 0) yield buffer.toString();
}

function getXZ(filename, showProgress) {
	let lastUpdate = 0;
	if (!fs.existsSync(filename)) throw Error(`file does not exist "${filename}"`)

	const file = fs.createReadStream(filename)
	const xz = child_process.spawn('xz', ['-d'], {highWaterMark:1024*1024});
	xz.on('exit',  (c,s) => { if (c) console.error('xz: exit',c,s) });
	xz.on('close', (c,s) => { if (c) console.error('xz: close',c,s) });
	xz.on('error', e => { throw e });

	if (showProgress) {
		let size = fs.statSync(filename).size;
		let pos = 0;
		let times = [{pos,time:Date.now()}];
		file.on('data', c => {
			pos += c.length;

			let now = Date.now();

			if (now - lastUpdate < 1000) return;
			if (now - times[0].start > 30000) {
				times.push({pos,time:now});
				if (times.length > 10) times.slice(-10);
			}

			lastUpdate = now;
			let posDiff  = pos - times[0].pos;
			let timeDiff = now - times[0].time;
			let progress = pos/size;
			let eta = (new Date(timeDiff*(size-pos)/posDiff + now));
			eta = eta.toLocaleString('de-DE', { timeZone: 'Europe/Berlin' });
			let speed = (posDiff/1048576)/(timeDiff/1000);

			process.stderr.write('\r'+[
				(100*progress).toFixed(2)+'%',
				speed.toFixed(2)+'MB/s',
				eta,
			].join(' - '));
		});
		file.on('close', () => process.stderr.write('\n'));
	}

	file.pipe(xz.stdin);

	return xz.stdout;
}

function xzWriter(filename, level = 9, threads = 0) {
	const xz = child_process.spawn(
		'xz',
		[`-z${level}T`, threads],
		{ stdio: ['pipe', 'pipe', process.stderr] }
	)
	xz.stdout.pipe(fs.createWriteStream(filename));
	return xz.stdin;
}

async function* readXzLines(filename, showProgress) {
	yield* readLines(getXZ(filename, showProgress));
}

async function* readXzNdjsonEntries(filename, showProgress) {
	const xz = getXZ(filename, showProgress);

	let buffer = Buffer.alloc(0);
	for await (let block of xz) {
		buffer = Buffer.concat([buffer, block]);

		let pos, lastPos = 0;
		while ((pos = buffer.indexOf(10, lastPos)) >= 0) {
			let line = buffer.slice(lastPos, pos);
			try {
				yield JSON.parse(line);
			} catch (e) {}
			lastPos = pos+1;
		}
		buffer = buffer.slice(lastPos);
	}
	if (buffer.length > 0) yield JSON.parse(buffer);
}
