"use strict"

const scraper = require('../../../lib/scraper.js')('world2');

module.exports = {
	fetchFriends: new FetchFriends(),
	fetchMeta: new FetchMeta(),
}

function FetchFriends() {
	return function fetchFriends(userId, cbFriends) {
		scraper.fetch(
			'friends/ids',
			{user_id:userId, stringify_ids:true, count:5000},
			result => {
				result = (result && result.ids) || [];
				cbFriends(result);
			}
		)
	}
}

function FetchMeta() {
	var buffer = [];
	var timeout;

	return function fetchMeta(userId, cbMeta) {
		buffer.push([userId, cbMeta]);
		if (!timeout) timeout = setTimeout(checkBuffer, 10);
	}

	function checkBuffer() {
		if (timeout) {
			clearTimeout(timeout);
			timeout = false;
		}

		if (buffer.length <= 0) return;

		var ids = buffer.slice(0,100);
		buffer = buffer.slice(100);

		var lookup = new Map();
		ids = ids.map(entry => {
			if (!lookup.has(entry[0])) lookup.set(entry[0], []);
			lookup.get(entry[0]).push(entry[1]);
			return entry[0];
		})

		scraper.fetch(
			'users/lookup',
			{user_id:ids.join(','), include_entities:false, tweet_mode:'extended'},
			result => {
				if (!result) result = [];

				result.forEach(u => {
					console.dir(u, {colors:true});
					process.exit();
					var id = u.id_str;

					if (!lookup.has(id)) return;
					lookup.get(id).forEach(cb => cb(null, u));
					lookup.delete(id);
				})

				Array.from(lookup.values()).forEach(cbs => {
					cbs.forEach(cb => cb(null, {}));
				})
			}
		)

		setImmediate(checkBuffer);
	}
}

