"use strict";

const query = '#cambioclimático OR #climateaction OR #climateactionnow OR #climatecrisis OR #climateemergency OR #climatejustice OR #climatejusticenow OR #climatemarch OR #climatestrike OR #climatestrikes OR #extinctionrebellion OR #fridayforfuture OR #fridays4future OR #fridaysforfuture OR #fridaysforfutures OR #globalclimatestrike OR #greveglobalpeloclima OR #grevepourleclimat OR #schoolstrike4climate OR #scientists4future OR #strike4climate OR #youthstrike4climate OR #グローバル気候マーチ';
const maxTweetCount = 10000;

const fs = require('fs');
const utils = require('../../lib/utils.js');
const colors = require('colors');
const scraper = require('../../lib/scraper.js')();


startScraper(result => {
	result.sort((a,b) => b.count - a.count);
	result = result.slice(0,500);
	result.forEach(h => {
		console.log(h.count+'\t'+h.text);
	})
});

scraper.run();



function startScraper(cbScraper) {
	var hashtags = new Map();
	var tweetCount = 0;

	var task = scraper.getSubTask()

	scrape(query, () => {
		cbScraper(Array.from(hashtags.values()));
	});

	function scrape(query, cbScrape) {
		scrapeRec();

		function scrapeRec(max_id) {
			var attributes = {
				result_type:'recent',
				tweet_mode:'extended',
				count:100,
				max_id:max_id,
				q:query,
			};

			task.fetch(
				'search/tweets',
				attributes,
				result => {

					result.statuses.forEach(t => {
						if (t.retweeted_status) t = t.retweeted_status;
						t.entities.hashtags.forEach(h => {
							var key = h.text.toLowerCase();
							if (!hashtags.has(key)) {
								hashtags.set(key, {text:h.text, count:1})
							} else {
								hashtags.get(key).count++;
							}
						})
					});
					
					tweetCount += result.statuses.length;

					if (tweetCount > maxTweetCount) {
						cbScrape();
					} else {
						var min_id = utils.getTweetsMinId(result.statuses);
						if (min_id) {
							scrapeRec(min_id);
						} else {
							cbScrape();
						}
					}
				}
			)
		}

	}
}



