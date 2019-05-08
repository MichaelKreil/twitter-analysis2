"use strict"

const fs = require('fs');

var result = [];
fs.readdirSync('results').forEach(file => {
	if (!file.endsWith('.json')) return;
	var data = JSON.parse(fs.readFileSync('results/'+file, 'utf8'));
	var botCount = data.filter(data => data.score > 0.5).length;
	result.push([botCount/data.length, [(100*botCount/data.length).toFixed(1)+'%', file.slice(0,-5)].join('\t')]);
})

result.sort((a,b) => b[0]-a[0]);
result = result.map(e => e[1]).join('\n');

console.log(result);

fs.writeFileSync('results/_index.tsv', result, 'utf8');