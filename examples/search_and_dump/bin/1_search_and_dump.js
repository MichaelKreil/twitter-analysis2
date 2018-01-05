"use strict";

const fs = require('fs');
const xz = require('xz');
const utils = require('../../../lib/utils.js');
const colors = require('colors');
const scraper = (require('../../../lib/scraper.js'))('hashtag');
const path = require('path');
const parseQuery = (url => require('querystring').parse(require('url').parse(url).query));

var dates = [];
var today = Math.floor(Date.now()/86400000)+0.5;
for (var i = -10; i < 0; i++) {
	var d = Date.now()/86400000
	dates.push((new Date((today+i)*86400000)).toISOString().substr(0,10));
}

var hashtags = [
	{name: '34c3', query: '34c3'},
	{name: 'iranprotests', query: 'تظاهرات_سراسری OR IranProtests'},
	{name: 'netzdg', query: 'NetzDG'},
	{name: 'olympics_2018', query: 'PyeongChang2018'},
	{name: 'silvester', query: 'Silvester'},
	{name: 'trump_mentions', query: 'to:realDonaldTrump OR to:POTUS'},
	{name: 'trump_tweets', query: 'from:realDonaldTrump OR from:POTUS'},
]

hashtags.forEach(obj => {
	dates.forEach(date => {
		runScraper(obj.name, obj.query, date);
	})
})

scraper.run();

function runScraper(name, query, date) {
	var filename = path.resolve(__dirname, '../data/'+name+'/'+name+'_'+date+'.jsonstream');

	if (fs.existsSync(filename) || fs.existsSync(filename+'.xz')) {
		console.log(colors.yellow('Ignore "'+name+'" "'+date+'"'));
		return;
	}

	utils.ensureDir(filename);


	var tweets = new Map();

	var task = scraper.getSubTask()

	scrape();

	task.finished(() => {
		tweets = Array.from(tweets.values());
		if (tweets.length === 0) return;

		tweets.sort((a,b) => a.id_str < b.id_str ? -1 : 1);

		tweets = tweets.map(t => t.buffer);

		saveBufferArray(filename, tweets);
	})

	function scrape(max_id) {
		var attributes = {q:query, result_type:'recent', count:100, max_id:max_id};

		var minDate = new Date(date);
		var maxDate = new Date(minDate.getTime()+86400000);
		attributes.until = maxDate.toISOString().substr(0,10);

		task.fetch(
			'search/tweets',
			attributes,
			result => {
				result.statuses = result.statuses.filter(t => {
					var d = new Date(t.created_at);
					if (d < minDate) return false;
					if (d > maxDate) return false;
					return true;
				})

				result.statuses.forEach(t => tweets.set(t.id_str, {
					id_str: t.id_str,
					created_at: t.created_at,
					buffer: Buffer.from(JSON.stringify(t)+'\n', 'utf8')
				}));

				var min_id = utils.getTweetsMinId(result.statuses);

				if (min_id) {
					console.log([
						'next_id: '+min_id,
						'date: '+(result.statuses[0]||{}).created_at,
						'count: ' + tweets.size
					].join('\t'));

					scrape(min_id);
				}
			}
		)
	}
}

function saveBufferArray(filename, bufs) {
	filename += '.xz';

	const shortName = path.basename(filename);
	const lines = 1000;
	const maxLines = bufs.length;

	const compression = new xz.Compressor(9);
	const outStream = fs.createWriteStream(filename);

	compression.pipe(outStream);

	write()

	function write() {
		if (bufs.length === 0) return compression.end();

		var chunk = Buffer.concat(bufs.slice(0,lines));
		bufs = bufs.slice(lines);

		if (compression.write(chunk)) {
			setTimeout(write, 1);
		} else {
			compression.once('drain', () => {
				write();
			});
		}
		console.log('   save "'+shortName+'" '+(100*(1-bufs.length/maxLines)).toFixed(1)+'%');
	}
}
