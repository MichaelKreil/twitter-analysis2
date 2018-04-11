"use strict"

const fs = require('fs');
const tsv = require('tsv');
const path = require('path');
const level = require('level');

const nodeCount = 1587616;

var db = level('_server', { keyEncoding: 'utf8', valueEncoding: 'utf8' });

var nodeX = new Float64Array(nodeCount);
var nodeY = new Float64Array(nodeCount);

fs.readFileSync('positions14X.bin').copy(Buffer.from(nodeX.buffer));
fs.readFileSync('positions14Y.bin').copy(Buffer.from(nodeY.buffer));

var accountSet = new Set();
var accounts = tsv.parse(fs.readFileSync('accounts_fake.tsv', 'utf8'));
accounts.forEach(entry => {
	if (entry.fakes > 0) accountSet.add(entry.name.toLowerCase());
})

var count = 0;

db.createReadStream({
	gte: 'id_', lte: 'id_@',
	keys: false, values: true,
})
	.on('data', function (data) {
		if (count % 2e5 === 0) console.log((100*count/nodeCount).toFixed(1)+'%');
		count++;

		data = JSON.parse(data);

		if (accountSet.has(data.screen_name.toLowerCase())) {
			nodeY[data.node] += 100000;
		}
	})
	.on('error', function (err) {
		console.log('Oh my!', err)
	})
	.on('end', function () {
		console.log('Stream ended', count)
		fs.writeFileSync('positionsX_moved.bin', Buffer.from(nodeX.buffer));
		fs.writeFileSync('positionsY_moved.bin', Buffer.from(nodeY.buffer));
	})
