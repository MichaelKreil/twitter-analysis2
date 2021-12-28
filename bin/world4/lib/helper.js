"use strict"

const fs = require('fs');
const child_process = require('child_process');

module.exports = {
	read
	readLines,
	readXzLines,
	readXzNdjsonEntries,
	sleep,
	sluggify,
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

async function* readLines(stream) {
	let buffer = Buffer.alloc(0);
	for await (let block of stream) {
		buffer = Buffer.concat([buffer, block]);

		let pos, lastPos = 0;
		while ((pos = buffer.indexOf(10, lastPos)) >= 0) {
			let line = buffer.slice(lastPos, pos);
			try {
				yield line.toString();
			} catch (e) {}
			lastPos = pos+1;
		}
		buffer = buffer.slice(lastPos);
	}
	if (buffer.length > 0) yield buffer.toString();
}

function getXZ(filename) {
	if (!fs.existsSync(filename)) throw Error(`file does not exist "${filename}"`)

	const xz = child_process.spawn('xz', ['-dck', filename], {highWaterMark:1024*1024});
	xz.on('exit',  (c,s) => { if (c) console.error('xz: exit',c,s) });
	xz.on('close', (c,s) => { if (c) console.error('xz: close',c,s) });
	xz.on('error', e => { throw e });

	return xz;
}

function readXzLines(filename) {
	const xz = getXZ(filename);
	return readLines(xz.stdout);
}

async function* readXzNdjsonEntries(filename) {
	const xz = getXZ(filename);

	let buffer = Buffer.alloc(0);
	for await (let block of xz.stdout) {
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
