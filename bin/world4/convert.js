"use strict"

const havel = require('havel');

havel.pipeline(
	havel.readFile('/root/data/twitter/world4/4_friends-2022_02_28_082704.tsv.xz', {showProgress:true}),
	havel.decompressXZ(),
	havel.split(),
	//havel.head(10),
	havel.map(line => havel.KeyValue(...line.split('\t')), {outputType:'keyValue'} ),
	havel.keyValueToStream(),
	havel.writeFile('/root/data/twitter/world4/4_friends-2022_02_28_082704.bin'),
	() => console.log('finished')
)
