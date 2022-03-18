"use strict"

const havel = require('havel');

havel.pipeline(
	havel.readFile('/root/data/twitter/world4/4_friends-2022_02_28_082704.tsv.xz', {
		showProgress: true
	}),
	havel.decompressXZ(),
	havel.split(),
	havel.map(line => {
		line = line.split('\t');
		let key = line[0];
		let value = JSON.parse(line[1]);
		return new havel.KeyValue(key, value)
	}, {
		outputType: 'keyValue'
	}),
	havel.eachPairWise((e1, e2) => {
		if (e1.key.length < e2.key.length) return;
		if ((e1.key.length > e2.key.length) || (e1.key >= e2.key)) {
			throw Error(`${JSON.stringify(e1.key)} >= ${JSON.stringify(e2.key)}`);
		}
	}),
	havel.keyValueToStream(),
	havel.writeFile('/root/data/twitter/world4/4_friends-2022_02_28_082704.bin'),
	() => console.log('finished')
)
