"use strict"

const fs = require('fs');
const cluster = require('cluster');
const zlib = require('zlib');

var input = 'data/tweets/';
var processes = 30;

if (cluster.isMaster) {
	startMaster();
} else {
	startWorker();
}

function startMaster() {
	var progress = [];

	for (var i = 0; i < processes; i++) (function () {
		var rest = i;
		var progressStep = {i:0, n:1};
		progress.push(progressStep);

		var worker = cluster.fork();
		worker.on('message', e => {
			progressStep.i = e[0];
			progressStep.n = e[1];
		})
		worker.on('online', () => {
			worker.send({rest:rest})
		})
	
	})()

	setInterval(() => {
		var sumI = 0, sumN = 0;
		progress.forEach(p => {
			sumI += p.i;
			sumN += p.n;
		})
		process.stderr.write('\r'+(100*sumI/sumN).toFixed(2)+'% - '+progress.map(p => (p.n <= 1) ? '?' : (p.i >= p.n) ? '#' : '.').join(''));

		if (sumI >= sumN) process.exit();
	}, 3000)
}

function startWorker() {
	process.on('message', msg => {
		var rest = msg.rest;
		var files = fs.readdirSync(input);
		var results = [];

		files = files.filter(f => {
			if (!f.endsWith('.json.gz')) return false;

			var sum = 0;
			for (var i = 0; i < f.length; i++) sum += f.charCodeAt(i);
			//console.log(sum, f.length);

			return (sum % processes === rest);
		})

		console.log(rest, files.length);

		files.forEach((f, index) => {
			if (index % 100 === 0) process.send([index, files.length]);

			var data = fs.readFileSync(input+f);
			data = zlib.gunzipSync(data);
			data = JSON.parse(data);
			//console.log(data);
			if (!data.user.verified) return;

			var obj = {
				id_str: data.user.id_str,
				screen_name: data.user.screen_name,
				name: data.user.name,
				times: data.tweets.map(t => Date.parse(t.created_at)/1000),
			}
			//console.log(obj);
			results.push(Buffer.from(JSON.stringify(obj)+'\n'));
		})

		fs.writeFileSync('data/times_'+rest+'.ndjson', Buffer.concat(results), 'utf8');

		process.send([files.length, files.length]);
	})
}



/*

var files = fs.readdirSync(input);

var results = [];

files.forEach((f, index) => {
	if (index % 3000 === 0) console.log((100*index/files.length).toFixed(1)+'%');
	if (!f.endsWith('.json.gz')) return;

	//console.log(f);
	var data = fs.readFileSync(input+f);
	data = zlib.gunzipSync(data);
	data = JSON.parse(data);
	//console.log(data);
	if (!data.user.verified) return;

	var obj = {
		id_str: data.user.id_str,
		screen_name: data.user.screen_name,
		name: data.user.name,
		times: data.tweets.map(t => Date.parse(t.created_at)/1000),
	}
	//console.log(obj);
	results.push(Buffer.from(JSON.stringify(obj)+'\n'));
})

fs.writeFileSync('data/times.ndjson', Buffer.concat(results), 'utf8');
// console.log(files.length);
*/