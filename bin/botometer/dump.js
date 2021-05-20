"use strict";

const fs = require('fs');
const level = require('level');
const db = level('/root/data/temp/cache/botometer_2021-01-25_3');

(async () => {
	for await (let entry of db.createReadStream()) {
		await new Promise(res => process.stdout.write(entry.key+'\t'+entry.value+'\n', 'utf8', res));
	}
})()
