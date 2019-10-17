"use strict";

const prefix = '2019-10-01';

const dontSave = false;

const fs = require('fs');
const lzma = require('lzma-native');
const async = require('async');
const miss = require('mississippi2');
const botometer = require('../../lib/botometer.js')('botometer_'+prefix+'_1');
const scraper = require('../../lib/scraper.js')('botometer_'+prefix+'_2');
const cache = require('../../lib/cache.js')('botometer_'+prefix+'_3');
const colors = require('colors');

async.series([
	//cb => fetchFollowers('fdp', cb),
	//cb => fetchFollowers('CDU', cb),
	//cb => fetchFollowers('AfD', cb),
	//cb => fetchFollowers('CSU', cb),
	//cb => fetchFollowers('Die_Gruenen', cb),
	//cb => fetchFollowers('dielinke', cb),
	//cb => fetchFollowers('spdde', cb),
	
/*
	cb => fetchFriends('bbc', cb),
	cb => fetchFriends('nytimes', cb),
	cb => fetchFriends('republica', cb),
	cb => fetchFriends('SPIEGELONLINE', cb),
	cb => fetchFriends('tagesspiegel', cb),
	cb => fetchFriends('washingtonpost', cb),
	cb => fetchFriends('zeitonline', cb),

	cb => fetchList('afpfr', 'journalistesafp-certifiés', cb),
	cb => fetchList('AJEnglish', 'aje-staff', cb),
	cb => fetchList('AssembleeNat', 'les-députés', cb),
	cb => fetchList('BBC', 'accounts', cb),
	cb => fetchList('BBC', 'bbc-england', cb),
	cb => fetchList('BBC', 'bbc-news', cb),
	cb => fetchList('BBCNews', 'team-gb-olympians', cb),
	cb => fetchList('BBCNews', 'uk-politics', cb),
	cb => fetchList('BBCSport', 'football-league-players', cb),
	cb => fetchList('BBCSport', 'olympics', cb),
	cb => fetchList('BBCSport', 'premier-league-players', cb),
	cb => fetchList('BBCSport', 'ryder-cup', cb),
	cb => fetchList('BecomingDataSci', 'women-in-data-science', cb),
	cb => fetchList('BILD', 'wir-sind-bild', cb),
	cb => fetchList('business', 'bloomberg-journalists', cb),
	cb => fetchList('businessinsider', 'bi-editors-reporters', cb),
	cb => fetchList('BuzzFeed', 'buzzfeed-editorial', cb),
	cb => fetchList('CassLGarrison', 'reuters-journalists1', cb),
	cb => fetchList('CNBC', 'cnbc-accounts', cb),
	cb => fetchList('CNBC', 'cnbc-international', cb),
	cb => fetchList('CNBC', 'staff', cb),
	cb => fetchList('CNET', 'cnet-on-twitter', cb),
	cb => fetchList('CNN', 'cnn-news', cb),
	cb => fetchList('Congreso_Es', 'diputados-xii-legislatura', cb),
	cb => fetchList('cspan', 'congressional-media', cb),
	cb => fetchList('cspan', 'foreign-leaders', cb),
	cb => fetchList('cspan', 'members-of-congress', cb),
	cb => fetchList('cspan', 'political-reporters', cb),
	cb => fetchList('cspan', 'senators', cb),
	cb => fetchList('cspan', 'u-s-representatives', cb),
	cb => fetchList('DOSB', 'wir-für-deutschland', cb),
	cb => fetchList('dpa', 'afpakin', cb),
	cb => fetchList('dpa', 'afrika-journalisten', cb),
	cb => fetchList('dpa', 'afrika-medienii', cb),
	cb => fetchList('dpa', 'asien', cb),
	cb => fetchList('dpa', 'chefredaktionen', cb),
	cb => fetchList('dpa', 'dpa-mitarbeiter', cb),
	cb => fetchList('dpa', 'flucht-nach-deutschland', cb),
	cb => fetchList('dpa', 'gb-referendum', cb),
	cb => fetchList('dpa', 'promis-international', cb),
	cb => fetchList('dpa', 'terrorismus', cb),
	cb => fetchList('dpa', 'wwcelebrities', cb),
	cb => fetchList('dpa', 'wwpoliticians', cb),
	cb => fetchList('dpa_sport', 'olympia-2016-dt-team', cb),
	cb => fetchList('dpa_sport', 'olympia-int-stars', cb),
	cb => fetchList('elizhudson3', 'paralympicsgb-rio-2016', cb),
	cb => fetchList('engadget', 'team-engadget', cb),
	cb => fetchList('esa', 'astronauts', cb),
	cb => fetchList('europarl_en', 'all-meps-on-twitter', cb),
	cb => fetchList('FAZ_NET', 'f-a-z-redaktion', cb),
	cb => fetchList('FinancialTimes', 'ft-journalists', cb),
	cb => fetchList('flimsin', 'climatescientists', cb),
	cb => fetchList('Forbes', 'forbes-channels', cb),
	cb => fetchList('Forbes', 'forbes-staff1', cb),
	cb => fetchList('francediplo', 'ambassades-et-consulats', cb),
	cb => fetchList('gouvernementFR', 'pr-fectures', cb),
	cb => fetchList('greglemarchand', 'afp-twitter', cb),
	cb => fetchList('guardian', 'news-staff', cb),
	cb => fetchList('guardiannews', 'members-of-parliament', cb),
	cb => fetchList('handelsblatt', 'handelsblatt-redakteure', cb),
	cb => fetchList('Hollywood_Tweet', 'actors-female', cb),
	cb => fetchList('Hollywood_Tweet', 'actors-male', cb),
	cb => fetchList('IEEESpectrum', 'ieee-spectrum-editors', cb),
	cb => fetchList('Independent', 'follow-the-independent', cb),
	cb => fetchList('Independent', 'independent-on-twitter', cb),
	cb => fetchList('katierogers', 'washington-post', cb),
	cb => fetchList('LouWoodley', 'npgstaff', cb),
	cb => fetchList('MAECgob', 'embajadas-y-consulados', cb),
	cb => fetchList('MAECgob', 'ministerios-de-exteriores', cb),
	cb => fetchList('MLB', 'players1', cb),
	cb => fetchList('MLS', 'players', cb),
	cb => fetchList('NASA', 'astronauts', cb),
	cb => fetchList('NASA_Astronauts', 'nasa-astronauts', cb),
	cb => fetchList('NatGeoExplorers', 'natgeoexplorers', cb),
	cb => fetchList('NBAplayers', 'nba-players', cb),
	cb => fetchList('nbc', 'nbc-talent', cb),
	cb => fetchList('nbcolympics', 'winter-olympians-2018', cb),
	cb => fetchList('newscientist', 'twitterbots', cb),
	cb => fetchList('nflnetwork', 'nflplayers', cb),
	cb => fetchList('NHL', 'nhl-players', cb),
	cb => fetchList('NobelPrize', 'nobel-laureates', cb),
	cb => fetchList('NPR', 'npr-people', cb),
	cb => fetchList('NPR', 'public-radio-people', cb),
	cb => fetchList('NWSL', 'nwsl-players', cb),
	cb => fetchList('nytimes', 'nyt-journalists', cb),
	cb => fetchList('nytimes', 'nyt-official-accounts', cb),
	cb => fetchList('nytopinion', 'nyt-editorial-department', cb),
	cb => fetchList('nytpolitics', 'new-york-times-politics', cb),
	cb => fetchList('OReillyMedia', 'authors', cb),
	cb => fetchList('pewresearch', 'pew-research-center-staff', cb),
	cb => fetchList('PostWorldNews', 'wapo-foreign-staff', cb),
	cb => fetchList('Reuters', 'all-journos-list-1', cb),
	cb => fetchList('Reuters', 'reuters-business', cb),
	cb => fetchList('Reuters', 'reuters-midterm-reporters', cb),
	cb => fetchList('Reuters', 'reuters-world-news', cb),
	cb => fetchList('sarahslo', 'women-in-dataviz', cb),
	cb => fetchList('Senadoesp', 'senado-xii-legislatura', cb),
	cb => fetchList('SPIEGELONLINE', 'redaktion', cb),
	cb => fetchList('sree', 'socmedia-editors', cb),
	cb => fetchList('StateDept', 'us-department-of-state', cb),
	cb => fetchList('SZ', 'sz-redaktion', cb),
	cb => fetchList('tagesschau', 'ard-korrespondenten', cb),
	cb => fetchList('tagesspiegel', 'tagesspiegel-redaktion', cb),
	cb => fetchList('TeamD', 'athleten-rio-2016', cb),
	cb => fetchList('TeamGB', 'rio-2016', cb),
	cb => fetchList('techreview', 'team', cb),
	cb => fetchList('TheAcademy', '2015-oscars', cb),
	cb => fetchList('TheDirectorList', 'women-directors', cb),
	cb => fetchList('theintercept', 'the-intercept', cb),
	cb => fetchList('TwitterGov', 'fr-deputies', cb),
	cb => fetchList('TwitterGov', 'uk-mps', cb),
	cb => fetchList('TwitterGov', 'us-election-2014', cb),
	cb => fetchList('TwitterGov', 'us-house', cb),
	cb => fetchList('TwitterGov', 'us-senate', cb),
	cb => fetchList('TwitterGov', 'world-leaders', cb),
	cb => fetchList('UMG', 'artists', cb),
	cb => fetchList('UN_Women', 'un-women-staff-on-twitter', cb),
	cb => fetchList('USAGov', 'embassies', cb),
	cb => fetchList('USAGov', 'nasa', cb),
	cb => fetchList('USATODAY', 'usa-today-staff', cb),
	cb => fetchList('usatodaylife', 'golden-globes-2016', cb),
	cb => fetchList('VICE', 'vice-staff-contributors', cb),
	cb => fetchList('vicenews', 'vice-news-staff', cb),

	cb => fetchList('AuswaertigesAmt', 'venedig-london', cb),
	cb => fetchList('AuswaertigesAmt', 'eu-außenministerien', cb),
	cb => fetchList('AuswaertigesAmt', 'vereinte-nationen', cb),
	cb => fetchList('AuswaertigesAmt', 'reise-und-sicherheit', cb),
	cb => fetchList('AuswaertigesAmt', 'deutsche-vertretungen', cb),
	
	cb => fetchList('wahl_beobachter', 'abgeordnetenhaus-agh', cb),
	cb => fetchList('wahl_beobachter', 'alle-25-parteien-ep2014', cb),
	cb => fetchList('wahl_beobachter', 'botschaften', cb),
	cb => fetchList('wahl_beobachter', 'bundesministerien', cb),
	cb => fetchList('wahl_beobachter', 'bundesregierung', cb),
	cb => fetchList('wahl_beobachter', 'bundestagsfraktionen', cb),
	cb => fetchList('wahl_beobachter', 'deutsche-mep-2019-2024', cb),
	cb => fetchList('wahl_beobachter', 'kandidaten-europawahl', cb),
	cb => fetchList('wahl_beobachter', 'mdb-bundestag', cb),
	cb => fetchList('wahl_beobachter', 'mdbb-bremen', cb),
	cb => fetchList('wahl_beobachter', 'mdhb-hamburg', cb),
	cb => fetchList('wahl_beobachter', 'mdl-baden-w-rttemberg', cb),
	cb => fetchList('wahl_beobachter', 'mdl-bayern', cb),
	cb => fetchList('wahl_beobachter', 'mdl-brandenburg', cb),
	cb => fetchList('wahl_beobachter', 'mdl-hessen', cb),
	cb => fetchList('wahl_beobachter', 'mdl-mecklenburg-vorpommen', cb),
	cb => fetchList('wahl_beobachter', 'mdl-niedersachsen', cb),
	cb => fetchList('wahl_beobachter', 'mdl-nrw', cb),
	cb => fetchList('wahl_beobachter', 'mdl-rheinland-pfalz1', cb),
	cb => fetchList('wahl_beobachter', 'mdl-saarland', cb),
	cb => fetchList('wahl_beobachter', 'mdl-sachsen', cb),
	cb => fetchList('wahl_beobachter', 'mdl-sachsen-anhalt', cb),
	cb => fetchList('wahl_beobachter', 'mdl-schleswig-holstein', cb),
	cb => fetchList('wahl_beobachter', 'mdl-th-ringen', cb),
	cb => fetchList('wahl_beobachter', 'ministeriums-twitterati', cb),
	cb => fetchList('wahl_beobachter', 'open-government-hamburg', cb),
	cb => fetchList('wahl_beobachter', 'politikwissenschaftler', cb),

	cb => fetchList('washingtonpost', 'washington-post-people', cb),
	cb => fetchList('wbr', 'wbr-artists', cb),
	cb => fetchList('welt', 'staff', cb),
	cb => fetchList('WIRED', 'wired', cb),
	cb => fetchList('ZDF', 'zdf-redakteure', cb),
	cb => fetchList('zeitonline', 'das-zeit-online-team', cb),
	cb => fetchList('zeitonline', 'die-zeit', cb),
*/
	//cb => scanFile('astronauts.tsv', cb),
	//cb => scanFile('bots.tsv', cb),
	//cb => scanFile('meps.tsv', cb),
	//cb => scanFile('nasa.tsv', cb),
	
	//cb => scanFile('rp19.tsv', cb),

	cb => scanFile('bundestagsmittagessen/afd.txt', cb),
	cb => scanFile('bundestagsmittagessen/capgemini.txt', cb),
	cb => scanFile('bundestagsmittagessen/cdu.txt', cb),
	cb => scanFile('bundestagsmittagessen/fdp.txt', cb),
	cb => scanFile('bundestagsmittagessen/fraunhofer.txt', cb),
	cb => scanFile('bundestagsmittagessen/gaeste.txt', cb),
	cb => scanFile('bundestagsmittagessen/gruene.txt', cb),
	cb => scanFile('bundestagsmittagessen/linke.txt', cb),
	cb => scanFile('bundestagsmittagessen/sap.txt', cb),
	cb => scanFile('bundestagsmittagessen/soprasteria.txt', cb),
	cb => scanFile('bundestagsmittagessen/spd.txt', cb),
])


function fetchFollowers(screen_name, cbFetch) {
	console.log('scan followers of '+screen_name)
	scraper.fetch('followers/list', {screen_name:screen_name, count:200, skip_status:true, include_user_entities:false}, result => {
		result = result.users;
		result.forEach(u => {
			u.order = u.id_str.split('').reverse().join('');
		})
		result.sort((a,b) => a.order.localeCompare(b.order));
		result = result.map(u => u.screen_name);
		result = result.filter(name => name.length > 0);
		var blocks = [];
		while (result.length > 0) {
			blocks.push(result.slice(0,10000));
			result = result.slice(10000)
		}
		console.log('generated '+blocks.length+' blocks');
		async.eachOfSeries(
			blocks,
			(block, index, cb) => scanUsers(block, screen_name+'_followers_'+index, cb),
			cbFetch
		)
	})
}

function fetchFriends(screen_name, cb) {
	console.log('scan friends of '+screen_name)
	scraper.fetch('friends/list', {screen_name:screen_name, count:200, skip_status:true, include_user_entities:false}, result => {
		result = result.users.map(u => u.screen_name);
		scanUsers(result, screen_name+'_friends', cb);
	})
}



function fetchList(screen_name, slug, cb) {
	console.log('scan list '+screen_name+'/'+slug)
	scraper.fetch('lists/members', { owner_screen_name:screen_name, slug:slug, count: 5000, skip_status:true, skip_status:true, include_user_entities:false}, result => {
		result = result.users.map(u => u.screen_name);
		scanUsers(result, screen_name+'_list_'+slug, cb);
	})
}

function scanFile(filename, cb) {
	var users = fs.readFileSync(filename, 'utf8').split('\n');
	scanUsers(
		users,
		'file_'+filename.replace(/\..*?$/g,'').replace(/\//g,'_'),
		cb
	);
}

function scanUsers(users, slug, cbScanUsers) {
	//if (users.length > 1000) return cbScanUsers();
	if (fs.existsSync('results_'+prefix+'/'+slug+'.ndjson.xz')) return cbScanUsers();

	var results = [];

	async.eachOfLimit(
		users, 4,
		(user, index, cb) => {
			if (index % 20 === 0) console.log((100*index/users.length).toFixed(1)+'%');
			cache(
				user,
				cbResult => botometer(user, cbResult),
				data => {
					if (!data) return cb();
					if (!data.user) return cb();
					if (!data.scores) return cb();
					
					//console.log(data.score);

					var date = data.user.status ? (new Date(data.user.status.created_at)).toISOString() : '?';

					var minDate = 1e99;
					var maxDate = 0;
					data.timeline.forEach(t => {
						var date = Date.parse(t.created_at);
						if (minDate > date) minDate = date;
						if (maxDate < date) maxDate = date;
					})
					var tweetsPerDay = ((data.timeline.length-1)*86400000/(maxDate-minDate)).toFixed(2);
					if (data.timeline.length < 100) tweetsPerDay = '';

					var line = [
						data.user.screen_name,
						(data.score*100).toFixed(1),
						data.user.verified,
						data.user.followers_count,
						tweetsPerDay,
						date,
					].join('\t');

					if (!dontSave) results.push({
						score: data.score,
						name: data.user.screen_name,
						tsv: line,
						ndjson: Buffer.from(JSON.stringify(data)+'\n', 'utf8'),
					});
					
					if (data.score < 0.5) line = colors.green(line);
					else if (data.score < 0.75) line = colors.yellow(line);
					else line = colors.red(line);

					console.log(line);

					cb();
				}
			)
		},
		() => {
			if (dontSave) return cbScanUsers();

			results.sort((a,b) => (b.score - a.score) || a.name.localeCompare(b.name));

			fs.writeFileSync('results_'+prefix+'/'+slug+'.tsv', results.map(d => d.tsv).join('\n'), 'utf8');

			results = results.map(d => d.ndjson);

			miss.pipe(
				miss.from((size, next) => {
					if (results.length === 0) return next(null, null);

					next(null, results.shift());
				}),
				lzma.createCompressor({
					check: lzma.CHECK_NONE,
					preset: 9,
					synchronous: false,
					threads: 8,
				}),
				fs.createWriteStream('results_'+prefix+'/'+slug+'.ndjson.xz'),
				() => cbScanUsers()
			)
		}
	)
}

