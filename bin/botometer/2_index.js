"use strict"

const fs = require('fs');

const folder = 'results';//_2019-05-08';

var result = [];
fs.readdirSync(folder).forEach(file => {
	if (!file.endsWith('.tsv')) return;
	if (file.startsWith('_')) return;

	var data = fs.readFileSync(folder+'/'+file, 'utf8').split('\n').map(l => {
		l = l.split('\t');
		return {
			name:l[0], 
			score:parseFloat(l[1]),
		}
	});
	var botCount = data.filter(data => data.score > 2.5).length;
	result.push([
		botCount/data.length,
		[
			(100*botCount/data.length).toFixed(1)+'%',
			file.slice(0,-4),
			botCount+' of '+data.length,
		].join('\t')
	]);
})

result.sort((a,b) => b[0]-a[0]);
result = result.map(e => e[1]).join('\n');

console.log(result);

fs.writeFileSync(folder+'/_index.tsv', result, 'utf8');
