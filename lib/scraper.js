"use strict"

const twitter = require('./twitter-wrapper.js');

function Scraper(name) {
	//if (!name) throw Error('Scraper needs a name');
	if (name) twitter.initDB(name);

	const maxCount = 16;
	var tasks = [];
	var running = 0;

	function next() {
		while ((running < maxCount) && (tasks.length > 0)) {
			(() => {
				var task = tasks.shift();
				running++;
				setImmediate(() => {
					task(() => {
						running--;
						next();
					})
				})
			})();
		}
	}

	return TaskGroup();

	function TaskGroup() {
		var me = {};
		var finished = [];
		var taskSet = new Set();
		
		me.getSubTask = function () {
			let group = TaskGroup();
			taskSet.add(group);
			group.finished(() => {
				taskSet.delete(group);
				check();
			})
			return group;
		}

		me.fetch = function (type, params, cbFetch) {
			let task = function (cbTask) {
				twitter.fetch(type, params, (result) => {
					if (cbFetch) cbFetch(result);
					taskSet.delete(task);
					check();
					cbTask();
				});
			}
			taskSet.add(task);
			tasks.push(task);
			next();
		}

		me.allUserTweets = function (screen_name, cb) {
			scrapeTweets(screen_name, 'statuses/user_timeline', cb);
		}
		
		me.allUserFavs = function (screen_name, cb) {
			scrapeTweets(screen_name, 'favorites/list', cb);
		}

		function scrapeTweets(screen_name, apiCall, cb) {
			var task = me.getSubTask();
			var tweets = [];
			scan();

			function scan(maxId) {
				task.fetch(
					apiCall,
					{screen_name: screen_name, count:200, max_id:maxId},
					result => {
						if (result.error) return finalize();

						if (!result) result = [];

						var finished = !result.length;
						if (!finished) {
							var minId = result[result.length-1].id_str;
							minId = dec(minId);
						}

						tweets.push(result);

						if (finished) return finalize();
						
						scan(minId);
					}
				)
			}

			function finalize() {
				tweets = Array.prototype.concat.apply([], tweets);
				cb(tweets);
			}

			function dec(id) {
				id = id.split('');
				for (var i = id.length-1; i >= 0; i--) {
					var c = parseInt(id[i], 10);
					if (c === 0) {
						id[i] = '9';
					} else {
						id[i] = (c-1).toFixed(0);
						return id.join('');
					}
				}
			}
		}

		me.finished = function (cb) {
			finished.push(cb);
		}

		function check() {
			if ((taskSet.size === 0) && (finished.length > 0)) {
				var cb = finished.pop();
				setImmediate(() => {
					cb();
					check();
				})
			}
		}

		me.run = next;
		me.check = check;
		
		return me;
	}
}

module.exports = Scraper;
