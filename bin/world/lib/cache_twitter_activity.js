"use strict"

const CacheResults = require('../lib/cache_results.js');
const scraper = require('../../../lib/scraper.js')('world_activity');

const maxActive = 8;
var active = 0;

module.exports = new (function () {
	var buffer = [];

	return new CacheResults(
		'activity',
		(id, cbFriends) => {
			buffer.push([id, cbFriends]);
			checkBuffer();
		}
	)

	function checkBuffer() {
		if (buffer.length <= 0) return;
		if (active >= maxActive) return;

		var ids = buffer.slice(0,100);
		buffer = buffer.slice(100);

		var lookup = new Map();
		ids = ids.map(entry => {
			if (!lookup.has(entry[0])) lookup.set(entry[0], []);
			lookup.get(entry[0]).push(entry[1]);
			return entry[0];
		})

		active++;

		scraper.fetch(
			'users/lookup',
			{user_id:ids.join(','), include_entities:false, tweet_mode:'extended'},
			result => {
				if (!result) result = [];

				result.forEach(u => {
					var id = u.id_str;
					var value = u.protected ? 0 : Math.floor(Math.sqrt(u.followers_count * u.statuses_count));

					if (!lookup.has(id)) return;
					lookup.get(id).forEach(cb => cb(null, value.toFixed()));
					lookup.delete(id);
				})

				Array.from(lookup.values()).forEach(cbs => {
					cbs.forEach(cb => cb(null, '0'));
				})

				active--;
				checkBuffer();
			}
		)
	}
})
