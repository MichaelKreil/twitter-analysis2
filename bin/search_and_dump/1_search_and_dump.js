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

String.prototype.expand = function () {
	return this.split(',').map(a => {
		a = a.trim();
		if (a[0] !== '@') return a
		a = a.substr(1);
		return 'from:'+a+' OR to:'+a+' OR '+a;
	}).join(' OR ')
}

// List of search queries
var queries = [
{name:'moria1',query:{q:'moria'}},
	{name: '120db',                         query: {q:'frauenmarsch,120db,b1702,dd1702,ndh1702,niun1702,niun,no120db'.toOR()}}, 
	{name: '36c3',                          query: {q:'36c3'}},
	{name: '37c3',                          query: {q:'37c3'}},
	{name: '38c3',                          query: {q:'38c3'}},
	{name: '39c3',                          query: {q:'39c3'}},
	{name: '40c3',                          query: {q:'40c3'}},
	{name: 'afd',                           query: {q:'#afd'}},
	{name: 'afd2',                          query: {q:'afd'}},
	{name: 'amadeuantonio',                 query: {q:'@amadeuantonio'.expand()}},
	{name: 'angst',                         query: {q:'furcht,fürchten,fürchte,befürchte,befürchten,angst,ängste,beängstigend,panik,sorge,sorgen,bedrohung,bedrohen,bedrohend,bedroht,bedrohlich,bedrohliche,bedrohlichen'.toOR()}},
	{name: 'antifa',                        query: {q:'#antifa'.expand()}},
	{name: 'antifa2',                       query: {q:'antifa,anti-faschismus,anti-faschist,anti-faschisten,anti-faschistin,anti-faschistisch,anti-fascism,anti-fascismo,anti-fascist,anti-fascista,anti-fascists,antifaschismus,antifaschist,antifaschisten,antifaschistin,antifaschistisch,antifascism,antifascismo,antifascist,antifascista,antifascists,faschismus,faschist,faschisten,faschistin,faschistisch,fascism,fascismo,fascist,fascista,fascists'.toOR()}},
	{name: 'antifa3',                       query: {q:'exposeantifa,exposeantifaterrorists'.expand()}},
	{name: 'antifa4',                       query: {q:'iamantifa,yotambiensoyterrorista,weareantifa,iamantifascist,ichbinantifa,americanpatriotsareantifa,weareallantifa'.expand()}},
	{name: 'article13',                     query: {q:'#no11,#no12,#no13,acta2,antyart13,art11,art13,art13grafiken,article11,article13,article15,article16,article17,articulo11,articulo13,artigo13,artikel11,artikel12,artikel13,artikel13demo,artikel15,artikel16,artikel17,artikle13,artículo13,axelsurft,axelswelt,axelvoss,b0203,barleyfilter,berlingegen13,bots,censorship,censorshipmachine,censorshipmachines,censuracopyright,copylaw,copyright,copyrightdirective,copyrightirective,createyourinternet,dankejulia,delarticle13,deleteart11,deleteart13,deletearticle13,demogeld,demosold,derechoseninternet,DigitalSingleMarket,EUDigital,fairinternet,fairuse,fckart13,fixcopyright,gegenartikel13,gehtwaehlen,h2020,keinebots,kölngegen13,leistungsschutzrecht,linktax,lsr,luegenmanni,mepstaywithus,merkelfilter,mittelfingermittwoch,mob,mobgate,niemehrcdu,niemehrcsu,niemehrspd,niewiedercdu,no2article11,no2article12,no2article13,nochniecdu,nocreatorsnocontent,op13,pledge2019,ripinternet,safeyourinternet,saveourinternet,savetheinternet,savethelink,saveyourinternet,stopacta2,stoparticle13,stopartikel13,stopcensuracopyright,thankyoujulia,uploadfilter,uploadfiltern,uploadfilters,urheberrecht,urheberrechtsreform,vollvossten,vote4culture,weneedcopyrightdirective,wirsindbots,wirsinddiebots,wirsindkeinebots,yes2copyright,youtubersjoinus'.toOR()}},
	{name: 'article13_discussion',          query: {q:'ansip_eu,authorsocieties,axelvossmdep,bmjv_bund,caspary,cdu,cdu_csu_ep,dsmeu,eff,ep_legal,eppgroup,eu_commission,euforcreators,evisual_artists,fairinternet4p,fim_musicians,gabrielmariya,gema_news,heidihautala,helgatruepel,hwieduwilt,juliaredamep,junckereu,katarinabarley,manfredweber,maxandersson,musikzeitung,peteraltmaier,politicoeurope,senficon,shkmep,spdeuropa,tadeuszzwiefka,urheber_verdi,woelken'.toWildFromTo()}},
	{name: 'asyl',                          query: {q:'asyl OR asylstreit OR asyltourismus OR asylgehalt'}},
	{name: 'aufstehen',                     query: {q:'aufstehen'}},
	{name: 'b3008',                         query: {q:'#b2808,#b2908,#b3008,#b3108'.toOR()}},
	{name: 'b3008b',                        query: {q:'#abstandhaltengegenrechts,#b2808info,#be2808,#b2908info,#be2908,#b3008info,#be3008,#b3108info,#be3108,#berlin2808,#berlin2908,#berlin3008,#berlin3108,#berlindemo,#berlinprotest,#berlinprotests,#coronademo,#covidioten,#demo,#demoberlin,#querdenken,#querdenken711,#sturmaufberlin'.toOR()}},
	{name: 'bahn',                          query: {q:'bahn OR bahnhof OR hbf OR zug OR bahnsteig OR to:dbbahn OR dbbahn OR fahrradabteil OR ice OR schaffner OR bordbistro OR verspätung OR anschluss OR umsteigen OR ansage OR anzeige OR stellwerk OR störung OR weiche', lang:'de'}},
	{name: 'beirut',                        query: {q:'beirut,lebanon'.expand()}},
	{name: 'berlin',                        query: {q:'', geocode:'52.5,13.4,50km'}},
	{name: 'bild',                          query: {q:'BILD,BILD_Berlin,BILD_Digital,BILD_Frankfurt,BILD_Hamburg,BILD_Muenchen,BILD_News,BILD_Politik,BILD_TopNews,jreichelt'.toFromTo()}},
	{name: 'brexit',                        query: {q:'#brexit'.expand()}},
	{name: 'brexit2',                       query: {q:'brexit,brexitdeal,brexit,theresa,borisjohnson,chlorinated,peoplesvotemarch,peoplesvote,corbyn,backstop,brexitshambles,nodeal,stopbrexit,borisjohnson,nigel_farage,meaningfulvote,farage,getbrexitdone,remainers'.toOR()}},
	{name: 'bundesregierung',               query: {q:'SilberhornMdB,Mi_Muentefering,RitaHaglKehl,SvenjaSchulze68,LambrechtMdB,katarinabarley,StSLindner,AdlerGunther,Thomas_Bareiss,AnjaKarliczek,AnetteKramme,MiRo_SPD,JochenFlasbarth,guenterkrings,MJaegerT,W_Schmidt_,peteraltmaier,LangeMdB,jensspahn,RegSprecher,DoroBaer,fuchtel,zierke,thomasgebhart,rischwasu,AndiScheuer,NielsAnnen,KerstinGriese,OlafScholz,ChristianHirte,meister_schafft,JuliaKloeckner,HeikoMaas,SteffenBilger,petertauber,FlorianPronold,HBraun,BoehningB,wanderwitz,hubertus_heil'.toWildFromTo()}},
	{name: 'bundesverdienstkreuz',          query: {q:'bundesverdienstkreuz'}},
	{name: 'bunkertrump',                   query: {q:'AmericaOrTrump,bunkerboy,cowardinchief,bunkertrump,bunkerdon,voteouthate,bunkerbabytrump,bunker'.toOR()}},
	{name: 'cdu',                           query: {q:'cdu'.expand()}},
	{name: 'christchurch',                  query: {q:'christchurch,#christchurch,#eggboy,#fraseranning,#hellobrother,#neuseeland,#newzealand,#newzealandshooting,#newzealandterroristattack,حادث_نيوزيلندا_الارهابي'.toOR()}},
	{name: 'climatestrike',                 query: {q:'#20eylüli̇klimgrevi,#actonclimate,#allefuersklima,#allefürsklima,#cambioclimatico,#cambioclimático,#climateactionnow,#climatechange,#climatecrisis,#climateemergency,#climatejustice,#climatejusticenow,#climatemarch,#climatemarchpakistan,#climatestrike,#climatestrikeke,#climatestrikes,#climatestrikethailand,#crisisclimatica,#extinctionrebellion,#fridayforfuture,#fridays4future,#fridaysforfurture,#fridaysforfuture,#fridaysforfutures,#globalclimatestrike,#globalclimatestrikes,#greennewdeal,#greveglobalpeloclima,#grevepourleclimat,#huelgamundialporelclima,#islamabadclimatemarch,#klimakabinett,#klimatstrejk,#marchepourleclimat,#schoolstrike4climate,#scientists4future,#scientistsforfuture,#strajkklimatyczny,#strike4climate,#viernesporelfuturo,#youthclimatestrike,#youthstrike4climate,#グローバル気候マーチ,from:gretathunberg,to:gretathunberg'.toOR()}},
	// sorry, habe corona falsch getippt, muss jetzt aber die id konstant weiter behalten
	{name: 'coronarvirus6',                 query: {q:'coronadeutschland,#coronadeutschland,coronapanik,#coronapanik,#corona,corona,covidiot,#covidiot,#coronaoutbreak,#coronarvirus,#coronavirus,#coronavirusde,#coronavirusoutbreak,#covid,#covid19,#covid2019,#covid_19,#covidー19,#wuhan,#wuhancoronavirus,#wuhancoronovirus,#wuhanvirus,#โควิด19,coronarvirus,coronavirus,coronavirusde,coronavírus,covid,covid-19,covid19,covid2019,covid_19,covidー19,epidemic,pandemic,quarantine,quarantined,wuhan,xj621,โควิด19'.toOR(), splitTime:6}},
	{name: 'csu',                           query: {q:'csu'.expand()}},
	{name: 'donalphonso',                   query: {q:'@_donalphonso'.expand()}},
	{name: 'dsgvo',                         query: {q:'#dsgvo,#dgsvo,#dataprotection,#cybersecurity,#gdpr,#datenschutz'.expand()}},
	{name: 'dunjahayali',                   query: {q:'@dunjahayali'.expand()}},
	{name: 'elysee',                        query: {q:'@elysee'.expand()}},
	{name: 'emmanuelmacron',                query: {q:'@emmanuelmacron'.expand()}},
	{name: 'emojitetra',                    query: {q:'@emojitetra'.expand()}},
	{name: 'epstein',                       query: {q:'clintonbodycount,clintoncrimefamily,clintonsbodycount,epstein,epsteinblackbook,epsteincoverup,epsteingate,epsteinmurder,epsteinsuicide,epsteinsuicidecoverup,epsteinsuicided,epsteinunsealed,epstien,jefferyepstein,jeffreyepstein,trumpbodycount'.toOR()}},
	{name: 'euwahl1',                       query: {q:'#election,#ep,#euro,ek2019,elections2019,ep2019,eu2019,euelections,euelections2019,europa,europaparlament,europawahl,europawahl19,europawahl2019,europe,european,europeanparliament,europeennes2019,européennes,européennes2019,euw19,euwahl,futureofeurope,ps2019'.toOR()}},
	{name: 'fakenewssource2',               query: {q:'url:berliner-express.com OR url:truth24.net'}},
	{name: 'floridashooting',               query: {q:'emmagonzalez OR floridahighschool OR floridaschoolshooting OR floridashooter OR floridashooting OR floridastrong OR guncontrol OR guncontrolnow OR gunlawsnow OR gunreformnow OR gunsafety OR gunsense OR gunshooting OR highschoolshooter OR march4ourlives OR marchforourlives OR massshooting OR massshootings OR neveragain OR nrabloodmoney OR parklandschoolshooting OR parklandshooting OR righttobeararms OR schoolshooting'}},
	{name: 'floridashooting2',              query: {q:'neveragain OR gunreformnow OR guncontrolnow OR guncontrol OR marchforourlives OR parkland OR parklandschoolshooting OR floridaschoolshooting OR parklandshooting OR #nra OR floridashooting OR nrabloodmoney OR banassaultweapons OR gunsense OR emmagonzalez OR schoolshooting OR parklandstudents OR parklandstudentsspeak OR gunviolence OR floridashooter OR wecallbs OR studentsstandup OR parklandstrong'}},
	{name: 'fridaysforfuture2',             query: {q:'fridaysforfuture,climatestrike,climatechange,climateaction,from:gretathunberg,to:gretathunberg,gretathunberg,klimastreik'.toOR()}},
	{name: 'gauland',                       query: {q:'#gauland,#gaulandpause'.expand()}},
	{name: 'georgefloyd5',                  query: {q:'bluelivesmatter,bluelivesmatters,kpop,kpopdoesnotunderstandungaunga,kpopstans,opfancam,whitelivesmatter,whitelivesmatters,whitelivesmattertoo,whiteoutday,whiteouttuesday,whiteoutwednesday,black_lives_matter,blackhistorymonth,blacklivemattters,blacklivesmattter,blackoutday2020,blackouttuesday,dictatortrump,georgeflyod,trumpdictatorship,washingtondcprotest,whyididntreport,BLACK_LIVES_MATTERS,vidasnegrasimportam,protests2020,justiceforgeorgefloyd,georgefloyd,minneapolisriot,derekchauvin,georgefloydprotest,minneapolisprotests,chauvin,icantbreathe,justiceforgeorge,georgefloydmurder,justiceforfloyd,georgefloydwasmurdered,"george floyd"'.toOR(), splitTime:6}},
	{name: 'georgefloyd6',                  query: {q:'dcblackout,acab,adamatraore,alllivesmatters,americacontrump,antifaterrorists,backtheblue,black_live_matter,blacklivesmatteruk,blacklivesmattteruk,blackoutday,blackoutday2020,blackoutuesday,blacktranslivesmatter,blakelivesmatter,blm,blmprotest,blueline,breaking,breonnataylor,buildthewall,daviddorn,daviddornslifemattered,dcprotests,defundthepolice,desireebarnes,donaldtrump,fachaqueveofachaquefancameo,floyd,georgefloydprotests,giannafloyd,goergefloyd,haveafuckingplan,houstonprotest,icantbreath,iyannadior,junkterrorbillnow,justiceforahmaud,justiceforbreonnataylor,justicefordaviddorn,justicefordjevolve,justiceforgeorgesfloyd,justicepouradama,kag,kag2020,lashondaanderson,maga,maga2020,marktuan,minneapolis,nojusticenopeace,nyccurfew,nycprotests,palgharsadhulynching,paris,peacefulprotest,pmqs,policebrutality,policier,portlandprotest,protest,protest2020,protesters,racism,riots,riots2020,ripgeorgefloyd,sayhisname,saynotorapist,saytheirnames,seattleprotest,simply_kpop,stopracism,taketheknee,theshowmustbepaused,trump,trump2020,trumphasnoplan,trumpincitesviolence,trumpout2020,trumpresignnow,usaonfire,violencespolicieres,whitehouse,whitelivesmattter,whiteoutwednsday,womenfortrump'.toOR(), splitTime:6}},
	{name: 'georgefloyd7',                  query: {q:'FoxNewsisRacist,foxnews,BlackLivesMattters,cnnsesamestreet,sayhername,birthdayforbreonna,justiceforbreonna,justiceforblacklives,TrayvonMartin,AhmaudArbery,TamirRice,OscarGrant,EricGarner,PhilandoCastile,SamuelDubose,SandraBland,WalterScott,TerrenceCrutcher,RegisKorchinskiPaquet,TonyMcDade,QuaniceHayes,"Trayvon Martin","Breonna Taylor","Ahmaud Arbery","Tamir Rice","Oscar Grant","Eric Garner","Philando Castile","Samuel Dubose","Sandra Bland","Walter Scott","Terrence Crutcher","Regis Korchinski-Paquet","Tony McDade","Quanice Hayes",Normandy,DDay,DDay76'.toOR(), splitTime:4}},
	{name: 'georgefloyd8',                  query: {q:'calminkirkland,opfancam,alllivesmatter,thinblueline,womenfortrump,noracism'.expand()}},
	{name: 'gretathunberg',                 query: {q:'greta thunberg,#gretathunberg,@gretathunberg'.expand()}},
	{name: 'groko',                         query: {q:'#groko'.expand()}},
	{name: 'grossstaedte',                  query: {q:'berlin,hamburg,münchen,köln,frankfurt,stuttgart,düsseldorf,dortmund,essen,leipzig,bremen,dresden,hannover,nürnberg,duisburg,bochum,wuppertal,bielefeld,bonn,münster'.toOR()}},
	{name: 'halle',                         query: {q:'halle,#halle0910,antisemitismus,#hal0910,#haltdiefresse,#yomkippur,einzeltäter,#natsanalyse,#christchurch,#merkel,rassismus,rechterterror,#halleshooting,#wirstehenzusammen,alarmzeichen,#yomkippour,rechtsterrorismus,#jomkippur,synagoge,synagogue,rechtsextremismus,antisemitisch,terroranschlag'.toOR()}},
	{name: 'hambacherforst',                query: {q:'aktionunterholz,braunkohle,braunkohleabbau,endcoal,endegelaende,hambach,hambacherforst,hambacherforstbleibt,hambacherwald,hambi,hambi_bleibt,hambibleibt,hambibleibtaktion,kohle,kohleausstieg,kohlekommission,rwe'.toOR()}},
	{name: 'hanau',                         query: {q:'hanau,rechterterror,hanaushooting,rechtsterrorismus,hanauattack,rechtsextremismus'.toOR()}},
	{name: 'heimat',                        query: {q:'heimat'}},
	{name: 'heinsberg',                     query: {q:'heinsberg,heinsbergstudie,heinsbergprotokoll,streeck,@hendrikstreeck,heinsberg-studie,storymachine,@hbergprotokoll,@mmronz'.expand()}},
	{name: 'hgmaassen',                     query: {q:'hgmaassen'.toWildFromTo()}},
	{name: 'hongkong',                      query: {q:'#HongKong,#HongKongProtests,#StandwithHK,#antiELAB,#HongKongPolice,#StandWithHongKong,#FreeHongKong,#HongKongProtest,#hkpolice,#chinazi,#HongKongProtester,#香港,#LIHKG,#policebrutality,#HKPoliceTerrorism,#hkpolicebrutality,#hongkongpolicebrutality,#PoliceTerrorism,#HongKongPoliceTerrorism,#antiELABhk,#Shout4HK,#StandwithHonKong,#HongKongProtesters,#HongKongHumanRightsAndDemocracyAct,#Eye4HK,#HKprotests,#FightForFreedom,#HK,#HongKongers,#antichinazi,#hkprotest,#香港デモ,#PoliceBrutalitiy,#FreedomHK'.toOR()}},
	{name: 'hugoboss',                      query: {q:'@hugoboss,@joelycett,@marksilcox,@bossbrewingco,gotyourback'.expand()}},
	{name: 'infowars',                      query: {q:'infowars,RealAlexJones'.toWildFromTo()+' OR "alex jones"'}},
	{name: 'iranprotests',                  query: {q:'تظاهرات_سراسری,IranProtests'.expand()}},
	{name: 'iranprotests2',                 query: {q:'iranprotests,تظاهرات_سراسرى,مظاهرات_ايران,تظاهرات_سراسری,تظاهرات_سراسري'.expand()}},
	{name: 'iranprotests3',                 query: {q:',نه_به_اعدام,stopexecutionsiniran,اعدام_نکنید,notoexecusion,notoexecusioniran,stopexecutionofiranianprotestors,نه_به_اعدام_معترضان,دادگاه_علنی,iranianlivesmatter,بهبهان,اعدام_نكنيد,stopexecutionofiranianprotesters,اعتراضات_سراسری,notoexecutioniniran,stopexecutioniniran,stopexecutionslnlran,اعدامنکنید,آزاد_کنید,بهطالبانباجندهید,noexecutioniniran'.expand()}},
	{name: 'israel',                        query: {q:'#israel'.expand()}},
	{name: 'jensspahn',                     query: {q:'jensspahn'.toWildFromTo()}},
	{name: 'kippa',                         query: {q:'kippa', lang:'de'}},
	{name: 'knobloch',                      query: {q:'#knobloch'.expand()}},
	{name: 'ladg',                          query: {q:'ladg,landesantidiskriminierungsgesetz'.toOR()}},
	{name: 'lufthansa',                     query: {q:'lufthansa,lufthansablue,explorethenew'.toOR()}},
	{name: 'maassen',                       query: {q:'maassen,maaßen,verfassungsschutz,verfassungsschutzchef,vs-chef,vs-präsident,verfassung'.toOR()}},
	{name: 'maassen2',                      query: {q:'@HGMaassen'.expand()}},
	{name: 'maennerwelten',                 query: {q:'#maennerwelt,#maennerwelten,#männerwelt,#männerwelten,belästigen,belästigt,belästigung,belästigungen,dickpic,dickpics,dunkelziffer,fickbar,frauenhass,grabschen,missbrauch,schwanz,sexualisierte,sexuell,sexueller,vollgewichstes,würgen,übergriff,übergriffe'.expand()}},
	{name: 'media3_20min',                  query: {q:'url:20min.ch,@20min'.expand()}},
	{name: 'media3_achgut',                 query: {q:'url:achgut.com,@Achgut_com'.expand()}},
	{name: 'media3_bild',                   query: {q:'url:bild.de,@BILD,@BILD_Auto,@BILD_Bayern,@BILD_Berlin,@BILD_Blaulicht,@BILD_Bochum,@BILD_Bremen,@BILD_Chemnitz,@BILD_Digital,@BILD_Dresden,@BILD_Frankfurt,@bild_freiburg,@bild_fuerth,@BILD_Hamburg,@BILD_Hannover,@bild_ingolstadt,@BILD_kaempft,@BILD_Koeln,@BILD_Lautern,@BILD_Leipzig,@BILD_Lifestyle,@BILD_Muenchen,@BILD_News,@BILD_Nuernberg,@BILD_Politik,@BILD_Promis,@BILD_Reporter,@BILD_Ruhrgebiet,@BILD_Saarland,@BILD_Sport,@BILD_Stuttgart,@BILD_TopNews,@BILD_Wolfsburg,@BILDamSONNTAG,@BILDDuesseldorf,@BILDhilft,@BILDthueringen'.expand()}},
	{name: 'media3_blick_ch',               query: {q:'url:blick.ch,@Blickch'.expand()}},
	{name: 'media3_br24',                   query: {q:'url:br24.de,@BR24'.expand()}},
	{name: 'media3_cicero',                 query: {q:'url:cicero.de,@cicero_online'.expand()}},
	{name: 'media3_de_kurier',              query: {q:'url:deutschland?kurier.org,@de_kurier'.expand()}},
	{name: 'media3_derstandard',            query: {q:'url:derstandard.at,@derStandardat,@PolitikStandard'.expand()}},
	{name: 'media3_dpa',                    query: {q:'@dpa'.expand()}},
	{name: 'media3_dwn',                    query: {q:'url:deutsche?wirtschafts?nachrichten.de'.expand()}},
	{name: 'media3_epochtimes',             query: {q:'url:epochtimes.de,@EpochTimesDE'.expand()}},
	{name: 'media3_faz',                    query: {q:'url:faz.net,@FAZ_Auto,@FAZ_BerufChance,@FAZ_Buch,@FAZ_Eil,@FAZ_Feuilleton,@FAZ_Finanzen,@FAZ_Hanz,@FAZ_Immobilien,@FAZ_Kunstmarkt,@FAZ_Literatur,@FAZ_NET,@FAZ_Politik,@faz_Redaktion,@FAZ_Reise,@FAZ_RheinMain,@FAZ_Sport,@FAZ_Technik,@FAZ_Vermischtes,@FAZ_Wirtschaft,@FAZ_Wissen,@FAZBoersenspiel,@faznet'.expand()}},
	{name: 'media3_focus',                  query: {q:'url:focus.de,@focusauto,@focusdigital,@focusonline,@focuspolitik,@focusreise,@focuswissen'.expand()}},
	{name: 'media3_freitag',                query: {q:'url:freitag.de,@derfreitag'.expand()}},
	{name: 'media3_huffingtonpost_de',      query: {q:'url:huffingtonpost.de,@HuffPostDE'.expand()}},
	{name: 'media3_jouwatch',               query: {q:'url:journalistenwatch.com,@jouwatch'.expand()}},
	{name: 'media3_junge_freiheit',         query: {q:'url:jungefreiheit.de,@Junge_Freiheit'.expand()}},
	{name: 'media3_jungewelt',              query: {q:'url:jungewelt.de,@jungewelt'.expand()}},
	{name: 'media3_kenfm',                  query: {q:'url:kenfm.de'.expand()}},
	{name: 'media3_krone_at',               query: {q:'url:krone.at,@krone_at'.expand()}},
	{name: 'media3_mdraktuell',             query: {q:'url:mdr.de,@MDRAktuell'.expand()}},
	{name: 'media3_neues_deutschland',      query: {q:'url:neues?deutschland.de,@ndaktuell'.expand()}},
	{name: 'media3_ntv',                    query: {q:'url:n?tv.de,@ntv_EIL,@ntvde,@ntvde_auto,@ntvde_Politik,@ntvde_politik,@ntvde_sport'.expand()}},
	{name: 'media3_nzz',                    query: {q:'url:nzz.ch,@nzz,@NZZde,@NZZMeinung,@NZZSchweiz,@NZZWissen,@NZZStorytelling,@NZZzuerich,@NZZfeuilleton,@NZZAusland,@nzzwirtschaft,@NZZSport'.expand()}},
	{name: 'media3_pi_news',                query: {q:'url:pi?news.net,@p_i'.expand()}},
	{name: 'media3_politikversagen',        query: {q:'url:politikversagen.net,@staatsversagen'.expand()}},
	{name: 'media3_rbb',                    query: {q:'url:rbb?online.de,rbb24.de,@rbbabendschau'.expand()}},
	{name: 'media3_rt_deutsch',             query: {q:'url:deutsch.rt.com,@RT_Deutsch'.expand()}},
	{name: 'media3_smopo',                  query: {q:'url:smopo.ch'}},
	{name: 'media3_spiegel',                query: {q:'url:spiegel.de,@SPIEGEL_24,@SPIEGEL_alles,@SPIEGEL_Auto,@SPIEGEL_Data,@SPIEGEL_EIL,@SPIEGEL_English,@SPIEGEL_Gesund,@SPIEGEL_kolumne,@SPIEGEL_Kultur,@SPIEGEL_live,@SPIEGEL_Netz,@SPIEGEL_Pano,@SPIEGEL_Politik,@SPIEGEL_Reise,@SPIEGEL_Rezens,@SPIEGEL_SPAM,@SPIEGEL_Sport,@SPIEGEL_Top,@SPIEGEL_Video,@SPIEGEL_Wirtsch,@SPIEGEL_Wissen,@SPIEGELDAILY,@SPIEGELONLINE,@SPIEGELTV,@SPIEGELzwischen'.expand()}},
	{name: 'media3_sputniknews',            query: {q:'url:de.sputniknews.com'.expand()}},
	{name: 'media3_stern',                  query: {q:'url:stern.de,@sternde'.expand()}},
	{name: 'media3_sueddeutsche',           query: {q:'url:sueddeutsche.de,@SZ,@SZ_WolfratsToel,@SZ_Starnberg,@SZ_Ebersberg,@SZ_Dachau,@SZ_Freising,@SZ_FFB,@SZ_Erding,@SZ_Bildung,@SZ_Medien,@SZ_Eilmeldungen,@SZ_Reise,@SZ_Gesundheit,@SZ_Wissen,@SZ_Digital,@SZ-Digital,@SZ_Auto,@SZ_Bayern,@SZ_Muenchen,@SZ_Karriere,@SZ_Gesellschaft,@SZ_Sport,@SZ_Kultur,@SZ_Geld,@SZ_Wirtschaft,@SZ_Politik,@szmagazin,@SZ_TopNews'.expand()}},
	{name: 'media3_swraktuell',             query: {q:'url:SWRAktuell.de,@SWRAktuell'.expand()}},
	{name: 'media3_t_online',               query: {q:'url:www.t?online.de,@tonline_news'.expand()}},
	{name: 'media3_tagesschau',             query: {q:'url:tagesschau.de,@tagesschau'.expand()}},
	{name: 'media3_tagesspiegel',           query: {q:'url:tagesspiegel.de,@Tagesspiegel,@TspBerlin,@TspCausa,@TspLeute,@TSPSonntag,@tspsport'.expand()}},
	{name: 'media3_taz',                    query: {q:'url:taz.de,@tazgezwitscher,@taz_news'.expand()}},
	{name: 'media3_theeuropean',            query: {q:'url:theeuropean.de,@theeuropean'.expand()}},
	{name: 'media3_tichyseinblick',         query: {q:'url:tichyseinblick.de,@TichysEinblick'.expand()}},
	{name: 'media3_unzensuriert_at',        query: {q:'url:unzensuriert.at,@unzensuriert'.expand()}},
	{name: 'media3_unzensuriert_de',        query: {q:'url:unzensuriert.de'.expand()}},
	{name: 'media3_voiceofEurope',          query: {q:'url:voiceofeurope.com,@VoiceofEurope'.expand()}},
	{name: 'media3_waz',                    query: {q:'url:waz.de,@WAZ_Redaktion'.expand()}},
	{name: 'media3_welt',                   query: {q:'url:welt.de,@WELT,@WELT_EIL,@WELT_Wissen,@WELT_Webwelt,@WELT_Kultur,@WELT_Sport,@WELT_Medien,@WELT_Panorama,@WELT_Geld,@WELT_Economy,@WELT_Politik'.expand()}},
	{name: 'media3_zdf',                    query: {q:'url:zdf.de,@ZDF'.expand()}},
	{name: 'media3_zdf_heute',              query: {q:'url:heute.de,@heutejournal,@heuteplus'.expand()}},
	{name: 'media3_zeit',                   query: {q:'url:zeit.de,@zeitonline,@zeitonline_dig,@zeitonline_ent,@zeitonline_fam,@zeitonline_kul,@zeitonline_live,@zeitonline_pol,@zeitonline_vid,@zeitonline_wir,@zeitonline_wis,@zeitonlinesport'.expand()}},
	{name: 'menaretrash',                   query: {q:'menaretrash OR #menaretrash'}},
	{name: 'metoo',                         query: {q:'#metoo OR metoo'}},
	{name: 'metwo',                         query: {q:'#metwo OR metwo'}},
	{name: 'ministerien',                   query: {q:'sksachsentweets,Arne_Wiechmann,SMIsachsen,ChriSchni,StRegSprecherin,Boschemann,julitalk,svefri,amtzweinull,HaufeStephan,jettebo,Opp_Sprecher,ZimmermannSina,al_krampe,Medienheld,bauerzwitschert,hard_er,MSchroeren,pampel_muse,evamariamarks,RouvenKlein,ninasuza,andreasblock,foeniculum,zumtesthier'.toWildFromTo()}},
	{name: 'ministerien2',                  query: {q:'AA_SicherReisen,Digital_Bund,BMVg_Afrika,BundesKultur,TDE2018Berlin,bfarm_de,bka,Stammtisch20,BVerfG,BSI_Presse,Bundestag,ADS_Bund,BBK_Bund,BMBF_Bund,BStU_Presse,BMG_Bund,BMJV_Bund,BAFA_Bund,BMAS_Bund,BAMF_Dialog,BMWi_Bund,netzausbau,BMI_Bund,BMFSFJ,BMF_Bund,GermanyDiplo,BMZ_Bund,bmel,AuswaertigesAmt,BMVI,destatis,RegSprecher,Bundestagsradar,bmu,Umweltbundesamt,bundesrat,bpb_de,HiBTag'.toWildFromTo()}},
	{name: 'muslime',                       query: {q:'islam,moslem,moslems,moslimisch,moslimische,moslimischer,moslimischen,muslim,muslima,muslime,muslimen,muslimin,muslimisch,muslimische,muslimischen,muslimischer'.toOR(), lang:'de'}},
	{name: 'muslimestarten2020',            query: {q:'muslimestarten2020,neujahrsputz,neujahrsmorgen,silvesterabfall,ahmadiyyajugend'.toOR()}},
	{name: 'nazisraus',                     query: {q:'nazisraus OR #nazisraus'}},
	{name: 'netzdg',                        query: {q:'netzdg'}},
	{name: 'nnc3',                          query: {q:'34c3 OR 35c3 OR 36c3 OR 37c3 OR 38c3 OR 39c3 OR 40c3 OR 41c3 OR 42c3'}},
	{name: 'noafd',                         query: {q:'noafd'}},
	{name: 'parteien',                      query: {q:'linke,linken,grüne,grünen,spd,cdu,csu,fdp,afd'.toOR(), lang:'de'}},
	{name: 'pflege',                        query: {q:'pflegenotstand OR pflege'}},
	{name: 'polizei',                       query: {q:'Polizei_PP_ROS,LKA_RLP,Polizei_WOB,PolizeiStmk,polizeiOBN,GBA_b_BGH,SH_Polizei,polizeiopf,PolizeiSWS,PolizeiOFR,Polizei_CE,Polizei_ROW,Polizei_OL,Pol_Grafschaft,Polizei_OHA,Polizei_HOL,Polizei_NOM,Polizei_AUR_WTM,Polizei_LER_EMD,Polizei_HM,Polizei_EL,Polizei_HI,Polizei_WL,Polizei_LG,Polizei_OS,Polizei_BS,Polizei_SuedHE,PolizeiLB,polizeiNB,Polizei_WH,bka,ukask_de,PolizeiUFR,PolizeiBB,Polizei_MH,bpol_b_einsatz,bpol_nord,bpol_air_fra,bpol_bepo,bpol_kueste,bpol_koblenz,bpol_b,PolizeiKonstanz,Polizei_FT,Polizei_soh,Polizei_MSE,PolizeiNI_Fa,PolizeiMannheim,Polizei_OH,PolizeiBhv,Polizei_HST,Polizei_SN,PolizeiVG,LKA_Hessen,Polizei_PP_NB,bpol_by,bpol_bw,Polizei_NH,Polizei_Thuer,ADS_Bund,Polizei_KA,polizeiOBS,PolizeiBerlin_I,PolizeiHamburg,PolizeiPDNord,LPDWien,PolizeiMuenchen,Polizei_PS,PolizeiBerlin_E,polizeiberlin,polizei_nrw_ge,polizei_nrw_d,polizei_nrw_du,polizei_nrw_bi,Polizei_NRW_E,Polizei_nrw_ms,Polizei_Ffm,PolizeiTrier,PP_Rheinpfalz,polizei_nrw_ob,PolizeiMainz,Polizei_KO,Europol,Polizei_KL,Polizei_Rostock,polizei_nrw_do,BMI_Bund,PP_Stuttgart,polizei_nrw_k,PolizeiSachsen,FHPolBB,StadtpolizeiZH'.toWildFromTo()}},
	{name: 'polizei2',                      query: {q:'polizei,polizist,polizistin,polizisten'.expand()}},
	{name: 'polizeigesetz',                 query: {q:'nopag OR polizeigesetz'}},
	{name: 'polizeiproblem',                query: {q:'polizeiproblem'}},
	{name: 'racism',                        query: {q:'racism,racist,racists,prejudice,anti-semitic,homophobe,lgbtq,lgbtq+,supremacy,superiority,blacklivesmater,blacklivesmatter,youaintblack'.toOR(), splitTime:6}},
	{name: 'racism2',                       query: {q:'racismo,racisme,saynotoracism'.expand()}},
	{name: 'rass_kritischesweißsein',       query: {q:'kritischesweißsein,kritischeweissheiten,rassismusgegenweisse,kritischeweißheiten,kritischesweisssein,kritischesalmansein,rassismusgegendeutsche'.expand()}},
	{name: 'rass_whiteprivilege',           query: {q:'whiteprivilege,criticalwhiteness'.expand()}},
	{name: 'rechts',                        query: {q:'afdwaehlen,antifaverbot,merkelmussweg,staatsfernsehen,stopasyl,stopislam,widerstand'.toOR()}},
	{name: 'rechts2',                       query: {q:'"aufrecht erhalten","bedauerlicher einzelfall","esreicht","fake news","große verfall","illegale masseneinwanderung","illegale migranten","islamistische gefährder","islamistischer gefährder","kampf gegen","kapituliert vor","kein einzelfall","konstatiert kontrollverlust","leistet widerstand","links grün versifft","mein vaterland","merkelmussweg","mundtot gemacht","mundtot machen","plünderung freigegeben","politisch inkorrekt","politische korrektheit","rechte ecke","schweigende mehrheit","unkontrollierte einwanderung","unkontrollierte masseneinwanderung","unser land","volkspädagogische kampagne","widerliches pack","wirklichkeitsverweigerung",abmerkeln,abschiebung,achgut,afdimbundestag,afdwaehlen,alllivesmatter,alternativemedien,altparteien,anarchokapitalist,anpassungsmoralismus,antiantifa,antifaverbot,antigender,antimerkel,antisystem,antivegan,armenimport,asyl,asylindustrie,aufrecht,banislam,bedauerlich,bereicherung,bevormundung,bimbo,bluehand,dankeerikasteinbach,defendeurope,defendgermany,demokratur,denkverbot,deplorable,deraustausch,deutschfam,diktatur,dirigismus,ditib,drachenlord,dreck,einwanderung,einzelfall,einzelfallinfos,einzeltäter,endgov,entbrüsseln,erklärung2018,erziehungsmedien,eudssr,fakenews,fakerefugees,familiennachzug,fckislm,flintenuschi,flüchtlingsproblematik,flüchtlingswelle,freekolja,freilerner,frühsexualisierung,gabfam,gedankenpolizei,gefährder,gegenlinks,gegenzecken,geldsystemkritiker,"gender mainstreaming",gendergaga,genderismus,genderterror,gesinnungsterror,gleichgeschaltet,gleichschaltung,grueneversenken,gutmensch,gutmenschen,heimatbewusst,herrschaftsfrei,heterophob,hetzer,homolobby,ichbinpack,identitätspolitik,immigrationskritik,invasoren,invasorenwelle,islambeiuns,islamisierung,islamnixgut,jungefreiheit,kartellparteien,kartoffeldeutsch,kinderehe,kinderfickersekte,klartext,klimalüge,konservativ-freiheitlich,kopftuch,kopftuchverbot,koppverlag,kriegstreiber,krimigranten,kulturbereicherer,kulturtaliban,kuscheljustiz,köterrasse,landeshochverrat,linksextremismus,linksfaschismus,linksmaden,linksnicker,linksversifft,lügenpresse,lügner,machtelite,machtwechsel,maskulist,masseneinwanderung,maulkorb,mediendiktatur,meinungsdiktat,meinungsdiktatur,meinungsfreiheit,merkelei,merkelmussweg,merkelregime,mgga,migrassoren,migrationswaffe,minimalstaat,multikultitötet,mundtot,muslime,muslimisch,männerbeauftragter,männerrechtler,nafri,national-liberal,nationalkonservativ,nationalstolz,nazikeule,neger,neokonservativ,netzdg,nichtohnemeinkopftuch,opfer-abo,opferindustrie,paulanergarten,pckills,proborders,propaganda,propagandaschau,propolizei,quotenneger,realitätsverweigerer,rechtsstaat,redpill,refugeesnotwelcome,remigration,rückführungshelfer,scharia,scheinasylant,schleiereule,schuldkult,selbstabschaffung,selbstviktimiserung,sozial-libertär,sozialparadies,sozialschmarotzer,sozialsysteme,sozialtourist,sprachpolizei,staatsfernsehen,staatspresse,stasi,steuerstaat,stopasyl,stopislam,superstaat,systemgünstlinge,systemkonform,systemkritisch,systempresse,taxationistheft,terror,terroristen,teuro,thewestisbest,tichyseinblick,toleranzdiktatur,traudichdeutschland,tugendterror,tugendwächter,umerziehung,umvolkung,unbequem,unkontrolliert,untertanengeist,unterwerfung,vaterland,vaterländisch,verabschiedungskultur,verbotskultur,verbotspartei,verbrechen,verbrecher,verfassungspatriot,verhindern,verschwulung,voelkisch,volksbetrug,volksdeutsche,volksempfinden,volkspädagogik,volksthumsleugnung,volkstod,volksverräter,voluntarismus,völkisch,werteunion,wertkonservativ,widerlich,widerstand,wirtschaftsflüchtling,zensurland,zuwanderung,zuwanderungskritisch,zwangsgebühren'.toOR(), lang:'de'}},
	{name: 'rechts3',                       query: {q:'mischvölker,halbneger'.toOR(), lang:'de'}},
	{name: 'rechts4',                       query: {q:'staatsfunk,massenmigration,mischvolk,endlösung,überfremdung'.toOR(), lang:'de'}},
	{name: 'rechts5',                       query: {q:'afghane,afghanen,afghanisch,afghanistan,afrikaner,albaner,albanisch,araber,arabisch,arabische,asyl,asylbewerber,asylpolitik,asyltourist,asylurlauber,attacke,ausländer,ausländisch,ausländische,ausländischer,ausländischen,dankemerkel,einwanderer,einzelfall,ersticht,erstochen,flüchtling,flüchtlinge,flüchtlingsheim,hochzeitskorso,irak,iraker,islam,islamisch,islamische,islamisierung,kopftuch,krawall,krawalle,kriminalität,kuscheljustiz,körperverletzung,libyer,masseneinwanderung,merkel,messer,messermigrant,messermigranten,messermigration,messermord,migrant,migranten,migration,mord,muslim,muslima,muslime,muslimisch,muslimische,muslimischen,muslimischer,noislam,pakistan,pakistanisch,pistole,rumäne,rumänien,rumänisch,schlägerei,schusswaffe,schusswaffen,syrer,syrisch,syrische,syrischen,syrischer,südländer,südländisch,südländische,südländischen,südländischer,türke,türkei,türken,türkin,türkisch,umvolkung,verbrechen,vergewaltigen,vergewaltigt,vergewaltigung,vergewaltigungen'.toOR(), lang:'de'}},
	{name: 'reisewarnung',                  query: {q:'reisewarnung OR reisehinweis'}},
	{name: 'rezovideo',                     query: {q:'rezovideo,#rezo,@rezomusik,to:rezomusik,from:rezomusik,@cdu,to:cdu,from:cdu,amthor,amthorvideo,#cdu,www.youtube.com/watch?v=4Y1lZQsyuSQ,"Zerstörung der CDU"'.toOR()}},
	{name: 'rp19-hash2',                    query: {q:'#republica19 OR #republica'}},
	{name: 'rp20-hash',                     query: {q:'#rp20 OR #republica20 OR #republica'}},
	{name: 'rp21-hash',                     query: {q:'#rp21 OR #republica21 OR #republica'}},
	{name: 'rbg',                           query: {q:'rbg,roshhashanah,ruthbaderginsburg,ruthbaderginsberg,ginsburg,ginsberg,ripruthbaderginsburg,ripruthbaderginsberg,scotus,riprbg,rbgrip'.toOR()}},
	{name: 'sarrazin',                      query: {q:'sarrazin OR sarazin'}},
	{name: 'sawsanchebli',                  query: {q:'sawsanchebli'.toWildFromTo()}},
	{name: 'seebruecke',                    query: {q:'seebruecke OR seebrücke'}},
	{name: 'seehofer',                      query: {q:'seehofer OR #seehofer'}},
	{name: 'shitstormopfer1',               query: {q:'dunjahayali,janboehm,georgrestle,sawsanchebli,ebonyplusirony,fatma_morgana,igorpianist,sibelschick,hatinjuce'.toWildFromTo()}},
	{name: 'shooting3',                     query: {q:'santafehighschool OR santafe OR SantaFeShooting OR SantaFeSchoolShooting OR HoustonShooting'}},
	{name: 'sibelschick',                   query: {q:'sibelschick'.toWildFromTo()}},
	{name: 'skygo',                         query: {q:'skygo,SkySportDE,SkyDeutschland,DAZN_DE,SkyTicketDE,skyucl'.toWildFromTo()}},
	{name: 'spd',                           query: {q:'#spd'}},
	{name: 'stopgates',                     query: {q:'#closethegates,#stopgates,soros,#banbill,#soros,#wwg1wgaworldwide,#infowar,#wwg1gwa,@byoblu24,#byoblu24,#byoblu,@byoblu,#oann,@oann'.expand()}},
	{name: 'syria',                         query: {q:'syria'}},
	{name: 'talk_annewill',                 query: {q:'@annewill,@AnneWillTalk,‏#annewill,annewill,"anne will"'.expand()}},
	{name: 'talk_hartaberfair',             query: {q:'#hartaberfair,#Plasberg,"frank plasberg"'.expand()}},
	{name: 'talk_maischberger',             query: {q:'@maischberger,#maischberger,maischberger'.expand()}},
	{name: 'talk_markuslanz',               query: {q:'@ZDFMarkusLanz,"Markus Lanz",#lanz'.expand()}},
	{name: 'talk_maybritillner',            query: {q:'@maybritillner,#illner,#maybritillner,maybritillner,"maybrit illner"'.expand()}},
	{name: 'tempolimit',                    query: {q:'tempolimit OR #tempolimit'}},
	{name: 'tenderage',                     query: {q:'"tender age"'}},
	{name: 'thueringenmpwahl',              query: {q:'afd,afdp,akk,antifa,björn,bodoramelow,c_lindner,cdu,cdu_fraktion_th,cdu_thueringen,dammbruch,faschist,faschisten,fckfdp,fdp,fdp_thueringen,gnaden,hirte,höcke,kanzlerin,kemmerich,kemmerichruecktritt,kemmerichrücktritt,kemmerichs,kemmerichthl,kramp-karrenbauer,lindner,merkel,mikemohring,ministerpräsident,ministerpräsidentenwahl,mohring,mpwahl,neuwahl,niewieder,noafd,paktieren,paktiert,ramelow,rechtsextremen,rot-rot-grün,steigbügelhalter,tabubruch,thueringen,thueringenwahl,thüringen,thüringens,unfassbar,unverzeihlich,werteunion'.toOR()}},
	{name: 'toptweets_de_20',               query: {q:'lang:de min_retweets:20'}},
	{name: 'toptweets_de_50',               query: {q:'lang:de min_retweets:50'}},
	{name: 'toptweets_en_10k',              query: {q:'lang:en min_retweets:10000'}},
	{name: 'trudeaumustgo',                 query: {q:'trudeaumustgo OR #trudeaumustgo'}},
	{name: 'trump_mentions',                query: {q:'to:realdonaldtrump OR to:potus OR realdonaldtrump OR potus', splitTime:6}},
	{name: 'trump_tweets',                  query: {q:'from:realdonaldtrump OR from:potus'}},
	{name: 'ueberwachung',                  query: {q:'überwachungspaket OR staatstrojaner OR bundestrojaner OR ueberwachungspaket OR zib2 OR überwachung OR privatsphäre OR datenschutz OR sicherheit OR vds OR sicherheitspaket'}},
	{name: 'ukelection',                    query: {q:'GeneralElection2019,UKElection,GE2019'.toOR()}},
	{name: 'unionsstreit1',                 query: {q:'unionsstreit,seehofer,csu,asylstreit,merkel,afd,ultimatum,zuwanderung,groko'.toOR(), lang:'de'}},
	{name: 'unteilbar',                     query: {q:'unteilbar,unteilbar_,to:unteilbar_,from:unteilbar_'.toOR()}},
	{name: 'uploadfilter',                  query: {q:'uploadfilter,saveyourinternet,leistungsschutzrecht,deleteart13,censorshipmachine,axelvossmdep,from:axelvossmdep,to:axelvossmdep,fixcopyright'.toOR()}},
	{name: 'uselection2020_hashtags_1',     query: {q:'#1u,#2018midterms,#2020election,#2020elections,#absenteeballot,#activemeasures,#aksen,#alsen,#america,#americafirst,#american,#americans,#arsen,#azsen,#ballots,#beatexasvoter,#berniesanders,#biden,#biden2020,#bidenforprison,#bidenharris,#bidenharris2020,#bidenharris2020landslide,#bidenharris2020tosaveamerica,#bidenharrislandslide2020,#bidensamerica,#bidenstoplyin,#blue2020,#bluetsunami,#bluetsunami2018,#bluewave,#bluewave2018,#bluewave2020,#bluewavecoming2018,#bluewaveiscoming,#buildthewall,#bunkerboy,#casen,#cavotes,#ccot,#ccp,#cheatbymail,#clinton,#colinpowell,#congress,#corruptdemocrats,#cosen,#ctsen,#demcast,#demconvention,#demconvention2020,#demforce,#democrat,#democratic,#democraticconvention,#democraticconvention2020,#democraticnationalconvention,#democraticparty,#democrats,#democratsaredestroyingamerica,#democratshateamerica,#dems,#demsenate2020,#demswork4usa,#desen,#dnc,#dnc2020,#dncconvention,#dncconvention2020,#dobbs,#donaldtrump,#draintheswamp,#dumptrump,#dumptrump2020,#election,#election2018,#election2020,#election2020-nov-3,#election2024,#electioncommission,#electionday,#electionfraud,#elections,#elections2020,#electionseason,#electiontwitter,#extrememagashoutout,#fairelections,#fakenews,#fakepolls,#fakepresident,#fbr,#fbresistance,#fbrparty,#fighttovote,#flipitblue,#flsen,#fucktrump,#gasen,#geeksresist,#gop,#gopbetrayedamerica,#gotv,#govote,#greatawakening,#harris,#harrisbiden2020,#hillaryclinton,#hisen,#hunterbiden,#iasen,#idsen,#ilsen,#impeach45,#impeachtrump,#imwithher,#indivisible,#insen,#insidepolitics,#joebiden,#joebiden2020,#joebidenforpresident2020,#joebidenisapedo,#joebidenkamalaharris2020,#kag,#kag2018,#kag2020,#kamalaharris,#kamalaharrisvp,#kavanaugh,#keepitblue,#kssen,#kysen,#lasen,#leadership,#letherspeak,#maga,#maga2020,#mailboxes,#mailinballot,#mailinballots,#mailinvoterfraud,#mailinvoting,#makeamericagreatagain,#marxist,#masen,#maskup,#mdsen,#mesen,#michelleobama,#midterm,#midterm18,#midterm2018,#midterms,#midterms2018,#milesguo,#misen,#mnsen,#mosen,#mssen,#mtsen,#myvotematters,#ncsen,#ndsen,#nesen,#neverbiden,#nevertrump,#nhsen,#njsen,#nmsen,#notmypresident,#november2020,#nra,#nvsen,#ny24,#nysen,#ohsen,#oksen,#openthedebates,#orangecounty,#orsen,#paresists,#pasen,#patriots,#plaidshirtguy,#politics,#polls,#portland,#postalservice,#postoffice,#potus,#president,#presidentbiden,#presidential,#presidentialelection,#presidentialelection2020,#presidenttrump,#propaganda,#protectthevote,#realdonaldtrump,#reconnectthemailsortersnow,#redwave,#redwave2020,#redwaverising,#registertovote,#registertovote2020,#rememberinnovember,#replacepelosi,#republican,#republicans,#republicansforbiden,#resist,#resistance,#ridinwithbiden,#risen,#rnc2020,#savethepostalservice,#savethepostoffice,#scsen,#sdsen,#senate,#settleforbiden,#signofresistance,#sleepyjoe,#sleepyjoebiden,#socialismkills,#specialelection,#stayhometovote,#stevebannon,#streamtext,#strongertogether,#swingstates,#takeitback,#taxcuts,#tcot,#teambidenharris,#thanksgop,#thanksobama,#theatlantavoice,#thegreatawakening,#theresistance,#thursdaymotivation,#tnsen,#tradewar,#trump,#trump2020,#trump2020landslide,#trump2020nowmorethanever,#trumpcanceledamerica,#trumpcorruption,#trumpisanationaldisgrace,#trumpislosing,#trumpisnotwell,#trumpmeltdown,#trumprussia,#trumptrain,#trumpvirus,#txsen,#unrigthesystem,#us,#usa2020,#uspostalservice,#usps,#uspsprotests,#uspssabotage,#ussenate,#utpol,#utsen,#vasen,#vote,#vote2020,#votebidenharris2020,#votebidenharristosaveamerica,#voteblue,#voteblue2018,#voteblue2020,#voteblueforamerica,#votebluetoendthisnightmare,#votebluetosaveamerica,#votebluetosaveamerica2020,#votebold,#votebymail,#votebymail2020,#votebymailearly,#votedem,#voteearly,#votefordemocracy,#voteforher,#votegold,#votegold2020,#votegopout,#votehimout,#votelikeyourlifedependsonit,#votered,#votered2018,#votered2020,#voteredtosaveamerica,#voteredtosaveamerica2020,#voterepublican,#voterfraud,#voterid,#voters,#votersfirst,#votersuppression,#votersuppressionisreal,#votethemout,#votetrumpout,#votewhileyoustillcan,#voting,#votingmatters,#vtsen,#wakeupamerica,#walkaway,#walkawaycampaign,#walkawayfromdemocrats,#walkawayfromdemocrats2018,#wasen,#wethepeople,#winblue,#wisen,#wrwy,#wvsen,#wwg1wga,#wysen,#yeswecan,#yourvotematters'.expand()}},
	{name: 'uselection2020_accounts_1',     query: {q:'@gop,@housedemocrats,@housegop,@joebiden,@kamalaharris,@mike_pence,@realdonaldtrump,@senatedems,@senategop,@thedemocrats'.expand()}},
	{name: 'verschwoerung1',                query: {q:'billgatesisevil,clintonbodycount,clintoncrimefamily,clintonemails,coronahoax,covid1984,deepstate,frazzledrip,generalflynn,georgesorosriots,greatawakeningworldwide,inittogether,isaackappy,justiceiscoming,merkelgate,obamagate,obamagate,pedogate,pedowood,pizzagate,podestaemails,qanon,qanongermany,transitiontogreatness,unitednotdivided,wachtauf,wakeupworld,wearethenewsnow,wearetherevolution,weinerslaptop,weltfrieden,wwg1wga'.expand()}},
	{name: 'virologen',                     query: {q:'drosten,kekule,streeck,@c_drosten,@alexanderkekule,@hendrikstreeck'.expand()}},
	{name: 'volkmarsen',                    query: {q:'volkmarsen,menschenmenge,rosenmontag,rosenmontagsumzug,rosenmontagszug'.toOR()}},
	{name: 'wirvsvirushackathon',           query: {q:'wirvsvirus,#wirvsvirus,wirvsvirushackathon,#wirvsvirushackathon,from:wirvsvirushack,to:wirvsvirushack,wirvsvirushack,#wirvsvirushack,hackathon,#hackathon'.toOR()}},
];

var lists = [
	'AfD',
	'AfDkompakt',
	'gfd_grundgesetz',
	'wahl_beobachter',
	'bild',
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
		var minDate = (new Date((yesterday+i  )*86400000)).toISOString().substr(0,10);
		var maxDate = (new Date((yesterday+i+1)*86400000)).toISOString().substr(0,10);
		queries.forEach(entry => {
			var _entry = JSON.parse(JSON.stringify(entry));
			_entry.minDate = minDate;
			_entry.maxDate = maxDate;
			queue.push(cb => runScraper(_entry, cb))
		})
	}

	async.parallelLimit(
		queue,
		4,
		() => console.log(colors.green.bold('## FINISHED'))
	)
}


function runScraper(entry, cbScraper) {
	entry.query.minDateValue = Date.parse(entry.minDate);
	entry.query.maxDateValue = Date.parse(entry.maxDate);

	var name = entry.name;
	var title = '"'+name+' - '+entry.minDate+'"';
	
	var tempFilename = resolve(__dirname, '../../tmp', Math.random().toFixed(16).substr(2)+'.tmp.xz');
	var filename = resolve(__dirname, '/root/data/twitter/data_280/'+name+'/'+name+'_'+entry.minDate+'.jsonstream.xz');
	//var filename = resolve(__dirname, '../../data/twitter/data_280/'+name+'/'+name+'_'+entry.minDate+'.jsonstream.xz');

	// Does the file already exists
	if (fs.existsSync(filename)) {
		return queueMicrotask(cbScraper);
	} else {
		console.log(colors.grey('   Starting '+title));
	}

	var outputStream = new OutputStream(tempFilename, filename)

	function OutputStream(tempFilename, filename) {
		// Prepare Compressor
		var bufferStream = BufferStream(64*1024*1024);

		var T = entry.query.splitTime ? 4 : 1;

		var compressor = child_process.spawn('xz', ('-zkfc9 -T '+T+' -').split(' '));
		compressor = miss.duplex(compressor.stdin, compressor.stdout);

		var writeStream = fs.createWriteStream(tempFilename, {highWaterMark: 8*1024*1024});

		bufferStream.pipe(compressor).pipe(writeStream);


		// Make sure that the folder exists
		utils.ensureDir(filename);

		// flush data buffer to lzma compressor
		function flush(percent, cbFlush) {
			var buffer = Buffer.concat(tweets);
			tweets = [];
			tweetCount = 0;

			if (buffer.length === 0) return cbFlush();

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
				writeStream.on('finish', () => {
					console.log(colors.grey.bold('   closed '+title));
					if (!dry) {
						fs.copyFileSync(tempFilename, filename, fs.constants.COPYFILE_EXCL);
						fs.unlinkSync(tempFilename);
					}
					cbClose();
				})
				//console.log(colors.green('ending '+title));
				bufferStream.end();
			})
		}

		return {
			flush: flush,
			close: close,
		}
	}

	var tweets = [];
	var tweetCount = 0;
	var task = scraper.getSubTask();

	var queries = [entry.query];
	queries = [].concat.apply([], queries.map(splitQueryByLength));
	queries = [].concat.apply([], queries.map(splitQueryByTime));

	if (queries.length > 1) console.log(colors.grey('      '+queries.length+' queries'));

	queries.forEach(q => q.dateValue = q.maxDateValue);

	async.each(
		queries,
		scrape,
		() => {
			outputStream.close(cbScraper)
		}
	)

	function scrape(query, cbScrape) {
		var since_id = dateValue2Id(query.minDateValue);
		var max_id = dateValue2Id(query.maxDateValue);
		scrapeRec(max_id);

		function scrapeRec(max_id) {
			var attributes = {result_type:'recent', tweet_mode:'extended', count:100, since_id:since_id, max_id:max_id};
			Object.keys(query).forEach(key => {
				switch (key) {
					case 'q':
					case 'geocode':
					case 'lang':
						attributes[key] = query[key];
					break;
					case 'minDateValue':
					case 'maxDateValue':
					case 'dateValue':
					case 'splitTime':
					return
					default:
						throw Error('unknown key "'+key+'"')
				}
			})

			task.fetch(
				'search/tweets',
				attributes,
				result => {
					//console.log(result);
					if (!result.statuses || result.statuses.length === 0) return cbScrape();

					if (!dry) {
						tweets.push(Buffer.from(result.statuses.map(t => JSON.stringify(t)+'\n').join('')));
					}
					tweetCount += result.statuses.length;

					var minId = getTweetsMinId(result.statuses);
					var nextMaxId = decId(minId);
					query.dateValue = id2DateValue(minId);

					if (tweetCount < 2000) return checkRerun();

					var sum1 = queries.reduce((s,q) => s+(   q.dateValue - q.minDateValue || 0), 0);
					var sum2 = queries.reduce((s,q) => s+(q.maxDateValue - q.minDateValue || 0), 0);
					var percent = 1 - sum1/sum2;
					console.log(colors.grey('   flushing '+title+' - '+(100*percent).toFixed(1)+'%'))
					outputStream.flush(percent, checkRerun);

					function checkRerun() {
						if (isIdBiggerThan(nextMaxId, since_id)) {
							scrapeRec(nextMaxId);
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

function splitQueryByTime(query) {
	if (!query.splitTime || query.splitTime === 1) return [query]
	
	var minDateValue = query.minDateValue;
	var maxDateValue = query.maxDateValue;
	var duration = (maxDateValue - minDateValue)/query.splitTime;
	var newQueries = [];
	var queryString = JSON.stringify(query);

	for (var i = 0; i < query.splitTime; i++) {
		var newQuery = JSON.parse(queryString);
		newQuery.minDateValue = minDateValue+(i  )*duration;
		newQuery.maxDateValue = minDateValue+(i+1)*duration;
		newQueries.push(newQuery);
	}

	return newQueries;
}

function splitQueryByLength(query) {
	if (urlEncode(query.q).length < 500) return [query];

	var q = query.q.split(' OR ');
	var newQuery = q.shift();
	var newQueries = [];
	var queryString = JSON.stringify(query);

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
		var obj = JSON.parse(queryString);
		obj.q = q;
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
		bufferList.push(data);
		bufferSize += data.length;

		triggerRead();

		if (bufferSize < maxSize) return cb();
		cbsWrite.push(cb);
	}

	function flush(cb) {
		finished = true;
		triggerRead();
		cb();
	}

	function triggerRead() {
		while ((cbsRead.length > 0) && ((bufferList.length > 0) || finished)) {
			read(0, cbsRead.shift());
		}
	}

	function read(size, next) {
		if (bufferList.length > 0) {
			var chunk = bufferList.shift();
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
			cbsWrite.forEach(queueMicrotask);
			cbsWrite = [];
		}
	}

	return miss.duplex( miss.to(write, flush), miss.from(read) )
}

function dateValue2Id(date) {
	return (BigInt(date-1288834974657) << 22n).toString();
}

function id2DateValue(id) {
	return Number((BigInt(id) >> 22n)+1288834974657n);
}

function isIdBiggerThan(id1, id2) {
	return (id1.length === id2.length) ? (id1 > id2) : (id1.length > id2.length);
}

function getTweetsMinId(tweets) {
	var ids = tweets.map(t => BigInt(t.id_str));
	var minId = ids.pop();
	ids.forEach(id => {
		if (minId > id) minId = id;
	})
	return minId.toString();
}

function decId(id) {
	return (BigInt(id) - 1n).toString();
}
