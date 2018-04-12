"use strict";

const fs = require('fs');
const lzma = require('lzma-native');
const utils = require('../../../lib/utils.js');
const async = require('async');
const colors = require('colors');
const scraper = (require('../../../lib/scraper.js'))('search_and_dump');
const path = require('path');

const writeFile = true;

String.prototype.toFromTo = function () {
	return this.split(',').map(a => 'from:'+a+' OR to:'+a).join(' OR ')
}

String.prototype.toWildFromTo = function () {
	return this.split(',').map(a => a+' OR from:'+a+' OR to:'+a).join(' OR ')
}

// List of search queries
var queries = [
	{name: '120db',              query: {q:'frauenmarsch OR 120db OR b1702 OR dd1702 OR ndh1702 OR niun1702 OR niun OR no120db'}}, 
	{name: '34c3',               query: {q:'34c3'}},
	{name: 'afd_bund_vor_01',    query: {q:'andreaskalbitz,joachim_kuhs,guidoreil,georg_pazderski,joerg_meuthen,steffenkoeniger'.toWildFromTo()}},
	{name: 'afd_bund_vor_02',    query: {q:'frank_pasemann,protschkastepha,kaygottschalk111,beatrix_vstorch,alice_weidel'.toWildFromTo()}},
	{name: 'afd_land_01',        query: {q:'afdsaar,afd_lv_sh,rlp_afd,afd_hamburg,afd_lsa,afd_sachsen_asa,alternativenrw'.toWildFromTo()}},
	{name: 'afd_land_02',        query: {q:'alternativends,afd_thueringen,afd_hb,afdberlin,afdbrandenburg,afd_mv,alternativebw'.toWildFromTo()}},
	{name: 'afd_land_03',        query: {q:'afd_hessen,afd_bayern,afdsaar,afd_lv_sh,rlp_afd,afd_hamburg'.toWildFromTo()}},
	{name: 'afd_mdb_01',         query: {q:'mueller_mdb,joernkoenigafd,jacobi_afd,verhartmannafd,frank_magnitz,chrwirthmdb'.toWildFromTo()}},
	{name: 'afd_mdb_02',         query: {q:'martin_sichert,braunafd,kestnerjens,jensmaierafd,drfriesenmdb,th_seitz_afd,steffenkotre'.toWildFromTo()}},
	{name: 'afd_mdb_03',         query: {q:'andreasbleckmdb,espendillerm,buettner_mdb,martin_hess_afd,corinnamiazga,nkleinwaechter'.toWildFromTo()}},
	{name: 'afd_mdb_04',         query: {q:'s_muenzenmaier,udohemmelgarn,gottfriedcurio,h_weyel,rene_springer,profmaier,m_harderkuehnel'.toWildFromTo()}},
	{name: 'afd_mdb_05',         query: {q:'joanacotar,petrbystronafd,dirkspaniel,marcbernhardafd,tino_chrupalla,stefankeuterafd'.toWildFromTo()}},
	{name: 'afd_mdb_06',         query: {q:'enricokomning,leif_erik_holm,marcus_buehl,schneider_afd,jochen_haug,stbrandner,mdb_lucassen'.toWildFromTo()}},
	{name: 'afd_mdb_07',         query: {q:'witt_uwe,elsnervongronow,frohnmaier_afd,marc_jongen,herrmann_afd,waldemarherdt,ulrich_oehme'.toWildFromTo()}},
	{name: 'afd_mdb_08',         query: {q:'friedhoff_afd,robby_schlund,nicole_hoechst,mrosek195819581958,uwe_kamann,m_reichardt_afd'.toWildFromTo()}},
	{name: 'afd_mdb_09',         query: {q:'renner_afd,tobiasmpeterka,axelgehrke,ttte949494,frank_pasemann,protschkastepha,kaygottschalk111'.toWildFromTo()}},
	{name: 'afd_mdb_10',         query: {q:'ulschzi,gtzfrmming,beatrix_vstorch,r_hartwig_afd,buergerwohl,peterboehringer,alice_weidel'.toWildFromTo()}},
	{name: 'afd_orgs_01',        query: {q:'afd,afd_bund,afdimbundestag,brandenburgafd,afdsalzgitterkv,afdkompakt,afdfraktionagh'.toWildFromTo()}},
	{name: 'afrin',              query: {q:'afrin'}},
	{name: 'amadeuantonio',      query: {q:'amadeuantonio'.toWildFromTo()}},
	{name: 'bahn',               query: {q:'bahn OR bahnhof OR hbf OR zug OR bahnsteig OR to:dbbahn OR dbbahn OR fahrradabteil OR ice OR schaffner OR bordbistro OR verspätung OR anschluss OR umsteigen OR ansage OR anzeige OR stellwerk OR störung OR weiche', lang:'de'}},
	{name: 'bild',               query: {q:'BILD,BILD_Berlin,BILD_Digital,BILD_Frankfurt,BILD_Hamburg,BILD_Muenchen,BILD_News,BILD_Politik,BILD_TopNews,jreichelt'.toFromTo()}},
	{name: 'elysee',             query: {q:'elysee'.toWildFromTo()}},
	{name: 'emmanuelmacron',     query: {q:'emmanuelmacron'.toWildFromTo()}},
	{name: 'floridashooting',    query: {q:'emmagonzalez OR floridahighschool OR floridaschoolshooting OR floridashooter OR floridashooting OR floridastrong OR guncontrol OR guncontrolnow OR gunlawsnow OR gunreformnow OR gunsafety OR gunsense OR gunshooting OR highschoolshooter OR march4ourlives OR marchforourlives OR massshooting OR massshootings OR neveragain OR nrabloodmoney OR parklandschoolshooting OR parklandshooting OR righttobeararms OR schoolshooting'}},
	{name: 'floridashooting2',   query: {q:'neveragain OR gunreformnow OR guncontrolnow OR guncontrol OR marchforourlives OR parkland OR parklandschoolshooting OR floridaschoolshooting OR parklandshooting OR #nra OR floridashooting OR nrabloodmoney OR banassaultweapons OR gunsense OR emmagonzalez OR schoolshooting OR parklandstudents OR parklandstudentsspeak OR gunviolence OR floridashooter OR wecallbs OR studentsstandup OR parklandstrong'}},
	{name: 'groko',              query: {q:'groko'}},
	{name: 'heimat',             query: {q:'heimat'}},
	{name: 'heimathorst',        query: {q:'heimathorst OR heimatministerium'}},
	{name: 'iranprotests',       query: {q:'تظاهرات_سراسری OR IranProtests'}},
	{name: 'iranprotests2',      query: {q:'iranprotests OR تظاهرات_سراسرى OR مظاهرات_ايران OR تظاهرات_سراسری OR تظاهرات_سراسري'}},
	{name: 'jensspahn',          query: {q:'jensspahn'.toWildFromTo()}},
	{name: 'lufthansa',          query: {q:'lufthansa OR lufthansablue OR explorethenew'}},
	{name: 'metoo',              query: {q:'#metoo'}},
	{name: 'muenster',           query: {q:'muenster OR münster OR anschlag'}},
	{name: 'netzdg',             query: {q:'netzdg'}},
	{name: 'nobillag',           query: {q:'#neinzunobillag OR #nobillag OR #nobillagnein'}},
	{name: 'olympics_2018',      query: {q:'#olympia2018 OR #pyeongchang2018 OR #olympics OR #olympia OR #doping'}},
	{name: 'pyeongchang2018',    query: {q:'pyeongchang2018'}},
	{name: 'rechts',             query: {q:'afdwaehlen OR antifaverbot OR merkelmussweg OR staatsfernsehen OR stopasyl OR stopislam OR widerstand'}},
	{name: 'rechts_aufbruch',    query: {q:'aufbruchinsungewisse'}},
	{name: 'russianelection',    query: {q:'#ИзбирательныйУчасток OR #ПУТИН OR #Выборы2018 OR #ПУТИН2018 OR #Саки OR #городСаки OR #РеспубликаКрым OR #КрымНаш OR #МыСтроимМосты OR #КрымРоссияНавсегда OR #КрымРоссия OR #ПутинВВ OR #ТвойВыбор2018 OR #2018ТвойВыбор OR #Выбор2018 OR #ПутинВладимирВладимирович OR #ЯзаПутина OR #ЯзаПутинаВВ'}},
	{name: 'syria',              query: {q:'syria'}},
	{name: 'trump_mentions',     query: {q:'to:realdonaldtrump OR to:potus OR realdonaldtrump OR potus'}},
	{name: 'trump_tweets',       query: {q:'from:realdonaldtrump OR from:potus'}},
	{name: 'ueberwachung',       query: {q:'überwachungspaket OR staatstrojaner OR bundestrojaner OR ueberwachungspaket OR zib2 OR überwachung OR privatsphäre OR datenschutz OR sicherheit OR vds OR sicherheitspaket'}},
];



// verify queries
queries.forEach(entry => {
	var query = urlEncode(entry.query.q);

	if (query.length > 511) {
		console.log('"'+query+'"');
		console.log('query with '+query.length+' chars is to long for '+entry.name);
		throw Error();
	}

	function urlEncode(q) { return q.replace(/ /g, '%20').replace(/:/g, '%3A') }
})



// Search with each of these queries,
// for each of the last 14 days
var queue = [];
var yesterday = Math.floor(Date.now()/86400000-0.25)-0.5;
for (var i = -11; i <= 0; i++) {
	var date = (new Date((yesterday+i)*86400000)).toISOString().substr(0,10);
	queries.forEach(obj => {
		var _name  = obj.name;
		var _query = obj.query;
		var _date  = date;
		queue.push((cb) => {
			runScraper(_name, _query, _date, cb)
		})
	})
}


// Start scraper
scraper.run();

async.parallelLimit(queue, writeFile ? 4 : 16,
	() => console.log(colors.green.bold('FINISHED'))
)


function runScraper(name, query, date, cbScraper) {
	var title = '"'+name+' - '+date+'"';

	var filename = path.resolve(__dirname, '../data/'+name+'/'+name+'_'+date+'.jsonstream.xz');
	var tmpFile = path.resolve(__dirname, '../tmp', Math.random().toFixed(16).substr(2)+'.tmp.xz');

	// Does the file already exists
	if (fs.existsSync(filename)) {
		console.log(colors.grey('Ignore '+title));
		return cbScraper();
	} else {
		console.log(colors.green('Starting '+title));
	}

	// Prepare Compressor
	if (writeFile) {
		var compressor = lzma.createCompressor({
			check: lzma.CHECK_NONE,
			preset: 9/* | lzma.PRESET_EXTREME*/,
			synchronous: false,
			threads: 1,
		});
		var stream = fs.createWriteStream(tmpFile, {highWaterMark: 8*1024*1024});
		compressor.pipe(stream);
	}

	// Make sure that the folder exists
	utils.ensureDir(filename);

	// Map of all found tweets
	var tweets = new Map();
	var tweetCount = 0;

	// new scraper sub task
	var task = scraper.getSubTask()

	// flush data buffer to lzma compressor
	function flushOutput(percent, cbFlush) {
		console.log(colors.green('flushing '+title+' - '+(100*percent).toFixed(1)+'%'))

		var buffer = Array.from(tweets.values());
		tweets = new Map();
		tweetCount = 0;

		if (buffer.length === 0) return cbFlush();

		if (!writeFile) return cbFlush();

		buffer.sort((a,b) => a.id_str < b.id_str ? -1 : 1);
		buffer = buffer.map(t => t.buffer);
		buffer = Buffer.concat(buffer);

		if (compressor.write(buffer)) {
			cbFlush();
		} else {
			compressor.once('drain', cbFlush);
		}
	}

	// when finished: flush data and close file
	function closeOutput() {
		console.log(colors.green('prepare closing '+title));
		flushOutput(1, () => {
			if (!writeFile) {
				console.log(colors.green.bold('closed '+title));
				cbScraper();
			} else {
				console.log(colors.green('closing '+title));
				stream.on('close', () => {
					console.log(colors.green.bold('closed '+title));
					fs.renameSync(tmpFile, filename);
					cbScraper();
				})
				compressor.end();
			}
		})
	};

	// start recursive scraper
	scrape();

	function scrape(max_id) {
		var attributes = {result_type:'recent', tweet_mode:'extended', count:100, max_id:max_id};
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

				if (writeFile) {
					result.statuses.forEach(t => tweets.set(t.id_str, {
						id_str: t.id_str,
						created_at: t.created_at,
						buffer: Buffer.from(JSON.stringify(t)+'\n', 'utf8')
					}));
				}
				tweetCount += result.statuses.length;

				var date = (result.statuses[0]||{}).created_at;

				if (tweetCount > 10000) {
					var percent = Date.parse(date)/86400000;
					percent = 1 - percent + Math.floor(percent);
					flushOutput(percent, checkRerun);
				} else {
					checkRerun()
				}

				function checkRerun() {
					var min_id = utils.getTweetsMinId(result.statuses);
					if (min_id) {
						//console.log(colors.grey('\t'+date.replace(/ \+.*/,'')+'\t'+title));
						scrape(min_id);
					} else {
						closeOutput();
					}
				}
			}
		)
	}
}