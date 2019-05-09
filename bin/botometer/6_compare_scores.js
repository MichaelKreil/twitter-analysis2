"use strict"

const fs = require('fs');
const zlib = require('zlib');
const maxLength = 128*1024*1024;

var fd = fs.openSync('botscores.tsv', 'w');

fs.writeSync(fd, 'screen_name\tlang\tscore_english\tscore_universal\n');

fs.readdirSync('results').forEach(file => {
	if (!file.endsWith('.ndjson.gz')) return;
	//if (!file.startsWith('republica')) return;

	console.log('scan '+file);
	var results = [];

	var data = fs.readFileSync('results/'+file);
	data = zlib.gunzipSync(data);

	while (data.length > 0) {
		var block;
		console.log((data.length/maxLength).toFixed(1));
		if (data.length > maxLength) {
			var i = data.lastIndexOf(10, maxLength, 'utf8')+1;
			block = data.slice(0,i);
			data = data.slice(i);
		} else {
			block = data;
			data = [];
		}

		block = block.toString('utf8').split('\n');

		block.forEach(e => {
			if (!e) return;
			try {
				e = JSON.parse(e);
			} catch (err) {
				console.log(e);
				console.log(err);
			}
			e = [e.user.screen_name, e.user.lang, e.scores.english, e.scores.universal];
			results.push(e.join('\t'));
		})
	}

	fs.writeSync(fd, results.join('\n')+'\n');
})

fs.closeSync(fd);

