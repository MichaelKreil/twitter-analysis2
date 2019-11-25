"use strict";

const dry = false;

const fs = require('fs');
const child_process = require('child_process');
const async = require('async');
const utils = require('../../lib/utils.js');
const colors = require('colors');
const miss = require('mississippi2');
const resolve = require('path').resolve;
const scraper = require('../../lib/scraper.js')();

String.prototype.toFromTo = function () {
	return this.split(',').map(a => a.trim()).map(a => 'from:'+a+' OR to:'+a).join(' OR ')
}

String.prototype.toWildFromTo = function () {
	return this.split(',').map(a => a.trim()).map(a => a+' OR from:'+a+' OR to:'+a).join(' OR ')
}

String.prototype.toOR = function () {
	return this.split(',').map(a => a.trim()).join(' OR ')
}

String.prototype.expandMedia = function () {
	return this.split(',').map(a => {
		a = a.trim();
		if (a[0] !== '@') return a
		a = a.substr(1);
		return 'from:'+a+' OR to:'+a;
	}).join(' OR ')
}

var lists = [
	'AfD',
	'AfDkompakt',
	'wahl_beobachter',
	'bild',
];

// List of search queries
var queries = [
	{name: '120db',                         query: {q:'frauenmarsch,120db,b1702,dd1702,ndh1702,niun1702,niun,no120db'.toOR()}}, 
	{name: '34c3',                          query: {q:'34c3'}},
	{name: '35c3',                          query: {q:'35c3'}},
	{name: '36c3',                          query: {q:'36c3'}},
	{name: '37c3',                          query: {q:'37c3'}},
	{name: 'angst',                         query: {q:'furcht,fürchten,fürchte,befürchte,befürchten,angst,ängste,beängstigend,panik,sorge,sorgen,bedrohung,bedrohen,bedrohend,bedroht,bedrohlich,bedrohliche,bedrohlichen'.toOR()}},
	{name: 'afd',                           query: {q:'#afd'}},
	{name: 'afd2',                          query: {q:'afd'}},
	{name: 'afdwegbassen',                  query: {q:'afdwegbassen,liebestatthass,wegbassen,b2705,stopptdenhass,zukunftdeutschland'.toOR()}},
	{name: 'amadeuantonio',                 query: {q:'amadeuantonio'.toWildFromTo()}},
	{name: 'antifa',                        query: {q:'antifa'}},
	{name: 'article13',                     query: {q:'acta2,antyart13,article11,article13,artikel11,artikel13,artikel13demo,censorshipmachines,copylaw,copyrightirective,deleteart13,fixcopyright,linktax,niemehrcdu,niemehrspd,savetheinternet,saveyourinternet,stopacta2,uploadfilter,uploadfilters,wirsindbots'.toOR()}},
	{name: 'article13_discussion',          query: {q:'ansip_eu,axelvossmdep,cdu_csu_ep,dsmeu,eff,ep_legal,eu_commission,gabrielmariya,heidihautala,juliaredamep,junckereu,katarinabarley,maxandersson,peteraltmaier,politicoeurope,senficon,shkmep,spdeuropa,tadeuszzwiefka,woelken'.toWildFromTo()}},
	{name: 'article13_discussiona',         query: {q:'authorsocieties,bmjv_bund,euforcreators,evisual_artists,fairinternet4p,fim_musicians,gema_news,helgatruepel,musikzeitung,urheber_verdi'.toWildFromTo()}},
	{name: 'article13_discussionb',         query: {q:'manfredweber,eppgroup,cdu'.toWildFromTo()}},
	{name: 'article13_discussionc',         query: {q:'hwieduwilt,caspary'.toWildFromTo()}},
	{name: 'article13a',                    query: {q:'copyrightdirective,copyright,DigitalSingleMarket,EUDigital'.toOR()}},
	{name: 'article13b',                    query: {q:'merkelfilter'.toOR()}},
	{name: 'article13c',                    query: {q:'art13'.toOR()}},
	{name: 'article13d',                    query: {q:'art11,art13grafiken,articulo11,articulo13,artigo13,artikel12,artikle13,artículo13,axelswelt,axelvoss,b0203,barleyfilter,berlingegen13,bots,censorship,censorshipmachine,censuracopyright,createyourinternet,delarticle13,deleteart11,deletearticle13,derechoseninternet,fairinternet,fairuse,fckart13,gegenartikel13,h2020,keinebots,kölngegen13,leistungsschutzrecht,lsr,mepstaywithus,mob,mobgate,niemehrcsu,niewiedercdu,nochniecdu,nocreatorsnocontent,op13,pledge2019,safeyourinternet,saveourinternet,savethelink,stoparticle13,stopartikel13,stopcensuracopyright,uploadfiltern,urheberrecht,urheberrechtsreform,vollvossten,vote4culture,weneedcopyrightdirective,wirsinddiebots,wirsindkeinebots,yes2copyright,youtubersjoinus'.toOR()}},
	{name: 'article13e',                    query: {q:'luegenmanni,niemehrcdu'.toOR()}},
	{name: 'article13f',                    query: {q:'#no11,#no12,#no13,no2article11,no2article12,no2article13'.toOR()}},
	{name: 'article13g',                    query: {q:'axelsurft,artikel15,artikel16,artikel17,article15,article16,article17'.toOR()}},
	{name: 'article13h',                    query: {q:'demogeld,demosold,mittelfingermittwoch'.toOR()}},
	{name: 'article13i',                    query: {q:'thankyoujulia,gehtwaehlen,dankejulia,ripinternet'.toOR()}},
	{name: 'asyl',                          query: {q:'asyl OR asylstreit OR asyltourismus OR asylgehalt'}},
	{name: 'aufstehen',                     query: {q:'aufstehen'}},
	{name: 'bahn',                          query: {q:'bahn OR bahnhof OR hbf OR zug OR bahnsteig OR to:dbbahn OR dbbahn OR fahrradabteil OR ice OR schaffner OR bordbistro OR verspätung OR anschluss OR umsteigen OR ansage OR anzeige OR stellwerk OR störung OR weiche', lang:'de'}},
	{name: 'berlin',                        query: {q:'', geocode:'52.5,13.4,50km'}},
	{name: 'besetzen',                      query: {q:'#besetzen OR #KarnevalDerBesetzungen OR @besetzenberlin OR #besetzt OR #borni OR #RechtaufStadt OR #StadtfuerAlle OR #Reiche114 OR #KDK2018 OR #mietenwahnsinn'}},
	{name: 'bild',                          query: {q:'BILD,BILD_Berlin,BILD_Digital,BILD_Frankfurt,BILD_Hamburg,BILD_Muenchen,BILD_News,BILD_Politik,BILD_TopNews,jreichelt'.toFromTo()}},
	{name: 'brexit',                        query: {q:'brexit'}},
	{name: 'brexit2',                       query: {q:'brexit,brexitdeal,brexit,theresa,borisjohnson,chlorinated,peoplesvotemarch,peoplesvote,corbyn,backstop,brexitshambles,nodeal,stopbrexit,borisjohnson,nigel_farage,meaningfulvote,farage,getbrexitdone,remainers'.toOR()}},
	{name: 'bundesregierung',               query: {q:'SilberhornMdB,Mi_Muentefering,RitaHaglKehl,SvenjaSchulze68,LambrechtMdB,katarinabarley,StSLindner,AdlerGunther,Thomas_Bareiss,AnjaKarliczek,AnetteKramme,MiRo_SPD,JochenFlasbarth,guenterkrings,MJaegerT,W_Schmidt_,peteraltmaier,LangeMdB,jensspahn,RegSprecher,DoroBaer,fuchtel,zierke,thomasgebhart,rischwasu,AndiScheuer,NielsAnnen,KerstinGriese,OlafScholz,ChristianHirte,meister_schafft,JuliaKloeckner,HeikoMaas,SteffenBilger,petertauber,FlorianPronold,HBraun,BoehningB,wanderwitz,hubertus_heil'.toWildFromTo()}},
	{name: 'bundesverdienstkreuz',          query: {q:'bundesverdienstkreuz'}},
	{name: 'cdu',                           query: {q:'#cdu'}},
	{name: 'christchurch',                  query: {q:'christchurch,#christchurch,#eggboy,#fraseranning,#hellobrother,#neuseeland,#newzealand,#newzealandshooting,#newzealandterroristattack,حادث_نيوزيلندا_الارهابي'.toOR()}},
	{name: 'climatestrike',                 query: {q:'#climatestrike,#fridaysforfuture,#schoolstrike4climate,#climatechange,from:gretathunberg,to:gretathunberg'.toOR()}},
	{name: 'climatestrike2',                query: {q:'#climatestrike,#globalclimatestrike,#globalclimatestrikes,#climateactionnow,#climateemergency,#allefuersklima,#greveglobalpeloclima,#climatejustice,#climatejusticenow,#climatestrikes,#climatemarch,#climatemarchpakistan,#islamabadclimatemarch,#climatecrisis,#youthstrike4climate,#allefürsklima,#greennewdeal,#extinctionrebellion,#klimakabinett,#fridays4future,#fridaysforfurture,#scientists4future,#fridayforfuture,#cambioclimático,#fridaysforfutures,#strike4climate,#grevepourleclimat,#グローバル気候マーチ,#climatestrikethailand,#strajkklimatyczny,#actonclimate,#cambioclimatico,#huelgamundialporelclima,#marchepourleclimat,#20eylüli̇klimgrevi,#klimatstrejk,#scientistsforfuture,#youthclimatestrike,#crisisclimatica,#climatestrikeke,#viernesporelfuturo'.toOR()}},
	{name: 'csu',                           query: {q:'#csu'}},
	{name: 'dsgvo',                         query: {q:'dsgvo OR dgsvo OR dataprotection OR cybersecurity OR gdpr OR datenschutz'}},
	{name: 'dunjahayali',                   query: {q:'dunjahayali'.toWildFromTo()}},
	{name: 'efail',                         query: {q:'#efail OR from:eff OR to:eff'}},
	{name: 'elysee',                        query: {q:'elysee'.toWildFromTo()}},
	{name: 'emmanuelmacron',                query: {q:'emmanuelmacron'.toWildFromTo()}},
	{name: 'emojitetra',                    query: {q:'emojitetra'.toWildFromTo()}},
	{name: 'epstein',                       query: {q:'clintonbodycount,clintoncrimefamily,clintonsbodycount,epstein,epsteinblackbook,epsteincoverup,epsteingate,epsteinmurder,epsteinsuicide,epsteinsuicidecoverup,epsteinsuicided,epsteinunsealed,epstien,jefferyepstein,jeffreyepstein,trumpbodycount'.toOR()}},
	{name: 'euwahl1',                       query: {q:'#election,#ep,#euro,ek2019,elections2019,ep2019,eu2019,euelections,euelections2019,europa,europaparlament,europawahl,europawahl19,europawahl2019,europe,european,europeanparliament,europeennes2019,européennes,européennes2019,euw19,euwahl,futureofeurope,ps2019'.toOR()}},
	{name: 'fakenewssource2',               query: {q:'url:berliner-express.com OR url:truth24.net'}},
	{name: 'floridashooting',               query: {q:'emmagonzalez OR floridahighschool OR floridaschoolshooting OR floridashooter OR floridashooting OR floridastrong OR guncontrol OR guncontrolnow OR gunlawsnow OR gunreformnow OR gunsafety OR gunsense OR gunshooting OR highschoolshooter OR march4ourlives OR marchforourlives OR massshooting OR massshootings OR neveragain OR nrabloodmoney OR parklandschoolshooting OR parklandshooting OR righttobeararms OR schoolshooting'}},
	{name: 'floridashooting2',              query: {q:'neveragain OR gunreformnow OR guncontrolnow OR guncontrol OR marchforourlives OR parkland OR parklandschoolshooting OR floridaschoolshooting OR parklandshooting OR #nra OR floridashooting OR nrabloodmoney OR banassaultweapons OR gunsense OR emmagonzalez OR schoolshooting OR parklandstudents OR parklandstudentsspeak OR gunviolence OR floridashooter OR wecallbs OR studentsstandup OR parklandstrong'}},
	{name: 'fridaysforfuture2',             query: {q:'fridaysforfuture,climatestrike,climatechange,climateaction,from:gretathunberg,to:gretathunberg,gretathunberg,klimastreik'.toOR()}},
	{name: 'gauland',                       query: {q:'gauland,#gauland,#gaulandpause'.toOR()}},
	{name: 'gelbwesten',                    query: {q:'gelbwesten'}},
	{name: 'gretathunberg',                 query: {q:'greta thunberg,gretathunberg,from:gretathunberg,to:gretathunberg'.toOR()}},
	{name: 'groko',                         query: {q:'groko'}},
	{name: 'grossstaedte',                  query: {q:'berlin,hamburg,münchen,köln,frankfurt,stuttgart,düsseldorf,dortmund,essen,leipzig,bremen,dresden,hannover,nürnberg,duisburg,bochum,wuppertal,bielefeld,bonn,münster'.toOR()}},
	{name: 'halle',                         query: {q:'halle,#halle0910,antisemitismus,#hal0910,#haltdiefresse,#yomkippur,einzeltäter,#natsanalyse,#christchurch,#merkel,rassismus,rechterterror,#halleshooting,#wirstehenzusammen,alarmzeichen,#yomkippour,rechtsterrorismus,#jomkippur,synagoge,synagogue,rechtsextremismus,antisemitisch,terroranschlag'.toOR()}},
	{name: 'hambacherforst',                query: {q:'aktionunterholz,braunkohle,braunkohleabbau,endcoal,endegelaende,hambach,hambacherforst,hambacherforstbleibt,hambacherwald,hambi,hambi_bleibt,hambibleibt,hambibleibtaktion,kohle,kohleausstieg,kohlekommission,rwe'.toOR()}},
	{name: 'heimat',                        query: {q:'heimat'}},
	{name: 'heimathorst',                   query: {q:'heimathorst OR heimatministerium'}},
	{name: 'hgmaassen',                     query: {q:'hgmaassen'.toWildFromTo()}},
	{name: 'hongkong',                      query: {q:'#HongKong,#HongKongProtests,#StandwithHK,#antiELAB,#HongKongPolice,#StandWithHongKong,#FreeHongKong,#HongKongProtest,#hkpolice,#chinazi,#HongKongProtester,#香港,#LIHKG,#policebrutality,#HKPoliceTerrorism,#hkpolicebrutality,#hongkongpolicebrutality,#PoliceTerrorism,#HongKongPoliceTerrorism,#antiELABhk,#Shout4HK,#StandwithHonKong,#HongKongProtesters,#HongKongHumanRightsAndDemocracyAct,#Eye4HK,#HKprotests,#FightForFreedom,#HK,#HongKongers,#antichinazi,#hkprotest,#香港デモ,#PoliceBrutalitiy,#FreedomHK'.toOR()}},
	{name: 'infowars',                      query: {q:'infowars,RealAlexJones'.toWildFromTo()+' OR "alex jones"'}},
	{name: 'iranprotests',                  query: {q:'تظاهرات_سراسری OR IranProtests'}},
	{name: 'iranprotests2',                 query: {q:'iranprotests OR تظاهرات_سراسرى OR مظاهرات_ايران OR تظاهرات_سراسری OR تظاهرات_سراسري'}},
	{name: 'israel',                        query: {q:'israel'}},
	{name: 'jensspahn',                     query: {q:'jensspahn'.toWildFromTo()}},
	{name: 'kippa',                         query: {q:'kippa', lang:'de'}},
	{name: 'knobloch',                      query: {q:'knobloch OR #knobloch'}},
	{name: 'koethen',                       query: {q:'köthen OR koethen OR koethen0909 OR koet0909 OR k0909'}},
	{name: 'lufthansa',                     query: {q:'lufthansa OR lufthansablue OR explorethenew'}},
	{name: 'maassen',                       query: {q:'maassen,maaßen,verfassungsschutz,verfassungsschutzchef,vs-chef,vs-präsident,verfassung'.toOR()}},
	{name: 'media2_20min',                  query: {q:'url:20min.ch,@20min'.expandMedia()}},
	{name: 'media2_achgut',                 query: {q:'url:achgut.com,@Achgut_com'.expandMedia()}},
	{name: 'media2_bild',                   query: {q:'url:bild.de,@BILD,@BILD_Auto,@BILD_Bayern,@BILD_Berlin,@BILD_Blaulicht,@BILD_Bochum,@BILD_Bremen,@BILD_Chemnitz,@BILD_Digital,@BILD_Dresden,@BILD_Frankfurt,@bild_freiburg,@bild_fuerth,@BILD_Hamburg,@BILD_Hannover,@bild_ingolstadt,@BILD_kaempft,@BILD_Koeln,@BILD_Lautern,@BILD_Leipzig,@BILD_Lifestyle,@BILD_Muenchen,@BILD_News,@BILD_Nuernberg,@BILD_Politik,@BILD_Promis,@BILD_Reporter,@BILD_Ruhrgebiet,@BILD_Saarland,@BILD_Sport,@BILD_Stuttgart,@BILD_TopNews,@BILD_Wolfsburg,@BILDamSONNTAG,@BILDDuesseldorf,@BILDhilft,@BILDthueringen'.expandMedia()}},
	{name: 'media2_blick_ch',               query: {q:'url:blick.ch,@Blickch'.expandMedia()}},
	{name: 'media2_br24',                   query: {q:'url:br24.de,@BR24'.expandMedia()}},
	{name: 'media2_cicero',                 query: {q:'url:cicero.de,@cicero_online'.expandMedia()}},
	{name: 'media2_de_kurier',              query: {q:'url:deutschland-kurier.org,@de_kurier'.expandMedia()}},
	{name: 'media2_derstandard',            query: {q:'url:derstandard.at,@derStandardat,@PolitikStandard'.expandMedia()}},
	{name: 'media2_dpa',                    query: {q:'@dpa'.expandMedia()}},
	{name: 'media2_dwn',                    query: {q:'url:deutsche-wirtschafts-nachrichten.de'.expandMedia()}},
	{name: 'media2_epochtimes',             query: {q:'url:epochtimes.de,@EpochTimesDE'.expandMedia()}},
	{name: 'media2_faz',                    query: {q:'url:faz.net,@FAZ_Auto,@FAZ_BerufChance,@FAZ_Buch,@FAZ_Eil,@FAZ_Feuilleton,@FAZ_Finanzen,@FAZ_Hanz,@FAZ_Immobilien,@FAZ_Kunstmarkt,@FAZ_Literatur,@FAZ_NET,@FAZ_Politik,@faz_Redaktion,@FAZ_Reise,@FAZ_RheinMain,@FAZ_Sport,@FAZ_Technik,@FAZ_Vermischtes,@FAZ_Wirtschaft,@FAZ_Wissen,@FAZBoersenspiel,@faznet'.expandMedia()}},
	{name: 'media2_focus',                  query: {q:'url:focus.de,@focusauto,@focusdigital,@focusonline,@focuspolitik,@focusreise,@focuswissen'.expandMedia()}},
	{name: 'media2_freitag',                query: {q:'url:freitag.de,@derfreitag'.expandMedia()}},
	{name: 'media2_huffingtonpost_de',      query: {q:'url:huffingtonpost.de,@HuffPostDE'.expandMedia()}},
	{name: 'media2_jouwatch',               query: {q:'url:journalistenwatch.com,@jouwatch'.expandMedia()}},
	{name: 'media2_junge_freiheit',         query: {q:'url:jungefreiheit.de,@Junge_Freiheit'.expandMedia()}},
	{name: 'media2_jungewelt',              query: {q:'url:jungewelt.de,@jungewelt'.expandMedia()}},
	{name: 'media2_kenfm',                  query: {q:'url:kenfm.de'.expandMedia()}},
	{name: 'media2_krone_at',               query: {q:'url:krone.at,@krone_at'.expandMedia()}},
	{name: 'media2_mdraktuell',             query: {q:'url:mdr.de,@MDRAktuell'.expandMedia()}},
	{name: 'media2_neues_deutschland',      query: {q:'url:neues-deutschland.de,@ndaktuell'.expandMedia()}},
	{name: 'media2_ntv',                    query: {q:'url:n-tv.de,@ntv_EIL,@ntvde,@ntvde_auto,@ntvde_Politik,@ntvde_politik,@ntvde_sport'.expandMedia()}},
	{name: 'media2_nzz',                    query: {q:'url:nzz.ch,@nzz,@NZZde,@NZZMeinung,@NZZSchweiz,@NZZWissen,@NZZStorytelling,@NZZzuerich,@NZZfeuilleton,@NZZAusland,@nzzwirtschaft,@NZZSport'.expandMedia()}},
	{name: 'media2_pi_news',                query: {q:'url:pi-news.net,@p_i'.expandMedia()}},
	{name: 'media2_politikversagen',        query: {q:'url:politikversagen.net,@staatsversagen'.expandMedia()}},
	{name: 'media2_rbb',                    query: {q:'url:rbb-online.de,rbb24.de,@rbbabendschau'.expandMedia()}},
	{name: 'media2_rt_deutsch',             query: {q:'url:deutsch.rt.com,@RT_Deutsch'.expandMedia()}},
	{name: 'media2_smopo',                  query: {q:'url:smopo.ch'}},
	{name: 'media2_spiegel',                query: {q:'url:spiegel.de,@SPIEGEL_24,@SPIEGEL_alles,@SPIEGEL_Auto,@SPIEGEL_Data,@SPIEGEL_EIL,@SPIEGEL_English,@SPIEGEL_Gesund,@SPIEGEL_kolumne,@SPIEGEL_Kultur,@SPIEGEL_live,@SPIEGEL_Netz,@SPIEGEL_Pano,@SPIEGEL_Politik,@SPIEGEL_Reise,@SPIEGEL_Rezens,@SPIEGEL_SPAM,@SPIEGEL_Sport,@SPIEGEL_Top,@SPIEGEL_Video,@SPIEGEL_Wirtsch,@SPIEGEL_Wissen,@SPIEGELDAILY,@SPIEGELONLINE,@SPIEGELTV,@SPIEGELzwischen'.expandMedia()}},
	{name: 'media2_sputniknews',            query: {q:'url:de.sputniknews.com'.expandMedia()}},
	{name: 'media2_stern',                  query: {q:'url:stern.de,@sternde'.expandMedia()}},
	{name: 'media2_sueddeutsche',           query: {q:'url:sueddeutsche.de,@SZ,@SZ_WolfratsToel,@SZ_Starnberg,@SZ_Ebersberg,@SZ_Dachau,@SZ_Freising,@SZ_FFB,@SZ_Erding,@SZ_Bildung,@SZ_Medien,@SZ_Eilmeldungen,@SZ_Reise,@SZ_Gesundheit,@SZ_Wissen,@SZ_Digital,@SZ-Digital,@SZ_Auto,@SZ_Bayern,@SZ_Muenchen,@SZ_Karriere,@SZ_Gesellschaft,@SZ_Sport,@SZ_Kultur,@SZ_Geld,@SZ_Wirtschaft,@SZ_Politik,@szmagazin,@SZ_TopNews'.expandMedia()}},
	{name: 'media2_swraktuell',             query: {q:'url:SWRAktuell.de,@SWRAktuell'.expandMedia()}},
	{name: 'media2_t_online',               query: {q:'url:www.t-online.de,@tonline_news'.expandMedia()}},
	{name: 'media2_tagesschau',             query: {q:'url:tagesschau.de,@tagesschau'.expandMedia()}},
	{name: 'media2_tagesspiegel',           query: {q:'url:tagesspiegel.de,@Tagesspiegel,@TspBerlin,@TspCausa,@TspLeute,@TSPSonntag,@tspsport'.expandMedia()}},
	{name: 'media2_taz',                    query: {q:'url:taz.de,@tazgezwitscher,@taz_news'.expandMedia()}},
	{name: 'media2_theeuropean',            query: {q:'url:theeuropean.de,@theeuropean'.expandMedia()}},
	{name: 'media2_tichyseinblick',         query: {q:'url:tichyseinblick.de,@TichysEinblick'.expandMedia()}},
	{name: 'media2_unzensuriert_at',        query: {q:'url:unzensuriert.at,@unzensuriert'.expandMedia()}},
	{name: 'media2_unzensuriert_de',        query: {q:'url:unzensuriert.de'.expandMedia()}},
	{name: 'media2_voiceofEurope',          query: {q:'url:voiceofeurope.com,@VoiceofEurope'.expandMedia()}},
	{name: 'media2_waz',                    query: {q:'url:waz.de,@WAZ_Redaktion'.expandMedia()}},
	{name: 'media2_welt',                   query: {q:'url:welt.de,@WELT,@WELT_EIL,@WELT_Wissen,@WELT_Webwelt,@WELT_Kultur,@WELT_Sport,@WELT_Medien,@WELT_Panorama,@WELT_Geld,@WELT_Economy,@WELT_Politik'.expandMedia()}},
	{name: 'media2_zdf',                    query: {q:'url:zdf.de,@ZDF'.expandMedia()}},
	{name: 'media2_zdf_heute',              query: {q:'url:heute.de,@heutejournal,@heuteplus'.expandMedia()}},
	{name: 'media2_zeit',                   query: {q:'url:zeit.de,@zeitonline,@zeitonline_dig,@zeitonline_ent,@zeitonline_fam,@zeitonline_kul,@zeitonline_live,@zeitonline_pol,@zeitonline_vid,@zeitonline_wir,@zeitonline_wis,@zeitonlinesport'.expandMedia()}},
	{name: 'menaretrash',                   query: {q:'menaretrash OR #menaretrash'}},
	{name: 'mequeer',                       query: {q:'#mequeer OR mequeer'}},
	{name: 'metoo',                         query: {q:'#metoo OR metoo'}},
	{name: 'metwo',                         query: {q:'#metwo OR metwo'}},
	{name: 'ministerien',                   query: {q:'sksachsentweets,Arne_Wiechmann,SMIsachsen,ChriSchni,StRegSprecherin,Boschemann,julitalk,svefri,amtzweinull,HaufeStephan,jettebo,Opp_Sprecher,ZimmermannSina,al_krampe,Medienheld,bauerzwitschert,hard_er,MSchroeren,pampel_muse,evamariamarks,RouvenKlein,ninasuza,andreasblock,foeniculum,zumtesthier'.toWildFromTo()}},
	{name: 'ministerien2',                  query: {q:'AA_SicherReisen,Digital_Bund,BMVg_Afrika,BundesKultur,TDE2018Berlin,bfarm_de,bka,Stammtisch20,BVerfG,BSI_Presse,Bundestag,ADS_Bund,BBK_Bund,BMBF_Bund,BStU_Presse,BMG_Bund,BMJV_Bund,BAFA_Bund,BMAS_Bund,BAMF_Dialog,BMWi_Bund,netzausbau,BMI_Bund,BMFSFJ,BMF_Bund,GermanyDiplo,BMZ_Bund,bmel,AuswaertigesAmt,BMVI,destatis,RegSprecher,Bundestagsradar,bmu,Umweltbundesamt,bundesrat,bpb_de,HiBTag'.toWildFromTo()}},
	{name: 'musterfeststellungsklage',      query: {q:'musterfeststellungsklage'}},
	{name: 'nazisraus',                     query: {q:'nazisraus OR #nazisraus'}},
	{name: 'netzdg',                        query: {q:'netzdg'}},
	{name: 'nnc3',                          query: {q:'34c3 OR 35c3 OR 36c3 OR 37c3 OR 38c3 OR 39c3 OR 40c3 OR 41c3 OR 42c3'}},
	{name: 'noafd',                         query: {q:'noafd'}},
	{name: 'parteien',                      query: {q:'linke,linken,grüne,grünen,spd,cdu,csu,fdp,afd'.toOR(), lang:'de'}},
	{name: 'pflege',                        query: {q:'pflegenotstand OR pflege'}},
	{name: 'polizei',                       query: {q:'Polizei_PP_ROS,LKA_RLP,Polizei_WOB,PolizeiStmk,polizeiOBN,GBA_b_BGH,SH_Polizei,polizeiopf,PolizeiSWS,PolizeiOFR,Polizei_CE,Polizei_ROW,Polizei_OL,Pol_Grafschaft,Polizei_OHA,Polizei_HOL,Polizei_NOM,Polizei_AUR_WTM,Polizei_LER_EMD,Polizei_HM,Polizei_EL,Polizei_HI,Polizei_WL,Polizei_LG,Polizei_OS,Polizei_BS,Polizei_SuedHE,PolizeiLB,polizeiNB,Polizei_WH,bka,ukask_de,PolizeiUFR,PolizeiBB,Polizei_MH,bpol_b_einsatz,bpol_nord,bpol_air_fra,bpol_bepo,bpol_kueste,bpol_koblenz,bpol_b,PolizeiKonstanz,Polizei_FT,Polizei_soh,Polizei_MSE,PolizeiNI_Fa,PolizeiMannheim,Polizei_OH,PolizeiBhv,Polizei_HST,Polizei_SN,PolizeiVG,LKA_Hessen,Polizei_PP_NB,bpol_by,bpol_bw,Polizei_NH,Polizei_Thuer,ADS_Bund,Polizei_KA,polizeiOBS,PolizeiBerlin_I,PolizeiHamburg,PolizeiPDNord,LPDWien,PolizeiMuenchen,Polizei_PS,PolizeiBerlin_E,polizeiberlin,polizei_nrw_ge,polizei_nrw_d,polizei_nrw_du,polizei_nrw_bi,Polizei_NRW_E,Polizei_nrw_ms,Polizei_Ffm,PolizeiTrier,PP_Rheinpfalz,polizei_nrw_ob,PolizeiMainz,Polizei_KO,Europol,Polizei_KL,Polizei_Rostock,polizei_nrw_do,BMI_Bund,PP_Stuttgart,polizei_nrw_k,PolizeiSachsen,FHPolBB,StadtpolizeiZH'.toWildFromTo()}},
	{name: 'polizeigesetz',                 query: {q:'nopag OR polizeigesetz'}},
	{name: 'rechts',                        query: {q:'afdwaehlen,antifaverbot,merkelmussweg,staatsfernsehen,stopasyl,stopislam,widerstand'.toOR()}},
	{name: 'rechts2',                       query: {q:'"aufrecht erhalten","bedauerlicher einzelfall","esreicht","fake news","große verfall","illegale masseneinwanderung","illegale migranten","islamistische gefährder","islamistischer gefährder","kampf gegen","kapituliert vor","kein einzelfall","konstatiert kontrollverlust","leistet widerstand","links grün versifft","mein vaterland","merkelmussweg","mundtot gemacht","mundtot machen","plünderung freigegeben","politisch inkorrekt","politische korrektheit","rechte ecke","schweigende mehrheit","unkontrollierte einwanderung","unkontrollierte masseneinwanderung","unser land","volkspädagogische kampagne","widerliches pack","wirklichkeitsverweigerung",abmerkeln,abschiebung,achgut,afdimbundestag,afdwaehlen,alllivesmatter,alternativemedien,altparteien,anarchokapitalist,anpassungsmoralismus,antiantifa,antifaverbot,antigender,antimerkel,antisystem,antivegan,armenimport,asyl,asylindustrie,aufrecht,banislam,bedauerlich,bereicherung,bevormundung,bimbo,bluehand,dankeerikasteinbach,defendeurope,defendgermany,demokratur,denkverbot,deplorable,deraustausch,deutschfam,diktatur,dirigismus,ditib,drachenlord,dreck,einwanderung,einzelfall,einzelfallinfos,einzeltäter,endgov,entbrüsseln,erklärung2018,erziehungsmedien,eudssr,fakenews,fakerefugees,familiennachzug,fckislm,flintenuschi,flüchtlingsproblematik,flüchtlingswelle,freekolja,freilerner,frühsexualisierung,gabfam,gedankenpolizei,gefährder,gegenlinks,gegenzecken,geldsystemkritiker,"gender mainstreaming",gendergaga,genderismus,genderterror,gesinnungsterror,gleichgeschaltet,gleichschaltung,grueneversenken,gutmensch,gutmenschen,heimatbewusst,herrschaftsfrei,heterophob,hetzer,homolobby,ichbinpack,identitätspolitik,immigrationskritik,invasoren,invasorenwelle,islambeiuns,islamisierung,islamnixgut,jungefreiheit,kartellparteien,kartoffeldeutsch,kinderehe,kinderfickersekte,klartext,klimalüge,konservativ-freiheitlich,kopftuch,kopftuchverbot,koppverlag,kriegstreiber,krimigranten,kulturbereicherer,kulturtaliban,kuscheljustiz,köterrasse,landeshochverrat,linksextremismus,linksfaschismus,linksmaden,linksnicker,linksversifft,lügenpresse,lügner,machtelite,machtwechsel,maskulist,masseneinwanderung,maulkorb,mediendiktatur,meinungsdiktat,meinungsdiktatur,meinungsfreiheit,merkelei,merkelmussweg,merkelregime,mgga,migrassoren,migrationswaffe,minimalstaat,multikultitötet,mundtot,muslime,muslimisch,männerbeauftragter,männerrechtler,nafri,national-liberal,nationalkonservativ,nationalstolz,nazikeule,neger,neokonservativ,netzdg,nichtohnemeinkopftuch,opfer-abo,opferindustrie,paulanergarten,pckills,proborders,propaganda,propagandaschau,propolizei,quotenneger,realitätsverweigerer,rechtsstaat,redpill,refugeesnotwelcome,remigration,rückführungshelfer,scharia,scheinasylant,schleiereule,schuldkult,selbstabschaffung,selbstviktimiserung,sozial-libertär,sozialparadies,sozialschmarotzer,sozialsysteme,sozialtourist,sprachpolizei,staatsfernsehen,staatspresse,stasi,steuerstaat,stopasyl,stopislam,superstaat,systemgünstlinge,systemkonform,systemkritisch,systempresse,taxationistheft,terror,terroristen,teuro,thewestisbest,tichyseinblick,toleranzdiktatur,traudichdeutschland,tugendterror,tugendwächter,umerziehung,umvolkung,unbequem,unkontrolliert,untertanengeist,unterwerfung,vaterland,vaterländisch,verabschiedungskultur,verbotskultur,verbotspartei,verbrechen,verbrecher,verfassungspatriot,verhindern,verschwulung,voelkisch,volksbetrug,volksdeutsche,volksempfinden,volkspädagogik,volksthumsleugnung,volkstod,volksverräter,voluntarismus,völkisch,werteunion,wertkonservativ,widerlich,widerstand,wirtschaftsflüchtling,zensurland,zuwanderung,zuwanderungskritisch,zwangsgebühren'.toOR(), lang:'de'}},
	{name: 'rechts3',                       query: {q:'mischvölker,halbneger'.toOR(), lang:'de'}},
	{name: 'rechts4',                       query: {q:'staatsfunk,massenmigration,mischvolk,endlösung,überfremdung'.toOR(), lang:'de'}},
	{name: 'reisewarnung',                  query: {q:'reisewarnung OR reisehinweis'}},
	{name: 'revolution2019',                query: {q:'revolution2019 OR #revolution2019'}},
	{name: 'rezovideo',                     query: {q:'rezovideo,#rezo,@rezomusik,to:rezomusik,from:rezomusik,@cdu,to:cdu,from:cdu,amthor,amthorvideo,#cdu,www.youtube.com/watch?v=4Y1lZQsyuSQ,"Zerstörung der CDU"'.toOR()}},
	{name: 'rp19-hash',                     query: {q:'#rp19'}},
	{name: 'rp19-hash2',                    query: {q:'#republica19 OR #republica'}},
	{name: 'rp20-hash',                     query: {q:'#rp20 OR #republica20 OR #republica'}},
	{name: 'sarrazin',                      query: {q:'sarrazin OR sarazin'}},
	{name: 'sawsanchebli',                  query: {q:'sawsanchebli'.toWildFromTo()}},
	{name: 'seebruecke',                    query: {q:'seebruecke OR seebrücke'}},
	{name: 'seehofer',                      query: {q:'seehofer OR #seehofer'}},
	{name: 'shitstormopfer1',               query: {q:'dunjahayali,janboehm,georgrestle,sawsanchebli,ebonyplusirony,fatma_morgana,igorpianist,sibelschick,hatinjuce'.toWildFromTo()}},
	{name: 'shooting3',                     query: {q:'santafehighschool OR santafe OR SantaFeShooting OR SantaFeSchoolShooting OR HoustonShooting'}},
	{name: 'sibelschick',                   query: {q:'sibelschick'.toWildFromTo()}},
	{name: 'skygo',                         query: {q:'skygo,SkySportDE,SkyDeutschland,DAZN_DE,SkyTicketDE,skyucl'.toWildFromTo()}},
	{name: 'spd',                           query: {q:'#spd'}},
	{name: 'syria',                         query: {q:'syria'}},
	{name: 'talk_annewill',                 query: {q:'@annewill,@AnneWillTalk,‏#annewill,annewill,"anne will"'.expandMedia()}},
	{name: 'talk_hartaberfair',             query: {q:'#hartaberfair,#Plasberg,"frank plasberg"'.expandMedia()}},
	{name: 'talk_maischberger',             query: {q:'@maischberger,#maischberger,maischberger'.expandMedia()}},
	{name: 'talk_markuslanz',               query: {q:'@ZDFMarkusLanz,"Markus Lanz",#lanz'.expandMedia()}},
	{name: 'talk_maybritillner',            query: {q:'@maybritillner,#illner,#maybritillner,maybritillner,"maybrit illner"'.expandMedia()}},
	{name: 'tamponsteuer',                  query: {q:'tamponsteuer OR #tamponsteuer'}},
	{name: 'tempolimit',                    query: {q:'tempolimit OR #tempolimit'}},
	{name: 'tenderage',                     query: {q:'"tender age"'}},
	{name: 'toptweets_de_20',               query: {q:'lang:de min_retweets:20'}},
	{name: 'toptweets_de_50',               query: {q:'lang:de min_retweets:50'}},
	{name: 'toptweets_en_10k',              query: {q:'lang:en min_retweets:10000'}},
	{name: 'trudeaumustgo',                 query: {q:'trudeaumustgo OR #trudeaumustgo'}},
	{name: 'trump_mentions',                query: {q:'to:realdonaldtrump OR to:potus OR realdonaldtrump OR potus'}},
	{name: 'trump_tweets',                  query: {q:'from:realdonaldtrump OR from:potus'}},
	{name: 'ueberwachung',                  query: {q:'überwachungspaket OR staatstrojaner OR bundestrojaner OR ueberwachungspaket OR zib2 OR überwachung OR privatsphäre OR datenschutz OR sicherheit OR vds OR sicherheitspaket'}},
	{name: 'unionsstreit1',                 query: {q:'unionsstreit,seehofer,csu,asylstreit,merkel,afd,ultimatum,zuwanderung,groko'.toOR(), lang:'de'}},
	{name: 'unteilbar',                     query: {q:'unteilbar OR unteilbar_ OR to:unteilbar_ OR from:unteilbar_'}},
	{name: 'uploadfilter',                  query: {q:'uploadfilter OR saveyourinternet OR leistungsschutzrecht OR deleteart13 OR censorshipmachine OR axelvossmdep OR from:axelvossmdep OR to:axelvossmdep OR fixcopyright'}},
];


//fetch lists
var listsTask = scraper.getSubTask()
async.each(
	lists,
	(screen_name, cbUser) => {
		listsTask.fetch(
			'lists/ownerships',
			{screen_name:screen_name, count:1000},
			response1 => {
				async.each(
					response1.lists,
					(list, cbList) => {
						listsTask.fetch(
							'lists/members',
							{list_id:list.id_str, count:5000, include_entities:false, skip_status:true},
							response2 => {
								var users = response2.users.map(u => u.screen_name);
								
								if (users.length === 0) return cbList();

								var name = (screen_name+'_list_'+list.slug).toLowerCase();
								name = name.replace(/ü/g, 'ue');
								name = name.replace(/ö/g, 'oe');
								name = name.replace(/ä/g, 'ae');
								name = name.replace(/ß/g, 'ss');

								queries.push({
									name: name,
									query: {
										q:users.map(u => 'from:'+u+' OR to:'+u).join(' OR ')
									}
								})
								cbList();
							}
						)
					},
					() => cbUser()
				)
			}
		)
	},
	() => {
		queries.sort((a,b) => a.name < b.name ? -1 : 1);
		startScraper();
	}
)

scraper.run();

function startScraper() {
	// Search with each of these queries,
	// for each of the last 14 days
	var queue = [];
	var yesterday = Math.floor(Date.now()/86400000)-0.5;
	for (var i = -10; i <= 0; i++) {
		var date = (new Date((yesterday+i)*86400000)).toISOString().substr(0,10);
		queries.forEach(obj => {
			var _name = obj.name;
			var _query = obj.query;
			var _date = date;
			queue.push(cb => runScraper(_name, _query, _date, cb))
		})
	}

	async.parallelLimit(
		queue,
		2,
		() => console.log(colors.green.bold('## FINISHED'))
	)
}


function runScraper(name, query, date, cbScraper) {
	var title = '"'+name+' - '+date+'"';
	
	var tempFilename = resolve(__dirname, '../../tmp', Math.random().toFixed(16).substr(2)+'.tmp.xz');
	var filename = resolve(__dirname, '../../data/search_and_dump/'+name+'/'+name+'_'+date+'.jsonstream.xz');

	// Does the file already exists
	if (fs.existsSync(filename)) {
		//console.log(colors.grey('Ignore '+title));
		return setTimeout(cbScraper,0);
	} else {
		console.log(colors.grey('   Starting '+title));
	}

	var outputStream = new OutputStream(tempFilename, filename)

	function OutputStream(tempFilename, filename) {
		// Prepare Compressor
		var bufferStream = BufferStream(64*1024*1024);

		var compressor = child_process.spawn('xz', '-zkfc9 -T 1 -'.split(' '));
		compressor = miss.duplex(compressor.stdin, compressor.stdout);

		var writeStream = fs.createWriteStream(tempFilename, {highWaterMark: 8*1024*1024});

		bufferStream.pipe(compressor).pipe(writeStream);


		// Make sure that the folder exists
		utils.ensureDir(filename);

		// flush data buffer to lzma compressor
		function flush(percent, cbFlush) {
			console.log(colors.grey('   flushing '+title+' - '+(100*percent).toFixed(1)+'%'))

			var buffer = Array.from(tweets.values());
			tweets = new Map();
			tweetCount = 0;

			if (buffer.length === 0) return cbFlush();

			buffer.sort((a,b) => a.id_str < b.id_str ? -1 : 1);
			buffer = buffer.map(t => t.buffer);
			buffer = Buffer.concat(buffer);

			if (bufferStream.write(buffer)) {
				cbFlush();
			} else {
				bufferStream.once('drain', cbFlush);
			}
		}

		// when finished: flush data and close file
		function close(cbClose) {
			//console.log(colors.green('prepare closing '+title));
			flush(1, () => {
				//console.log(colors.green('closing '+title));
				writeStream.on('close', () => {
					console.log(colors.grey.bold('   closed '+title));
					if (!dry) fs.renameSync(tempFilename, filename);
					cbClose();
				})
				bufferStream.end();
			})
		}

		return {
			flush: flush,
			close: close,
		}
	}

	// Map of all found tweets
	var tweets = new Map();
	var tweetCount = 0;

	// new scraper sub task
	var task = scraper.getSubTask()

	// start recursive scraper

	var query_url = urlEncode(query.q);

	if (query_url.length < 511) {
		scrape(query, () => outputStream.close(cbScraper));
	} else {
		async.eachSeries(
			splitQuery(query),
			scrape,
			() => outputStream.close(cbScraper)
		)
	}

	function scrape(query, cbScrape) {
		//console.log(name, date, query);
		scrapeRec();

		function scrapeRec(max_id) {
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

					if (!dry) {
						result.statuses.forEach(t => tweets.set(t.id_str, {
							id_str: t.id_str,
							created_at: t.created_at,
							buffer: Buffer.from(JSON.stringify(t)+'\n', 'utf8')
						}));
					}
					tweetCount += result.statuses.length;

					var date = (result.statuses[0]||{}).created_at;

					if (tweetCount > 2000) {
						var percent = Date.parse(date)/86400000;
						percent = 1 - percent + Math.floor(percent);
						outputStream.flush(percent, checkRerun);
					} else {
						checkRerun()
					}

					function checkRerun() {
						var min_id = utils.getTweetsMinId(result.statuses);
						if (min_id) {
							//console.log(colors.grey('\t'+date.replace(/ \+.*/,'')+'\t'+title));
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


function urlEncode(q) {
	return q.replace(/ /g, '%20').replace(/:/g, '%3A')
}

function splitQuery(query) {
	var q = query.q.split(' OR ');
	var newQuery = q.shift();
	var newQueries = [];

	while (q.length > 0) {
		var newString = q.shift();
		if (urlEncode(newQuery+' OR '+newString).length > 500) {
			newQueries.push(newQuery);
			newQuery = newString;
		} else {
			newQuery = newQuery+' OR '+newString;
		}
		if (q.length === 0) newQueries.push(newQuery);
	}

	newQueries = newQueries.map(q => {
		if ((!q) || (q.trim().length === 0)) {
			console.log(newQueries);
			process.exit();
		}
		var obj = {q:q};
		Object.keys(query).forEach(key => {
			if (key !== 'q') obj[key] = query[key];
		})
		return obj;
	})

	return newQueries;
}

function BufferStream(maxSize) {
	var bufferList = [];
	var bufferSize = 0;
	var cbsWrite = [];
	var cbsRead = [];
	var finished = false;

	function write(data, enc, cb) {
		bufferList.unshift(data);
		bufferSize += data.length;

		triggerRead();

		if (bufferSize < maxSize) return cb();
		cbsWrite.push(cb);
	}

	function flush() {
		finished = true;
		triggerRead();
	}

	function triggerRead() {
		if (cbsRead.length === 0) return;
		cbsRead.forEach(cb => setTimeout(() => read(0,cb), 0));
		cbsRead = [];
	}

	function read(size, next) {
		if (bufferList.length > 0) {
			var chunk = bufferList.pop();
			bufferSize -= chunk.length;
			next(null, chunk);
		} else {
			if (finished) {
				next(null, null)
			} else {
				cbsRead.push(next);
			}
		}

		if ((cbsWrite.length > 0) && (bufferSize < maxSize/2)) {
			cbsWrite.forEach(cb => setTimeout(cb,0));
			cbsWrite = [];
		}

	}

	return miss.duplex( miss.to(write, flush), miss.from(read) )
}
