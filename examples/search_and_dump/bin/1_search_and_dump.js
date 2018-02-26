"use strict";

const fs = require('fs');
const lzma = require('lzma-native');
const utils = require('../../../lib/utils.js');
const colors = require('colors');
const scraper = (require('../../../lib/scraper.js'))('search_and_dump');
const path = require('path');


// List of search queries

var queries = [
	{name: '34c3',            query: {q: '34c3'}},
	{name: 'iranprotests',    query: {q: 'تظاهرات_سراسری OR IranProtests'}},
	{name: 'netzdg',          query: {q: 'NetzDG'}},
	{name: 'olympics_2018',   query: {q: '#olympia2018 OR #pyeongchang2018 OR #olympics OR #olympia OR #doping'}},
	{name: 'pyeongchang2018', query: {q: 'pyeongchang2018'}},
	{name: 'trump_mentions',  query: {q: 'to:realDonaldTrump OR to:POTUS'}},
	{name: 'trump_tweets',    query: {q: 'from:realDonaldTrump OR from:POTUS'}},
	{name: 'emmanuelmacron',  query: {q: 'from:EmmanuelMacron OR to:EmmanuelMacron'}},
	{name: 'elysee',          query: {q: 'from:Elysee OR to:Elysee'}},
	{name: 'metoo',           query: {q: '#metoo'}},
	{name: 'lufthansa',       query: {q: 'lufthansa OR ExploreTheNew'}},
	{name: 'heimathorst',     query: {q: 'heimathorst OR heimatministerium'}},
	{name: 'heimat',          query: {q: 'heimat'}},
	{name: 'groko',           query: {q: 'groko'}},
	{name: 'amadeuantonio',   query: {q: 'AmadeuAntonio OR from:AmadeuAntonio OR to:AmadeuAntonio'}},
	{name: 'rechts_aufbruch', query: {q: 'aufbruchinsungewisse'}},
	{name: 'rechts',          query: {q: 'Staatsfernsehen OR Merkelmussweg OR widerstand OR AfDwaehlen OR StopIslam OR Antifaverbot OR StopAsyl'}}, 
	{name: '120db',           query: {q: 'Frauenmarsch OR 120db OR b1702 OR dd1702 OR ndh1702 OR niun1702 OR niun OR no120db'}}, 
	{name: 'floridashooting', query: {q: 'emmagonzalez OR floridahighschool OR floridaschoolshooting OR floridashooter OR floridashooting OR floridastrong OR guncontrol OR guncontrolnow OR gunlawsnow OR gunreformnow OR gunsafety OR gunsense OR gunshooting OR highschoolshooter OR march4ourlives OR marchforourlives OR massshooting OR massshootings OR neveragain OR nrabloodmoney OR parklandschoolshooting OR parklandshooting OR righttobeararms OR schoolshooting'}},
]


// Search with each of these queries,
// for each of the last 14 days

var today = Math.floor(Date.now()/86400000-0.25)+0.5;
for (var i = -14; i < 0; i++) {
	var date = (new Date((today+i)*86400000)).toISOString().substr(0,10);
	queries.forEach(obj => runScraper(obj.name, obj.query, date))
}


// Start scraper
scraper.run();



function runScraper(name, query, date) {
	var filename = path.resolve(__dirname, '../data/'+name+'/'+name+'_'+date+'.jsonstream.xz');
	var tmpFile = path.resolve(__dirname, Math.random().toFixed(16).substr(2)+'.tmp.xz');

	// Does the file already exists
	if (fs.existsSync(filename)) {
		console.log(colors.grey('Ignore "'+date+'" - "'+name+'" '));
		return;
	}

	// Prepare Compressor
	var compressor = lzma.createCompressor({
		check: lzma.CHECK_NONE,
		preset: 9 | lzma.PRESET_EXTREME,
		synchronous: false,
		threads: 1,
	});
	var stream = fs.createWriteStream(tmpFile, {highWaterMark: 8*1024*1024});
	compressor.pipe(stream);

	// Make sure that the folder exists
	utils.ensureDir(filename);

	// Map of all found tweets
	var tweets = new Map();

	// new scraper sub task
	var task = scraper.getSubTask()

	// flush data buffer to lzma compressor
	function flushOutput(cb) {
		console.log(colors.green('flushing '+name))
		tweets = Array.from(tweets.values());

		if (tweets.length === 0) return cb();

		tweets.sort((a,b) => a.id_str < b.id_str ? -1 : 1);
		tweets = tweets.map(t => t.buffer);
		var buffer = Buffer.concat(tweets);
		tweets = new Map();

		if (compressor.write(buffer)) {
			cb();
		} else {
			compressor.once('drain', cb);
		}
	}

	// when finished: flush data and close file
	function closeOutput() {
		console.log(colors.green('prepare closing '+name));
		flushOutput(() => {
			console.log(colors.green('closing '+name));
			stream.on('close', () => {
				console.log(colors.green.bold('closed '+name));
				fs.renameSync(tmpFile, filename);
			})
			compressor.end();
		})
	};

	// start recursive scraper
	scrape();

	function scrape(max_id) {
		var attributes = {result_type:'recent', count:100, max_id:max_id};
		Object.keys(query).forEach(key => attributes[key] = query[key])

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

				if (tweets.size > 10000) {
					flushOutput(checkRerun);
				} else {
					checkRerun()
				}

				function checkRerun() {
					var min_id = utils.getTweetsMinId(result.statuses);
					if (min_id) {
						console.log(colors.grey(
							'   '+
							(result.statuses[0]||{}).created_at.replace(/ \+.*/,'')+
							'   '+name
						));
						scrape(min_id);
					} else {
						closeOutput();
					}
				}
			}
		)
	}
}
