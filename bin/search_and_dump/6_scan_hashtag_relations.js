"use strict";

const query = '#HongKong OR #HongKongProtests OR #AntiELAB OR #HongKongPolice OR #StandwithHK OR #HongKongProtest OR #StandwithHongKong OR #China70yearsOfShame OR #HKPolice OR #HongKongProtester OR #hongkongpolicebrutality OR #antiELABhk OR #FreeHongKong OR #HongKongProtesters OR #shout4HK OR #HongKongPoliceTerrorism';
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



