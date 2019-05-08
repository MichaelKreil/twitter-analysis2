"use strict";

const prefix = '2019-05-08';

const fs = require('fs');
const zlib = require('zlib');
const async = require('async');
const botometer = require('../../lib/botometer.js')('botometer_'+prefix+'_1');
const scraper = require('../../lib/scraper.js')('botometer_'+prefix+'_2');
const cache = require('../../lib/cache.js')('botometer_'+prefix+'_3');
const colors = require('colors');

async.series([
	cb => fetchFriends('tagesspiegel', cb),
	cb => fetchList('tagesspiegel', 'tagesspiegel-redaktion', cb),

	cb => fetchFriends('zeitonline', cb),
	cb => fetchFriends('republica', cb),

	cb => scanFile('rp19.tsv', cb),
	cb => scanFile('nasa.tsv', cb),

	cb => fetchList('zeitonline', 'das-zeit-online-team', cb),
	cb => fetchList('zeitonline', 'die-zeit', cb),

	cb => fetchFriends('SPIEGELONLINE', cb),
	cb => fetchList('SPIEGELONLINE', 'redaktion', cb),

	cb => fetchList('welt', 'staff', cb),
	cb => fetchList('FAZ_NET', 'f-a-z-redaktion', cb),
	cb => fetchList('BILD', 'wir-sind-bild', cb),
	cb => fetchList('SZ', 'sz-redaktion', cb),
	cb => fetchList('ZDF', 'zdf-redakteure', cb),
	cb => fetchList('tagesschau', 'ard-korrespondenten', cb),


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
	cb => fetchList('business', 'bloomberg-journalists', cb),
	cb => fetchList('businessinsider', 'bi-editors-reporters', cb),
	cb => fetchList('CNBC', 'staff', cb),
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
	cb => fetchList('europarl_en', 'all-meps-on-twitter', cb),
	cb => fetchList('flimsin', 'climatescientists', cb),
	cb => fetchList('francediplo', 'ambassades-et-consulats', cb),
	cb => fetchList('gouvernementFR', 'pr-fectures', cb),
	cb => fetchList('greglemarchand', 'afp-twitter', cb),
	cb => fetchList('guardian', 'news-staff', cb),
	cb => fetchList('guardiannews', 'members-of-parliament', cb),
	cb => fetchList('Hollywood_Tweet', 'actors-female', cb),
	cb => fetchList('Hollywood_Tweet', 'actors-male', cb),
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
	cb => fetchList('nbaplayers', 'nba-players', cb),
	cb => fetchList('nbc', 'nbc-talent', cb),
	cb => fetchList('nbcolympics', 'winter-olympians-2018', cb),
	cb => fetchList('nflnetwork', 'nflplayers', cb),
	cb => fetchList('NHL', 'nhl-players', cb),
	cb => fetchList('NobelPrize', 'nobel-laureates', cb),
	cb => fetchList('NPR', 'npr-people', cb),
	cb => fetchList('NPR', 'public-radio-people', cb),
	cb => fetchList('NWSL', 'nwsl-players', cb),
	cb => fetchList('nytimes', 'nyt-journalists', cb),
	cb => fetchList('nytopinion', 'nyt-editorial-department', cb),
	cb => fetchList('nytpolitics', 'new-york-times-politics', cb),
	cb => fetchList('OReillyMedia', 'authors', cb),
	cb => fetchList('PostWorldNews', 'wapo-foreign-staff', cb),
	cb => fetchList('Reuters', 'all-journos-list-1', cb),
	cb => fetchList('sarahslo', 'women-in-dataviz', cb),
	cb => fetchList('Senadoesp', 'senado-xii-legislatura', cb),
	cb => fetchList('sree', 'socmedia-editors', cb),
	cb => fetchList('StateDept', 'us-department-of-state', cb),
	cb => fetchList('TeamD', 'athleten-rio-2016', cb),
	cb => fetchList('TeamGB', 'rio-2016', cb),
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
	cb => fetchList('vicenews', 'vice-news-staff', cb),
	cb => fetchList('wahl_beobachter', 'mdb-bundestag', cb),
	cb => fetchList('washingtonpost', 'washington-post-people', cb),
	cb => fetchList('wbr', 'wbr-artists', cb),

	cb => fetchFriends('nytimes', cb),
	cb => fetchFriends('washingtonpost', cb),
	cb => fetchFriends('bbc', cb),
])



function fetchFriends(screen_name, cb) {
	scraper.fetch('friends/list', {screen_name:screen_name, count:200, skip_status:true, include_user_entities:false}, result => {
		result = result.users.map(u => u.screen_name);
		scanUsers(result, screen_name+'_friends', cb);
	})
}



function fetchList(screen_name, slug, cb) {
	scraper.fetch('lists/members', { owner_screen_name:screen_name, slug:slug, count: 5000, skip_status:true, skip_status:true, include_user_entities:false}, result => {
		result = result.users.map(u => u.screen_name);
		scanUsers(result, screen_name+'_list_'+slug, cb);
	})
}

function scanFile(filename, cb) {
	var users = fs.readFileSync(filename, 'utf8').split('\n');
	scanUsers(users, 'file_'+filename.replace(/\..*?$/g,''), cb);
}



function scanUsers(users, slug, cbScanUsers) {
	if (fs.existsSync('results/'+slug+'.json.gz')) return cbScanUsers();

	var results = [];

	async.eachOfLimit(
		users, 4,
		(user, index, cb) => {
			if (index % 20 === 0) console.log((100*index/users.length).toFixed(1)+'%');
			cache(
				user,
				cbResult => {
					//console.log(('fetch '+user).grey);
					botometer(user, cbResult);
				},
				data => {
					if (!data) return cb();
					if (!data.user) return cb();
					if (!data.scores) return cb();

					data.score = (data.user.lang === 'en') ? data.scores.english : data.scores.universal;

					results.push(data);
					//console.log(data);
					//process.exit();
					
					var line = [
						data.user.screen_name,
						(data.score*5).toFixed(3),
						data.user.verified,
						data.user.followers_count,
						(new Date(data.user.status.created_at)).toISOString(),
					].join('\t');
					if (data.score < 0.4) line = colors.green(line);
					else if (data.score < 0.6) line = colors.yellow(line);
					else line = colors.red(line);
					console.log(line);

					cb();
				}
			)
		},
		() => {
			results.sort((a,b) => (b.score - a.score) || a.user.screen_name.localeCompare(b.user.screen_name));
			fs.writeFileSync('results/'+slug+'.tsv', results.map(d => [d.user.screen_name, (d.score*5).toFixed(3)].join('\t')).join('\n'), 'utf8');

			results = JSON.stringify(results, null, '\t');
			results = Buffer.from(results, 'utf8');
			results = zlib.gzipSync(results, {level:9});

			fs.writeFileSync('results/'+slug+'.json.gz', results);
			cbScanUsers();
		}
	)
}

