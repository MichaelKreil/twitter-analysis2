"use strict"

const Levelup = require('level');
const crypto = require('crypto');
const path = require('path');

module.exports = function init(name) {
	var db = Levelup(path.resolve(__dirname, '../cache/'+name), { cacheSize: 1024*1024*1024, valueEncoding : 'json' });

	process.on('beforeExit', () => {
		if (!db || db.isClosed()) return;
		db.close();
	})

	return function (key, getResult, cbResult) {
		var hash = JSON.stringify(key);
		hash = crypto.createHash('md5').update(hash).digest('hex');

		db.get(hash, (err, result1) => {
			//err = {notFound:true};
			if (err && err.notFound) {
				getResult(result2 => {
					db.put(hash, result2, () => {
						cbResult(result2);
					})
				})
			} else {
				cbResult(result1);
			}
		});
	}
}