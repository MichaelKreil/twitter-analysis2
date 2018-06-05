"use strict"

const MultiDB = require('../lib/multi_db.js');
const resolve = require('path').resolve;

module.exports = Cache;

function Cache(name, fallback, opts) {
	var db = new MultiDB(resolve(__dirname, '../../../data/world/dbs/'+name), opts);

	return function request(id, cbRequest) {
		db.get(id, (err, dbResult) => {
			if (!err) return cbRequest(null, dbResult);

			fallback(
				id,
				(err, fbResult) => {
					db.put(
						id,
						fbResult,
						() => cbRequest(null, fbResult)
					)
				}
			)
		})
	}
}
