"use strict"

const fs = require('fs');
const child_process = require('child_process');
const miss = require('mississippi2');
const { resolve } = require('path');

const dataFolder = '/root/data/twitter/world4';

module.exports = {
	//parallelTransform,
	readLinesMulti,
	//read
	//readLines,
	readXzLines,
	//readXzNdjsonEntries,
	//sleep,
	//sluggify,
	xzWriter,
	uniq,
	findDataFile,
	getDataFile,
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

function uniq() {
	let uniq = child_process.spawn('uniq');
	return miss.duplex(uniq.stdin, uniq.stdout);
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

async function* readLinesMulti(filenames) {
	let streams = filenames.map((f,i) => ({
		dirty:true,
		active:true,
		iter:readXzLines(f, i === 0),
	}));
	while (true) {
		let minKey = false;
		for (let stream of streams) {
			if (stream.dirty) {
				if (stream.active) {
					let result = await stream.iter.next();
					stream.line = result.value;
					if (result.done) {
						stream.active = false;
					} else {
						let tabPos = stream.line.indexOf('\t');
						if (tabPos < 0) tabPos = stream.line.length;
						stream.key = stream.line.slice(0, tabPos);
					}
				}
				stream.dirty = false;
			}
			if (stream.active) {
				if (!minKey || (minKey.length < stream.key.length) || (minKey < stream.key)) minKey = stream.key;
			}
		}
		if (!minKey) return;
		yield {
			key:minKey,
			lines: streams.map(stream => {
				if (stream.active && (stream.key === minKey)) {
					stream.dirty = true;
					return stream.line;
				}
				return false
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
		let start = Date.now();
		let size = fs.statSync(filename).size;
		let pos = 0;
		file.on('data', c => {
			pos += c.length;

			let now = Date.now();

			if (now - lastUpdate < 1000) return;

			lastUpdate = now;
			let progress = pos/size;
			let eta = (new Date((now - start)/progress+start)).toLocaleString('de-DE', { timeZone: 'Europe/Berlin' });

			process.stderr.write('\r'+(100*progress).toFixed(2)+'% - '+eta);
		});
		file.on('close', () => process.stderr.write('\n'));
	}

	file.pipe(xz.stdin);

	return xz.stdout;
}

function xzWriter(filename) {
	const xz = child_process.spawn(
		'xz',
		['-z9T 0'],
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
