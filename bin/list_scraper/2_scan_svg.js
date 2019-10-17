"use strict";

const config = require('./config');
const fs = require('fs');


config.files.forEach(f => {
	var include = [];

	var svg = f.name+'.svg';
	console.log(svg);
	svg = fs.readFileSync(svg, 'utf8').replace(/[\s]+/g,'');
	svg = svg.split('<circle').slice(1);
	svg = svg.map(c => {
		var color = /fill="#(.*?)"/.exec(c) || /fill:#(.*?);/.exec(c);
		if (!color) throw Error(c);
		color = color[1];

		if (color.length === 6) color = color[0]+color[2]+color[4];

		if (color === '888') return;
		
		var id = /id="_(.*?)"/.exec(c)[1];
		if (color === '00F') return include.push(id);
		if (color === 'F00') return;

		console.log(id, color);
		process.exit();
	})

	include.sort();

	fs.writeFileSync('data/'+f.name+'.txt', include.join('\n'), 'utf8')

})

//var filename = 'data/'+name+'.txt';
