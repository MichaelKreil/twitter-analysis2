"use strict";

const query = 'racism,racist,racists,prejudice,anti-semitic,homophobe,lgbtq+,supremacy,superiority,#blacklivesmater,#blacklivesmatter,#youaintblack'.replace(/,/g, ' OR ');
const maxTweetCount = 10000;
const hashtagsOnly = false;

const fs = require('fs');
const utils = require('../../lib/utils.js');
const colors = require('colors');
const scraper = require('../../lib/scraper.js')();

var wordlist = new Set();
fs.readFileSync('wordlist/top10000de.txt', 'utf8').toLowerCase().split('\n').forEach(w => wordlist.add(w));
fs.readFileSync('wordlist/top10000en.txt', 'utf8').toLowerCase().split('\n').forEach(w => wordlist.add(w));
fs.readFileSync('wordlist/top10000nl.txt', 'utf8').toLowerCase().split('\n').forEach(w => wordlist.add(w));
fs.readFileSync('wordlist/top10000fr.txt', 'utf8').toLowerCase().split('\n').forEach(w => wordlist.add(w));
'http,https,amp'.toLowerCase().split(',').forEach(w => wordlist.add(w));

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

						var urls = [];
						var words = t.full_text
							.toLowerCase()
							.replace(/https?:\/\/[\w\-\._~:/?#[\]@!\$&'\(\)\*\+,;=.]+$/g, url => {
								urls.push(url.replace(/^https?:\/\//, ''));
								return ' ';
							})
							.replace(/[\s,.?!;()*“”":'`´]+/g, ' ')
							.split(' ');
						if (urls.length > 0) words = words.concat(urls);

						words = words.filter(w => {
							if (w.length <= 2) return false;
							if (w[0] === '#') return (w.length >= 3);
							if (hashtagsOnly) return false;
							if (wordlist.has(w)) return false;
							return true;
						})
						words.forEach(w => {
							if (w === 'amviv1lhyj') console.log(t);
							if (!hashtags.has(w)) {
								hashtags.set(w, {text:w, count:1})
							} else {
								hashtags.get(w).count++;
							}
						})
					})
					
					tweetCount += result.statuses.length;

					if (tweetCount > maxTweetCount) {
						var lastTweet = result.statuses.pop();
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



