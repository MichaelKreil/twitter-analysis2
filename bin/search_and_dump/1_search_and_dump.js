"use strict";

const dry = false;
const parallelLimit = 4;

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

String.prototype.urlList = function () {
	return this.split(',').map(a => 'url:'+a.trim()).join(' OR ')
}

String.prototype.expand = function () {
	let set = new Set();
	this.split(',').forEach(a => {
		a = a.trim().toLowerCase();
		if (a.length === 0) return;
		if (a[0] !== '@') return set.add(a)
		a = a.substr(1);
		set.add('from:'+a);
		set.add('to:'+a);
		set.add('url:twitter.com/'+a+'/status');
	});
	return Array.from(set.values()).join(' OR ');
}

// List of search queries
var queries = [
	{name: '120db',                         query: {q:'frauenmarsch,120db,b1702,dd1702,ndh1702,niun1702,niun,no120db'.toOR()}},
	{name: 'afd',                           query: {q:'#afd'}},
	{name: 'afd2',                          query: {q:'afd'}},
	{name: 'afghanistan1',                  query: {q:'afghanistan,kabul,kabulairport,afghanistanburning,taliban,afghan,afghans'.expand()}},
	{name: 'afghanistan2',                  query: {q:'afganistan,afganisthan,afghanisthan'.expand()}},
	{name: 'alicehasters',                  query: {q:'@alicehasters'.expand()}},
	{name: 'amadeuantonio2',                query: {q:'@amadeuantonio'.expand()}},
	{name: 'angst',                         query: {q:'furcht,fürchten,fürchte,befürchte,befürchten,angst,ängste,beängstigend,panik,sorge,sorgen,bedrohung,bedrohen,bedrohend,bedroht,bedrohlich,bedrohliche,bedrohlichen'.toOR()}},
	{name: 'antifa4',                       query: {q:'#antifa,antifa,anti-faschismus,anti-faschist,anti-faschisten,anti-faschistin,anti-faschistisch,anti-fascism,anti-fascismo,anti-fascist,anti-fascista,anti-fascists,antifaschismus,antifaschist,antifaschisten,antifaschistin,antifaschistisch,antifascism,antifascismo,antifascist,antifascista,antifascists,faschismus,faschist,faschisten,faschistin,faschistisch,fascism,fascismo,fascist,fascista,fascists,exposeantifa,exposeantifaterrorists,iamantifa,yotambiensoyterrorista,weareantifa,iamantifascist,ichbinantifa,americanpatriotsareantifa,weareallantifa'.expand()}},
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
	{name: 'bild2',                         query: {q:'dankebild'.expand()}},
	{name: 'black_in_ai',                   query: {q:'@black_in_ai'.expand()}},
	{name: 'brexit',                        query: {q:'#brexit'.expand()}},
	{name: 'brexit2',                       query: {q:'brexit,brexitdeal,brexit,theresa,borisjohnson,chlorinated,peoplesvotemarch,peoplesvote,corbyn,backstop,brexitshambles,nodeal,stopbrexit,borisjohnson,nigel_farage,meaningfulvote,farage,getbrexitdone,remainers'.toOR()}},
	{name: 'brinkmannlab',                  query: {q:'@brinkmannlab'.expand()}},
	{name: 'btw2',                          query: {q:'afdverhindern,baerbock,baerbockverhindern,btw,btw2021,btw21,bundestagswahl,bundestagswahl2021,bundestagswahl21,cdu,cducsu,chrupalla,csu,diegrünen,fdp,gruene,grünen,laschet,laschetverhindern,lindner,linke,niewiedercdu,niewiedercsu,scholz,spd,verbotsparteicdu,wahlprogramm,weidel'.expand()}},
	{name: 'btw3',                          query: {q:'gendernneindanke,gendernjabitte,gruenermist,gruenermist2021,braunermist,blauermist,laschetkneift'.expand()}},
	{name: 'btw4',                          query: {q:'btwahl2021,btwahl,wahl2021'.expand()}},
	{name: 'bundesregierung',               query: {q:'SilberhornMdB,Mi_Muentefering,RitaHaglKehl,SvenjaSchulze68,LambrechtMdB,katarinabarley,StSLindner,AdlerGunther,Thomas_Bareiss,AnjaKarliczek,AnetteKramme,MiRo_SPD,JochenFlasbarth,guenterkrings,MJaegerT,W_Schmidt_,peteraltmaier,LangeMdB,jensspahn,RegSprecher,DoroBaer,fuchtel,zierke,thomasgebhart,rischwasu,AndiScheuer,NielsAnnen,KerstinGriese,OlafScholz,ChristianHirte,meister_schafft,JuliaKloeckner,HeikoMaas,SteffenBilger,petertauber,FlorianPronold,HBraun,BoehningB,wanderwitz,hubertus_heil'.toWildFromTo()}},
	{name: 'bundesverdienstkreuz',          query: {q:'bundesverdienstkreuz'}},
	{name: 'bunkertrump',                   query: {q:'AmericaOrTrump,bunkerboy,cowardinchief,bunkertrump,bunkerdon,voteouthate,bunkerbabytrump,bunker'.toOR()}},
	{name: 'canceldisneyplus',              query: {q:'canceldisneyplus'.expand()}},
	{name: 'capitol',                       query: {q:'25amendmentnow,25thamendment,25thamendmentimmediately,25thamendmentnow,26thjanwithfarmers,amendment25,arrestdonaldtrump,arrestthemallnow,arresttrump,arresttrumpnow,capitalhill,#capitol,capitolbreach,capitolbreached,capitolbuilding,capitolhill,capitollockdown,capitolpolice,capitolriots,civilwar2021,#coup,coupattempt,dcprotests,dcriots,demvoice1,domesticterrorism,domesticterrorists,donaldtrump,#impeach,impeachment,impeachtrump,impeachtrumpagainnow,impeachtrumpnow,impeachtrumptonight,inaugurationday2021,invokethe25th,january6th,lockhimup,lockhimupnow,locktrumpup,magaiscancelled,magaterrorists,magathugs,removetrumpnow,resignnowtrump,riots2021,terroristtrump,traitortrump,trumpcoupattempt,trumpisanationalsecuritythreat,trumpresignnow,trumpthugs,twentyfifthamendmentnow,uscapitol,uscoupattempt,washingtondcprotest'.expand()}},
	{name: 'carrefour1',                    query: {q:'vidasnegrasimportam,carrefourassassino,blacklivesmatter,justicaporbeto,carrefour,carrefourracista,vidaspretasimportam,falasnegras,diadaconsciencianegra,consciencianegra,fogonosracistas,novembronegro,justiçaporbeto,memóriatemcor,boicotenacionalaocarrefour,racismo,diadaconsciêncianegra,justicaparabeto,boicotecarrefour,vidasnegras,historiasnegrasimportam'.expand()}},
	{name: 'ccc',                           query: {q:'rc3,36c3,37c3,38c3,39c3,40c3,41c3,42c3,43c3,44c3,45c3,46c3,47c3,48c3,49c3,50c3'.expand()}},
	{name: 'cdu2',                          query: {q:'cdu,@cdu'.expand()}},
	{name: 'christchurch',                  query: {q:'christchurch,#christchurch,#eggboy,#fraseranning,#hellobrother,#neuseeland,#newzealand,#newzealandshooting,#newzealandterroristattack,حادث_نيوزيلندا_الارهابي'.toOR()}},
	{name: 'climate',                       query: {q:'climate'}},
	{name: 'climate_fightfor1point5',       query: {q:'fightfor1point5,facetheclimateemergency,makeparisreal,parisagreement,parisgoesbrussels,togetherforourplanet'.expand()}},
	{name: 'climatestrike',                 query: {q:'#20eylüli̇klimgrevi,#actonclimate,#allefuersklima,#allefürsklima,#cambioclimatico,#cambioclimático,#climateactionnow,#climatechange,#climatecrisis,#climateemergency,#climatejustice,#climatejusticenow,#climatemarch,#climatemarchpakistan,#climatestrike,#climatestrikeke,#climatestrikes,#climatestrikethailand,#crisisclimatica,#extinctionrebellion,#fridayforfuture,#fridays4future,#fridaysforfurture,#fridaysforfuture,#fridaysforfutures,#globalclimatestrike,#globalclimatestrikes,#greennewdeal,#greveglobalpeloclima,#grevepourleclimat,#huelgamundialporelclima,#islamabadclimatemarch,#klimakabinett,#klimatstrejk,#marchepourleclimat,#schoolstrike4climate,#scientists4future,#scientistsforfuture,#strajkklimatyczny,#strike4climate,#viernesporelfuturo,#youthclimatestrike,#youthstrike4climate,#グローバル気候マーチ,from:gretathunberg,to:gretathunberg'.toOR()}},
	{name: 'corbynwasright',                query: {q:'corbynwasright'}},
	// sorry, habe corona falsch getippt, muss jetzt aber die id konstant weiter behalten
	{name: 'coronar_allesoeffnen',          query: {q:'allesoeffnen,allesöffnen'.toOR()}},
	{name: 'coronarvirus10',                query: {q:'vaccine,vaccination'.toOR()}},
	{name: 'coronarvirus6',                 query: {q:'coronadeutschland,#coronadeutschland,coronapanik,#coronapanik,#corona,corona,covidiot,#covidiot,#coronaoutbreak,#coronarvirus,#coronavirus,#coronavirusde,#coronavirusoutbreak,#covid,#covid19,#covid2019,#covid_19,#covidー19,#wuhan,#wuhancoronavirus,#wuhancoronovirus,#wuhanvirus,#โควิด19,coronarvirus,coronavirus,coronavirusde,coronavírus,covid,covid-19,covid19,covid2019,covid_19,covidー19,epidemic,pandemic,quarantine,quarantined,wuhan,xj621,โควิด19'.toOR(), splitTime:6}},
	{name: 'coronarvirus7',                 query: {q:'mutation'.toOR()}},
	{name: 'coronarvirus8',                 query: {q:'zerocovid'.toOR()}},
	{name: 'coronarvirus9',                 query: {q:'machtbueroszu,machtbüroszu,machtdiebueroszu,machtdiebüroszu,bueroszu,büroszu,diebueroszu,diebüroszu'.toOR()}},
	{name: 'covidatwork',                   query: {q:'covidatwork'.expand()}},
	{name: 'crybabytrump',                  query: {q:'crybabytrump'.expand()}},
	{name: 'csu2',                          query: {q:'csu,@csu'.expand()}},
	{name: 'dammbruch',                     query: {q:'dammbruch'.expand()}},
	{name: 'dankepolizei',                  query: {q:'dankepolizei'.expand()}},
	{name: 'dictaturesanitaire',            query: {q:'dictaturesanitaire'.expand()}},
	{name: 'dieletzteinstanz',              query: {q:'dieletzteinstanz,gottschalk,janine kunze,tom buhrow,jürgen milski'.expand()}},
	{name: 'donaldjtrump',                  query: {q:'url:donaldjtrump.com'.expand()}},
	{name: 'donalphonso',                   query: {q:'@_donalphonso'.expand()}},
	{name: 'dsgvo',                         query: {q:'#dsgvo,#dgsvo,#dataprotection,#cybersecurity,#gdpr,#datenschutz'.expand()}},
	{name: 'dunjahayali2',                  query: {q:'@dunjahayali'.expand()}},
	{name: 'elysee',                        query: {q:'@elysee'.expand()}},
	{name: 'emmanuelmacron2',               query: {q:'@emmanuelmacron'.expand()}},
	{name: 'emojitetra2',                   query: {q:'@emojitetra'.expand()}},
	{name: 'epstein',                       query: {q:'clintonbodycount,clintoncrimefamily,clintonsbodycount,epstein,epsteinblackbook,epsteincoverup,epsteingate,epsteinmurder,epsteinsuicide,epsteinsuicidecoverup,epsteinsuicided,epsteinunsealed,epstien,jefferyepstein,jeffreyepstein,trumpbodycount'.toOR()}},
	{name: 'eurovision',                    query: {q:'eurovision,eurovision2021,eurovisiesongfestival,esf21,esc21,dddesc'.expand()}},
	{name: 'euwahl1',                       query: {q:'#election,#ep,#euro,ek2019,elections2019,ep2019,eu2019,euelections,euelections2019,europa,europaparlament,europawahl,europawahl19,europawahl2019,europe,european,europeanparliament,europeennes2019,européennes,européennes2019,euw19,euwahl,futureofeurope,ps2019'.toOR()}},
	{name: 'fakenewssource2',               query: {q:'url:berliner-express.com OR url:truth24.net'}},
	{name: 'fakenewssource3',               query: {q:'16wmpo.com,100percentfedup.com,21stcenturywire.com,24newsflash.com,24wpn.com,247newsmedia.com,24online.news,24x365live.com,365usanews.com,4threvolutionarywar.wordpress.com,70news.wordpress.com,82.221.129.208,abcnewsgo.co,americanoverlook.com,ancient-code.com,anonjekloy.tk,americanpatriotdaily.com,aheadoftheherd.com,aanirfan.blogspot.co.uk,alternativemediasyndicate.com,americantoday.news,actualidadpanamericana.com,alt-market.com,aryannationswordwide1488.org,americablog.com,awazetribune.com,amposts.com,asamericanasapplepie.org,anonhq.com,amren.com,americasfreedomfighters.com,americanpoliticnews.co,associatedmediacoverage.com,armyusanews.com,americanflavor.news,americantoday.us,adobochronicles.com,anonews.co,americanpeoplenetwork.com,aceflashman.wordpress.com,awm.com,amtvmedia.com,antiwar.com,ammoland.com,activistpost.com,ahtribune.com,anonnews.co,automaticearth.com,asia-pacificresearch.com,acting-man.com,awdnews.com,abeldanger.net,anews24.org,americanborderpatrol.com,aurora-news.us,allnewspipeline.com,actforamerica.org,americanfreepress.net,abcnews.com.co,americannews.com,americanthinker.com,antoniusaquinas.wp.com,anotherdayintheempire.com,americankabuki.blogspot.com,a-news24.com,alabamaobserver.com,americanpresident.co,abriluno.com,abovetopsecret.com,adflegal.org,antinews.com,assassinationscience.com,americanreviewer.com,awarenessact.com,angrypatriotmovement.com,americanlookout.com,bvanews.com,bigbluevision.com,bloomberg.ma,bostonleader.com,bluevisionpost.com,breakingtop.world,bignuggetnews.com,blackinusrancenews.com,burrardstreetjournal.com,benjaminfulford.typepad.com,blackgenocide.org,blackagendareport.com,bigbluedimension.com,buzzfeedusa.com,bluevision.news,breakingnewsblast.com,bighairynews.com,bigamericannews.com,boilingfrogspost.com,brotherjohnf.com,breaking-cnn.com,breakpoint.org,bb4sp.com,breakingnews247.net,bizstandardnews.com,bostontribune.com,blog.veterantv.net,bullionbullscanada.com,beforeitsnews.com,barenakedislam.com,betootaadvocate.com,beehivebugle.com,borowitzreport.com,bients.com,breakingnews365.net,barnesreview.org,babylonbee.com,collectivelyconscious.net,canadafreepress.com,countdowntozerotime.com,conservativepaper.com,clashdaily.com,coed.com,cnnews3.com,celebtricity.com,centerforsecuritypolicy.org,conservativefrontline.com,cnsnews.com,counterpsyops.com,christianfightback.com,conservativerefocus.com,charismanews.com,conservativepapers.com,channel-7-news.com,cnnnext.com,conservativefighters.com,channel18news.com,cnn-trending.com,coffeebreakforyou.com,chronicle.su,crystalair.com,creambmp.com,callthecops.net,conspiracyplanet.com,cryptogon.com,conservativespirit.com,christwire.org,conservativefiringline.com,conservativestate.com,cbsnews.com.co,consciouslifenews.com,christiantimesnewspaper.com,clickhole.com,collective-evolution.com,cowgernation.com,cnn-business-news.ga,chaser.com.au,cnewsgo.com,conservativeoutfitters.com,cityworldnews.com,channel24news.com,cannasos.com,concisepolitics.com,conservapedia.com,conservativehq.com,conservativeinfocorner.com,conservativedailypost.com,christiantoday.info,citizensunited.org,creativitymovement.net,counterjihad.com,conservativebyte.com,checkoutthehealthyworld.com,conservative101.com,conservativetribune.com,countercurrentnews.com,coasttocoastam.com,conservativearmy88.com,civictribune.com,conservativeinfidel.com,conservativeflashnews.com,conspiracywire.com,cap-news.com,countynewsroom.info,corbettreport.com,conservativeview.info,dailyheadlines.net,dailynewsposts.info,dailysnark.com,davidduke.com,dcgazette.com,dutchsinse.com,diversitychronicle.wordpress.com,dataasylum.com,duffelblog.com,davidwolfe.com,dailysurge.com,derfmagazine.com,drrichswier.com,dandygoat.com,dailypoliticsusa.com,disclose.tv,dailycurrant.com,dailyusaupdate.com,dailyinfobox.com,democraticunderground.com,dailyfeed.news,dailynews5.com,donaldtrumppotus45.com,debunkingskeptics.com,dailythings.world,damnleaks.com,dailytelegraph.com.au,dailynews10.com,dailydiscord.com,dailysignal.com,democraticmoms.com,defenseusa.club,duffleblog.com,darkpolitricks.com,drudgereport.com.co,deadlyclear.wordpress.com,dailyheadlines.com,dineal.com,dailybuzzlive.com,ddemocraticunderground.com,denverinquirer.com,dont-tread-on.me,defenddemocracy.press,dcleaks.com,diyhours.net,der-postillon.com,dollarvigilante.com,dailynewsbin.com,dailysidnews.com,davejanda.com,downtrend.com,dailywire.com,dailystormer.com,donaldtrumpnews.co,departed.co,darkmoon.me,disclosuremedia.net,dailyoccupation.com,dailyleak.org,departedme.com,departedmedia.com,dailysquib.co.uk,denverguardian.com,dcclothesline.com,duhprogressive.com,dailyken.com,elelephantintheroom.blogspot.com,eyeopening.info,enabon.com,empiresports.co,endoftheamericandream.com,elmundotoday.com,empireherald.com,enhlive.com,enduringvision.com,electionnightgatekeepers.com,elkoshary.com,extraclubmagazine.com,expose1933.com,eutopia.buzz,express.co.uk,empirenews.net,expositiondaily.com,experimentalvaccines.org,embols.com,ewao.com,eutimes.net,ebolahoax.com,eaglerising.com,empirehearland.com,endtime.com,en-vovle.com,endingthefed.com,educate-yourself.org,en-volve.com,freedomsphoenix.com,fprnradio.com,foodbabe.com,flashnewscorner.com,freewoodpost.com,freepatriot.org,fedsalert.com,fridaymash.com,frontpagemag.com,fmobserver.com,freshdailyreport.com,firearmscoalition.org,fromthetrenchesworldreport.com,freedomoutpost.com,focusnews.info,farmwars.info,financialsurvivalnetwork.com,freedomforceinternational.com,federalisttribune.com,familysecuritymatters.org,floridasunpost.com,freedomjunkshun.com,fellowshipoftheminds.com,freedomsfinalstand.com,freedomcrossroads.us,fakingnews.com,forfreedomworld.com,fognews.ru,freedomworldnews.com,freakoutnation.com,fourwinds10.net,freebeacon.com,federalistpress.com,freeinfomedia.com,fox-news24.com,freedomdaily.com,greanvillepost.com,godlikeproductions.com,globalassociatednews.com,gummypost.com,greenmedinfo.com,goneleft.com,guerilla.news,galacticconnection.com,globalresearch.ca,gomerblog.com,globalrevolutionnetwork.com,geoengineeringwatch.org,gatesofvienna.net,givemeliberity01.com,glaringhypocrisy.com,govtslaves.info,globalpoliticsnow.com,gulagbound.com,guccifer2.wordpress.com,glossynews.com,gangstergovernment.com,gopthedailydose.com,gaia.com,givemeliberty01.com,healthycareandbeauty.com,hangthebankers.com,henrymakow.com,humortimes.com,holyobserver.com,heartland.org,horowitzfreedomcenter.org,humansarefree.com,houstonchronicle-tv.com,heresyblog.net,halfwaypost.com,healthy-holistic-living.com,huzlers.com,healthimpactnews.com,healthnutnews.com,healthyworldhouse.com,infowars.com,interestingthingsdaily.com,ifyouonlynews.com,isthatlegit.com,investmentwatchblog.com,intrendtoday.com,interestingdailynews.com,instaworldnews.com,informetoday.com,itaglive.com,in5d.com,intrepidreport.com,ilovemyfreedom.org,illuminati-news.com,iwanttoexplore.com,infiniteunknown.net,ironictimes.com,ihr.org,itccs.org,ihavethetruth.com,islamicanews.com,intellihub.com,informationclearinghouse.info,immediatesafety.org,itmakessenseblog.com,icr.org,investmentresearchdynamics.com,infostormer.com,johnnyrobish.com,jonesreport.com,jihadwatch.org,jamesrgrangerjr.com,jesus-is-savior.com,journal-neo.org,jewsnews.co.il,katehon.com,konkonsagh.biz,knowledgeoftoday.org,ky12news.com,kf13.com,kty24news.com,kmt11.com,krb7.com,kcst7.com,krbcnews.com,kbc14.com,libertyfederation.com,linkbeef.com,liberalbias.com,libertyvideos.org,landoverbaptist.org,libertytalk.fm,learnprogress.org,liberalplug.com,lifeprevention.com,liberaldarkness.com,loanpride.com,libertyalliance.com,lifeandabout.com,libertyblitzkrieg.com,lifenews.com,ladylibertysnews.com,local31news.com,libertynews.com,lushforlife.com,lastdeplorables.com,libertymovementradio.com,ladylibertynews.com,liberty-courier.com,liberalsociety.com,lewrockwell.com,libertywriters.com,libertyunyielding.com,liveactionnews.org,mzansiville.co.za,militianews.com,morningledger.com,msnbc.website,metropolitanworlds.com,madworldnews.com,mad-yet.blogspot.com,mpidailymagazine.com,megynkelly.us,moonofalabama.org,megafreshnews.com,makeamericagreattoday.com,majorthoughts.com,mediazone.news,magafeed.com,mentor2day.com,mississippiherald.com,myfreshnews.com,mrconservative.com,meanlefthook.com,morningnewsusa.com,mediafetcher.com,mediamass.net,madpatriots.com,molonlabemedia.com,maganews.co,myzonetoday.com,nationindistress.weebly.com,newzmagazine.com,newsbbc.net,nnn.is,newsformetoday.com,news-hound.org,nutritionalanarchy.com,nahadaily.com,nephef.com,nbc.com.co,newstoad.net,neonnettle.com,nationalreport.net,nomorefakenews.com,newsmax.com,nasamoonhoax.com,newsfeedhunter.com,nydailynews-tv.com,ncscooper.com,newsjustforyou1.blogspot.com,newsbiscuit.com,newsexaminer.net,newsmutiny.com,news4ktla.com,newspunch.com,newsbreakshere.com,newsbreakingspipe.com,newcenturytimes.com,newstarget.com,newsbreakers.org,newsdaily12.com,newsfrompolitics.com,newpoliticstoday.com,newsleak.co,newsbysquad.com,nunadisbereel.com,newsuptoday.com,notallowedto.com,naturalblaze.com,nationalinsiderpolitics.com,now8news.com,nnettle.com,northcrane.com,newsphd.com,newslo.com,npiamerica.org,nbcnews.com.co,newslogue.com,naturalnewsblogs.com,nevo.news,newsninja2012.com,nodisinfo.com,newsoftrump.com,nationalvanguard.org,newsbreakhere.com,nowtheendbegins.com,newyorker.com,newswithviews.com,newswatch28.com,nationonenews.com,newsbuzzdaily.com,newsmagazine.com,nationalufocenter.com,newsthump.com,newswire-24.com,naturalnews.com,nativestuff.us,newsconservative.com,newswatch33.com,oilgeopolitics.net,onlineconservativepress.com,openmindmagazine.com,ourlandofthefree.com,oathkeepers.org,orientalreview.org,onepoliticalplaza.com,offgridsurvival.com,opindia.com,oftwominds.com,off-guardian.org,observeronline.news,occupyliberals.com,openmagazines.com,objectiveministries.org,politicalsitenews.com,prisonplanet.tv,presstv.ir,patriotcrier.com,proudcons.com,patriotnewsdaily.com,patriotpost.us,politicsusanews.com,politicass.com,politicalblindspot.com,prntly.com,politicspaper.com,patriotchronicle.com,proudleader.com,politicalmayhem.news,pakalertpress.com,platosguns.com,politicops.com,puppetstringnews.com,pravda.ru,politicalears.com,patdollar.com,presstv.com,pamelageller.com,politicono.com,proamericanews.com,president45donaldtrump.com,politicot.com,progressivestoday.com,prepperwebsite.com,politicalcult.com,persecutes.com,projectveritas.com,patriotusa.website,patriotrising.com,pollhype.com,patriotupdate.com,politicalupdator.com,prisonplanet.com,politicalo.com,powerpoliticians.com,paulcraigroberts.org,palmerreport.com,pravdareport.com,politicsintheusa.com,qpolitical.com,revolutions2040.com,rickwells.us,rumorjournal.com,religionmind.com,rawforbeauty.com,redinfo.us,rhotv.com,rockcitytimes.com,realtruenews.com,redpolitics.us,rearfront.com,redcountry.us,realplanetnews.com,readconservatives.news,reagancoalition.com,reductress.com,rense.com,redflagnews.com,rogue-nation3.com,regated.com,redrocktribune.com,rightwingnews.com,redstatewatcher.com,rilenews.com,responsibletechnology.org,realnewsrightnow.com,russia-insider.com,returnofkings.com,religionlo.com,realtimepolitics.com,realfarmacy.com,rightalert.com,rumormillnews.com,react365.com,stneotscitizen.com,sputniknews.com,speld.nl,silverstealers.net,stuppid.com,silverbearcafe.com,silverdoctors.com,shareblue.com,sheepkillers.com,southernconservativeextra.com,sonsoflibertyradio.com,subjectpolitics.com,snoopack.com,superstation95.com,sjlendman.blogspot.com,success-street.com,supremepatriot.com,sportspickle.com,shoebat.com,sensationalisttimes.com,stormcloudsgathering.com,stgeorgegazette.com,sovereignman.com,sentinelblog.com,skeptiko.com,smag31.com,spinzon.com,states-tv.com,socialeverythings.com,satirewire.com,secretsofthefed.com,satiratribune.com,scrappleface.com,silver-coin-investor. com,surrealscoop.com,theexaminer.site,thetruthseeker.co.uk,therealshtick.com,teaparty.org,truthrevolt.org,therightists.com,themindunleashed.org,theextinctionprotocol.com,thegoldandoilguy.com,thewatchtowers.com,thelibertymill.com,thevalleyreport.com,tdtalliance.com,theusaconservative.com,themindunleashed.com,thetimesoftheworld.com,thehardtimes.net,thefreethoughtproject.com,the-insider.co,therightscoop.com,threepercenternation.com,thepremiumnews.com,theusa-news.com,theracketreport.com,thedailysheeple.com,truthfeed.com,thepeoplescube.com,thespoof.com,thepoke.co.uk,thepredicted.com,thebigriddle.com,themiamigazette.com,theamericanindependent.wordpress.com,the-postillon.com,thedailywtf.com,theinternetpost.net,thenewamerican.com,thetruthdivision.com,thenewyorkevening.com,trueamericans.me,truetrumpers.com,theduran.com,theshovel.com.au,theeventchronicle.com,therightstuff.biz,themoralofthestory.us,thetruthaboutcancer.com,the-global-news.com,thegatewaypundit.com,theineptowl.com,thenet24h.com,thewashingtonpress.com,times.com.mx,theskunk.org,themuslimissue.wordpress.com,thefederalistpapers.org,thelastgreatstand.com,thetrumpmedia.com,thereporterz.com,tmzworldnews.com,trumpvision365.com,theonion.com,therealstrategy.com,thenewsnerd.com,thebeaverton.com,theunrealtimes.com,truepundit.com,thebostontribune.com,thatviralfeed.net,teoinfo.com,thecommonsenseshow.com,thelibertybeacon.com,theeconomiccollapseblog.com,thestatelyharold.com,truthandaction.org,thefreepatriot.org,thecontroversialfiles.net,thenewsdoctors.com,theinformedamerican.net,theantimedia.org,thetruthwins.com,truthkings.com,theworldupdate.com,thelastlineofdefense.org,thephaser.com,truthbroadcastnetwork.com,truthfrequencyradio.com,topekasnews.com,theseattletribune.com,themideastbeast.com,thedailymash.co.uk,thirdestatenewsgroup.com,theforbiddenknowledge.com,theuspatriot.com,thepoliticalinsider.com,themadisonmisnomer.com,unz.com,usatoday.com.co,usanewsinsider.com,us.blastingnews.com,usaconservativereport.com,uconservative.net,unconfirmedsources.com,uspostman.com,usaonlinepolitics.com,usamagazinestudio.com,usanews4u.us,usasnich.com,universepolitics.com,usa2016elections.com,usainfobox.com,usatwentyfour.com,usanewsflash.com,usanewspolitics.com,uschronicle.com,usapoliticszone.com,usconservativetoday.com,ushealthylife.com,usaworldbox.com,usadailypost.us,usadailytime.com,usfanzone.com,unitedmediapublishing.com,usa-television.com,uspoliticslive.com,usatodaynews.me,usadailypolitics.com,usadailyinfo.com,usanewshome.com,usherald.com,usapolitics24hrs.com,uspoln.com,uspoliticsinfo.com,undergroundworldnews.com,usdefensewatch.com,usadailythings24.com,usasupreme.com,usaphase.com,usapoliticstoday.com,usa-radio.com,ustruthwire.com,usa360-tv.com,usafirstinformation.com,ushealthyadvisor.com,usawatchdog.com,usapoliticsnow.com,unclesamsmisguidedchildren.com,usadosenews.com,usinfonews.com,undergroundnewsreport.com,usanewstoday.com,ufoholic.com,usahitman.com,usviewer.com,voxtribune.com,viralliberty.com,vdare.com,veteranstoday.com,vigilantcitizen.com,veteransnewsnow.com,veteransfordonaldtrump.com,viralactions.com,weaselzippers.us,washingtonpost.com.co,whydontyoutrythis.com,westernjournalism.com,wearechange.org,wallstreetonparade.com,weshapelife.org,worldrumor.com,wy21news.com,wikileaks.com,worldnewspolitics.com,whatdoesitmean.com,washingtonsblog.com,weekendpoliticalnews.com,worldstoriestoday.com,wolfstreet.com,werk35.com,wundergroundmusic.com,williambanzai7.blogspot.com,wazanews.tk,wetheproudpatriots.com,wakingupwisconsin.com,winkprogress.com,worldtruth.tv,washingtonevening.com,whowhatwhy.com,worldnewsdailyreport.com,wonkie.com,whitepower.com,washingtonfed.com,washingtonfeed.com,wakingtimes.com,world.politics.com,waterfordwhispersnews.com,weconservative.com,winningdemocrats.com,wikileaks.org,witscience.org,weeklyworldnews.com,whatreallyhappened.com,wikispooks.com,worldpoliticsnow.com,worldnewscircle.com,webdaily.com,willyloman.wordpress.com,wrpm33.com,wakeupthesheep.com,wtoe5news.com,worldwidehealthy.com,wnd.com,westfieldpost.com,whowhatwhy.org,worldpoliticsus.com,x22report.com,youngcons.com,yourfunpage.com,yesimright.com,yournewswire.com,zerohedge.com,zootfeed.com,κβοι2.com,квоі2.com'.urlList()}},
	{name: 'floridashooting',               query: {q:'emmagonzalez OR floridahighschool OR floridaschoolshooting OR floridashooter OR floridashooting OR floridastrong OR guncontrol OR guncontrolnow OR gunlawsnow OR gunreformnow OR gunsafety OR gunsense OR gunshooting OR highschoolshooter OR march4ourlives OR marchforourlives OR massshooting OR massshootings OR neveragain OR nrabloodmoney OR parklandschoolshooting OR parklandshooting OR righttobeararms OR schoolshooting'}},
	{name: 'floridashooting2',              query: {q:'neveragain OR gunreformnow OR guncontrolnow OR guncontrol OR marchforourlives OR parkland OR parklandschoolshooting OR floridaschoolshooting OR parklandshooting OR #nra OR floridashooting OR nrabloodmoney OR banassaultweapons OR gunsense OR emmagonzalez OR schoolshooting OR parklandstudents OR parklandstudentsspeak OR gunviolence OR floridashooter OR wecallbs OR studentsstandup OR parklandstrong'}},
	{name: 'fridaysforfuture2',             query: {q:'fridaysforfuture,climatestrike,climatechange,climateaction,from:gretathunberg,to:gretathunberg,gretathunberg,klimastreik'.toOR()}},
	{name: 'gauland',                       query: {q:'#gauland,#gaulandpause'.expand()}},
	{name: 'gendern',                       query: {q:'gendern'}},
	{name: 'georgefloyd5',                  query: {q:'bluelivesmatter,bluelivesmatters,kpop,kpopdoesnotunderstandungaunga,kpopstans,opfancam,whitelivesmatter,whitelivesmatters,whitelivesmattertoo,whiteoutday,whiteouttuesday,whiteoutwednesday,black_lives_matter,blackhistorymonth,blacklivemattters,blacklivesmattter,blackoutday2020,blackouttuesday,dictatortrump,georgeflyod,trumpdictatorship,washingtondcprotest,whyididntreport,BLACK_LIVES_MATTERS,vidasnegrasimportam,protests2020,justiceforgeorgefloyd,georgefloyd,minneapolisriot,derekchauvin,georgefloydprotest,minneapolisprotests,chauvin,icantbreathe,justiceforgeorge,georgefloydmurder,justiceforfloyd,georgefloydwasmurdered,"george floyd"'.toOR(), splitTime:6}},
	{name: 'georgefloyd6',                  query: {q:'dcblackout,acab,adamatraore,alllivesmatters,americacontrump,antifaterrorists,backtheblue,black_live_matter,blacklivesmatteruk,blacklivesmattteruk,blackoutday,blackoutday2020,blackoutuesday,blacktranslivesmatter,blakelivesmatter,blm,blmprotest,blueline,breaking,breonnataylor,buildthewall,daviddorn,daviddornslifemattered,dcprotests,defundthepolice,desireebarnes,donaldtrump,fachaqueveofachaquefancameo,floyd,georgefloydprotests,giannafloyd,goergefloyd,haveafuckingplan,houstonprotest,icantbreath,iyannadior,junkterrorbillnow,justiceforahmaud,justiceforbreonnataylor,justicefordaviddorn,justicefordjevolve,justiceforgeorgesfloyd,justicepouradama,kag,kag2020,lashondaanderson,maga,maga2020,marktuan,minneapolis,nojusticenopeace,nyccurfew,nycprotests,palgharsadhulynching,paris,peacefulprotest,pmqs,policebrutality,policier,portlandprotest,protest,protest2020,protesters,racism,riots,riots2020,ripgeorgefloyd,sayhisname,saynotorapist,saytheirnames,seattleprotest,simply_kpop,stopracism,taketheknee,theshowmustbepaused,trump,trump2020,trumphasnoplan,trumpincitesviolence,trumpout2020,trumpresignnow,usaonfire,violencespolicieres,whitehouse,whitelivesmattter,whiteoutwednsday,womenfortrump'.toOR(), splitTime:6}},
	{name: 'georgefloyd7',                  query: {q:'FoxNewsisRacist,foxnews,BlackLivesMattters,cnnsesamestreet,sayhername,birthdayforbreonna,justiceforbreonna,justiceforblacklives,TrayvonMartin,AhmaudArbery,TamirRice,OscarGrant,EricGarner,PhilandoCastile,SamuelDubose,SandraBland,WalterScott,TerrenceCrutcher,RegisKorchinskiPaquet,TonyMcDade,QuaniceHayes,"Trayvon Martin","Breonna Taylor","Ahmaud Arbery","Tamir Rice","Oscar Grant","Eric Garner","Philando Castile","Samuel Dubose","Sandra Bland","Walter Scott","Terrence Crutcher","Regis Korchinski-Paquet","Tony McDade","Quanice Hayes",Normandy,DDay,DDay76'.toOR(), splitTime:4}},
	{name: 'georgefloyd8',                  query: {q:'calminkirkland,opfancam,alllivesmatter,thinblueline,womenfortrump,noracism'.expand()}},
	{name: 'giuliani',                      query: {q:'giuliani'}},
	{name: 'gretathunberg2',                query: {q:'greta thunberg,gretathunberg,@gretathunberg'.expand()}},
	{name: 'groko',                         query: {q:'#groko'.expand()}},
	{name: 'grossstaedte',                  query: {q:'berlin,hamburg,münchen,köln,frankfurt,stuttgart,düsseldorf,dortmund,essen,leipzig,bremen,dresden,hannover,nürnberg,duisburg,bochum,wuppertal,bielefeld,bonn,münster'.toOR()}},
	{name: 'hakenkreuz',                    query: {q:'hakenkreuz'}},
	{name: 'halle',                         query: {q:'halle,#halle0910,antisemitismus,#hal0910,#haltdiefresse,#yomkippur,einzeltäter,#natsanalyse,#christchurch,#merkel,rassismus,rechterterror,#halleshooting,#wirstehenzusammen,alarmzeichen,#yomkippour,rechtsterrorismus,#jomkippur,synagoge,synagogue,rechtsextremismus,antisemitisch,terroranschlag'.toOR()}},
	{name: 'haltdiefressebild',             query: {q:'haltdiefressebild'}},
	{name: 'haltdiefressejasmina',          query: {q:'haltdiefressejasmina'.expand()}},
	{name: 'hambacherforst',                query: {q:'aktionunterholz,braunkohle,braunkohleabbau,endcoal,endegelaende,hambach,hambacherforst,hambacherforstbleibt,hambacherwald,hambi,hambi_bleibt,hambibleibt,hambibleibtaktion,kohle,kohleausstieg,kohlekommission,rwe'.toOR()}},
	{name: 'hanau',                         query: {q:'hanau,rechterterror,hanaushooting,rechtsterrorismus,hanauattack,rechtsextremismus'.toOR()}},
	{name: 'heimat',                        query: {q:'heimat'}},
	{name: 'heinsberg',                     query: {q:'heinsberg,heinsbergstudie,heinsbergprotokoll,streeck,@hendrikstreeck,heinsberg-studie,storymachine,@hbergprotokoll,@mmronz'.expand()}},
	{name: 'homeoffice',                    query: {q:'homeoffice'}},
	{name: 'hongkong',                      query: {q:'#HongKong,#HongKongProtests,#StandwithHK,#antiELAB,#HongKongPolice,#StandWithHongKong,#FreeHongKong,#HongKongProtest,#hkpolice,#chinazi,#HongKongProtester,#香港,#LIHKG,#policebrutality,#HKPoliceTerrorism,#hkpolicebrutality,#hongkongpolicebrutality,#PoliceTerrorism,#HongKongPoliceTerrorism,#antiELABhk,#Shout4HK,#StandwithHonKong,#HongKongProtesters,#HongKongHumanRightsAndDemocracyAct,#Eye4HK,#HKprotests,#FightForFreedom,#HK,#HongKongers,#antichinazi,#hkprotest,#香港デモ,#PoliceBrutalitiy,#FreedomHK'.toOR()}},
	{name: 'impfen1',                       query: {q:'impfaktion,impfbereitschaft,impfdosen,impfen,impfertminvergabe,impfgegner,impfkampagne,impfmotivation,impfpflicht,impfquote,impfschutz,impfskepsis,impfskeptischen,impfskeptisch,impfskeptische,impfstart,impfstoff,impfstoffe,impfstoffen,impfstoffs,impft,impften,impftermin,impfterminvergabe,impfung,impfungen,impfzentren,impfzentrum,impfzwang'.expand()}},
	{name: 'inauguration2021',              query: {q:'@joebiden,@kamalaharris,biden,bidenharris,bidenharrisinauguration,harris,inaugural,inauguration,inauguration2021,inaugurationday,inaugurationday2021,joebiden,kamala,kamalaharris,presidentbiden,trumpslastday,vicepresidentharris'.expand()}},
	{name: 'infowars2',                     query: {q:'@infowars,@RealAlexJones'.expand()+' OR "alex jones"'}},
	{name: 'iranprotests',                  query: {q:'تظاهرات_سراسری,IranProtests'.expand()}},
	{name: 'iranprotests2',                 query: {q:'iranprotests,تظاهرات_سراسرى,مظاهرات_ايران,تظاهرات_سراسری,تظاهرات_سراسري'.expand()}},
	{name: 'iranprotests3',                 query: {q:',نه_به_اعدام,stopexecutionsiniran,اعدام_نکنید,notoexecusion,notoexecusioniran,stopexecutionofiranianprotestors,نه_به_اعدام_معترضان,دادگاه_علنی,iranianlivesmatter,بهبهان,اعدام_نكنيد,stopexecutionofiranianprotesters,اعتراضات_سراسری,notoexecutioniniran,stopexecutioniniran,stopexecutionslnlran,اعدامنکنید,آزاد_کنید,بهطالبانباجندهید,noexecutioniniran'.expand()}},
	{name: 'iranprotests4',                 query: {q:'@AlinejadMasih,MasihAlinejad,مسیح علی‌نژاد‎,ForcedHijab,حجاب'.expand()}},
	{name: 'israel',                        query: {q:'#israel'.expand()}},
	{name: 'jensspahn2',                    query: {q:'@jensspahn'.expand()}},
	{name: 'kippa',                         query: {q:'kippa', lang:'de'}},
	{name: 'knobloch',                      query: {q:'#knobloch'.expand()}},
	{name: 'ladg',                          query: {q:'ladg,landesantidiskriminierungsgesetz'.toOR()}},
	{name: 'lockdownjetzt',                 query: {q:'lockdownjetzt'.expand()}},
	{name: 'lufthansa',                     query: {q:'lufthansa,lufthansablue,explorethenew'.toOR()}},
	{name: 'luisamneubauer',                query: {q:'@luisamneubauer'.expand()}},
	{name: 'maassen',                       query: {q:'maassen,maaßen,verfassungsschutz,verfassungsschutzchef,vs-chef,vs-präsident,verfassung'.toOR()}},
	{name: 'maassen3',                      query: {q:'@HGMaassen'.expand()}},
	{name: 'maennerwelten',                 query: {q:'#maennerwelt,#maennerwelten,#männerwelt,#männerwelten,belästigen,belästigt,belästigung,belästigungen,dickpic,dickpics,dunkelziffer,fickbar,frauenhass,grabschen,missbrauch,schwanz,sexualisierte,sexuell,sexueller,vollgewichstes,würgen,übergriff,übergriffe'.expand()}},
	{name: 'media4',                        query: {q:'1011now.com,1011np.com,10news.com,10tv.com,11alive.com,12news.com,12newsnow.com,13abc.com,13newsnow.com,13wham.com,13wmaz.com,14news.com,15atv.com,26nbc.com,3newsnow.com,4029tv.com,41nbc.com,5newsonline.com,6abc.com,883wppb.org,88fm.org,8newsnow.com,9and10news.com,9news.com,aaas.org,aarp.org,abajournal.com,abc-7.com,abc.net.au,abc10.com,abc10up.com,abc11.com,abc12.com,abc13.com,abc15.com,abc17news.com,abc23.com,abc27.com,abc3340.com,abc4.com,abc45.com,abc57.com,abc6.com,abc6onyourside.com,abc7.com,abc7amarillo.com,abc7chicago.com,abc7news.com,abc7ny.com,abcactionnews.com,abccolumbia.com,abcfoxmontana.com,abcstlouis.com,abovethelaw.com,abqjournal.com,accuracy.org,aclj.org,aclu-co.org,aclu-de.org,aclu-ia.org,aclu-il.org,aclu-in.org,aclu-ky.org,aclu-md.org,aclu-mn.org,aclu-mo.org,aclu-ms.org,aclu-nh.org,aclu-nj.org,aclu-nm.org,aclu-or.org,aclu-pr.org,aclu-tn.org,aclu-wa.org,aclu-wi.org,aclu-wy.org,aclu.org,acluak.org,aclualabama.org,acluarkansas.org,acluaz.org,acluca.org,acluct.org,acludc.org,aclufl.org,acluga.org,acluhi.org,acluidaho.org,aclukansas.org,aclum.org,aclumaine.org,aclumich.org,aclumontana.org,aclunc.org,aclund.org,aclunebraska.org,aclunv.org,acluofnorthcarolina.org,acluohio.org,acluok.org,aclupa.org,aclusandiego.org,aclusc.org,aclusd.org,aclusocal.org,aclutx.org,acluutah.org,acluva.org,acluvt.org,acluwv.org,acslaw.org,actionnewsjax.com,actionnewsnow.com,adl.org,adn.com,advocate.com,aei.org,aflcio.org,afp.com,ainonline.com,ajc.com,ajot.com,al-monitor.com,al.com,alabamanews.net,alaskapublic.org,albanyherald.com,aldianews.com,aljazeera.com,ama-assn.org,americamagazine.org,americanbar.org,americanexperiment.org,americanoversight.org,americanprogress.org,americanstripe.com,americasvoice.org,amnestyusa.org,amny.com,annenbergpublicpolicycenter.org,anthropocenemagazine.org,ap.org,apnews.com,app.com,apr.org,apradio.org,argusleader.com,arkansasonline.com,arklatexhomepage.com,arktimes.com,armenianweekly.com,armytimes.com,arstechnica.com,asahi.com,asianjournal.com,aspeninstitute.org,aspenpublicradio.org,atimes.com,atlantaintownpaper.com,atlanticcouncil.org,atr.org,au.org,auburnpub.com,aurorasentinel.com,austinchronicle.com,austinmonitor.com,autonews.com,axios.com,azcapitoltimes.com,azcentral.com,azcir.org,azfamily.com,azpm.org,bakersfield.com,bakersfieldnow.com,ballotpedia.org,baltimorebrew.com,baltimoresun.com,bangordailynews.com,barstoolsports.com,battlecreekenquirer.com,bbc.co.uk,bbc.com,beaumontenterprise.com,beloitdailynews.com,benitolink.com,berkeleyside.com,bettergov.org,beyondchron.org,bigcountryhomepage.com,billingsgazette.com,billmoyers.com,billypenn.com,binghamtonhomepage.com,bipartisanpolicy.org,birminghamwatch.org,bismarcktribune.com,blackhillsfox.com,blazer911wvub.com,bleacherreport.com,bloomberg.com,bna.com,bnd.com,bnonews.com,boisestate.edu,boisestatepublicradio.org,boltposts.com,boston.com,bostonglobe.com,bostonherald.com,bostonmagazine.com,bostonreview.net,bozemandailychronicle.com,bradenton.com,bradycampaign.org,breitbart.com,brennancenter.org,bridgemi.com,broadcastingcable.com,brookings.edu,brownsvilleherald.com,brproud.com,buffalonews.com,burlingtonfreepress.com,businessinsider.com,buzzfeed.com,buzzfeednews.com,c-span.org,cagop.org,cair.com,calgaryherald.com,californiahealthline.org,caller.com,calmatters.org,canberratimes.com.au,capeandislands.org,capitalandmain.com,capitalgazette.com,capitolweekly.net,capradio.org,carolinapublicpress.org,cato.org,cbc.ca,cbpp.org,cbs12.com,cbs17.com,cbs19.tv,cbs19news.com,cbs2iowa.com,cbs42.com,cbs46.com,cbs4indy.com,cbs4local.com,cbs58.com,cbs6albany.com,cbs7.com,cbs8.com,cbsaustin.com,cbsdenver.com,cbslocal.com,cbsnews.com,cbssports.com,cbstv2vi.com,cdapress.com,ced.org,cenlanow.com,centerforpolitics.org,centralillinoisproud.com,centredaily.com,centurylink.net,cepr.net,cfr.org,chalkbeat.org,channel3000.com,channel4.com,charlotteobserver.com,chicagobusiness.com,chicagomag.com,chicagomaroon.com,chicagoreader.com,chicagoreporter.com,chicagotribune.com,christianpost.com,chron.com,chronicle.com,cincinnati.com,cis.org,citizen-times.com,citizen.org,citizensforethics.org,citizenvox.org,city-journal.org,citylab.com,citylimits.org,citypages.com,civilbeat.org,civileats.com,civilrights.org,cjonline.com,cjr.org,clarionledger.com,cleveland.com,cleveland19.com,clevescene.com,click2houston.com,clickondetroit.com,clickorlando.com,cm-life.com,cnbc.com,cnet.com,cnn.com,cnsnews.com,cnycentral.com,cnyhomepage.com,coastradio.org,coloradoan.com,coloradoindependent.com,colorlines.com,columbiatribune.com,commentarymagazine.com,commercialappeal.com,commondreams.org,commonwealthclub.org,commonwealthfund.org,commonwealthmagazine.org,conchovalleyhomepage.com,concordmonitor.com,conservativereview.com,consumerreports.org,cookpolitical.com,counterpunch.org,counton2.com,courant.com,courier-journal.com,courier-tribune.com,courierpress.com,courthousenews.com,cpbn.org,cpj.org,cpr.org,crfb.org,crooked.com,crosscut.com,crossroadstoday.com,csbaonline.org,csg.org,csis.org,csmonitor.com,ctmirror.org,ctpost.com,ctvnews.ca,currentaffairs.org,cvilletomorrow.org,dailybreeze.com,dailycal.org,dailycaller.com,dailycamera.com,dailycommercial.com,dailydot.com,dailyherald.com,dailyinterlake.com,dailykos.com,dailymail.co.uk,dailynews.com,dailypress.com,dailyprogress.com,dailyrecord.com,dailysignal.com,dailywire.com,dallasnews.com,dawn.com,dayton247now.com,daytondailynews.com,dccc.org,dcreport.org,deadspin.com,decaturdaily.com,defense.gov,defensenews.com,defenseone.com,delawareonline.com,delish.com,delmarvapublicradio.net,deltabroadcasting.org,democracyjournal.org,democracynow.org,democratandchronicle.com,democrats.org,demos.org,denverite.com,denverpost.com,deseretnews.com,desertsun.com,desmogblog.com,desmoinesregister.com,detroitnews.com,dfl.org,digboston.com,digitaltrends.com,diplomaticourier.com,directexpose.com,dispatch.com,dissentmagazine.org,dmagazine.com,dnainfo.com,dnj.com,dol.gov,dollarsandsense.org,dothaneagle.com,dothanfirst.com,doverpost.com,drudgereport.com,dukechronicle.com,duluthnewstribune.com,dw.com,e360hub.com,eastbayexpress.com,eastbaytimes.com,eastoregonian.com,easttexasmatters.com,econlib.org,economichardship.org,economist.com,ecori.org,ecowatch.com,ed.gov,edsource.org,eff.org,ekathimerini.com,elkodaily.com,elle.com,elnuevodia.com,elpais.com,emersonpolling.com,encyclopediageopolitica.com,energy.gov,energynews.us,engadget.com,enmnews.com,envirodatagov.org,eonline.com,epa.gov,epi.org,epic.org,equalvotes.us,erienewsnow.com,espn.com,esquire.com,euractiv.com,euronews.com,everythinglubbock.com,ew.com,ewg.org,express.co.uk,factcheck.org,fair.org,fairvote.org,fastcompany.com,fayobserver.com,fcir.org,fed-soc.org,federalnewsnetwork.com,federaltimes.com,fee.org,fff.org,ffrf.org,fifthdomain.com,finchannel.com,firstcoastnews.com,firstthings.com,fivethirtyeight.com,flatheadbeacon.com,floridatoday.com,foodsafetynews.com,forbes.com,foreignaffairs.com,foreignpolicy.com,foresthillstimes.com,fortune.com,forward.com,fosters.com,fourstateshomepage.com,fox10tv.com,fox11online.com,fox13memphis.com,fox13news.com,fox13now.com,fox14tv.com,fox15abilene.com,fox16.com,fox17.com,fox17online.com,fox19.com,fox21delmarva.com,fox21news.com,fox21online.com,fox23.com,fox23maine.com,fox25boston.com,fox26houston.com,fox26medford.com,fox28iowa.com,fox28media.com,fox29.com,fox2detroit.com,fox2now.com,fox32chicago.com,fox34.com,fox35orlando.com,fox38corpuschristi.com,fox40.com,fox42kptm.com,fox43.com,fox43tv.com,fox44news.com,fox45now.com,fox46charlotte.com,fox47.com,fox47news.com,fox4beaumont.com,fox4kc.com,fox4news.com,fox4now.com,fox50.com,fox56.com,fox59.com,fox5atlanta.com,fox5dc.com,fox5krbk.com,fox5ny.com,fox5sandiego.com,fox5vegas.com,fox61.com,fox6guam.com,fox6now.com,fox7austin.com,fox8.com,fox8live.com,fox8tv.com,fox9.com,foxbaltimore.com,foxbangor.com,foxbusiness.com,foxcarolina.com,foxcharleston.com,foxillinois.com,foxkansas.com,foxla.com,foxlexington.com,foxnebraska.com,foxnews.com,foxprovidence.com,foxreno.com,foxrichmond.com,foxrio2.com,foxrochester.com,foxsanantonio.com,foxsyracuse.com,foxwilmington.com,fpif.org,fpri.org,france24.com,fredericksburg.com,freebeacon.com,freedomhouse.org,freep.com,freespeech.org,fresnobee.com,frontpagemag.com,fusion.net,gadsdentimes.com,gainesville.com,gallup.com,gazette.com,gctelegram.com,georgiastatesignal.com,gizmodo.com,glamour.com,globalnews.ca,globalwitness.org,globegazette.com,gmfus.org,go.com,google.com,gop.com,goskagit.com,gothamist.com,goupstate.com,governing.com,govexec.com,govtrack.us,govtrackinsider.com,gp.org,gpb.org,gq.com,grandforksherald.com,gravismarketing.com,greatfallstribune.com,greenbaypressgazette.com,greensboro.com,greenvilleonline.com,grist.org,guampdn.com,guttmacher.org,gwinnettdailypost.com,gwu.edu,haaretz.com,hamodia.com,hani.co.kr,harpers.org,harvard.edu,harvardpolitics.com,hattiesburgamerican.com,hawaiinewsnow.com,hawaiipublicradio.org,hawaiitribune-herald.com,hbr.org,hcn.org,healthjournalism.org,heartland.org,heartlandnewsfeed.com,helenair.com,heraldnet.com,heraldonline.com,heraldscotland.com,heraldsun.com,heraldtribune.com,heritage.org,highlandscurrent.com,hollywoodreporter.com,hometownstations.com,hongkongfp.com,hoover.org,hopenothate.com,houstonchronicle.com,houstonpress.com,houstonpublicmedia.org,hppr.org,hrc.org,hrw.org,huffingtonpost.ca,huffingtonpost.com,huffpost.com,hutchnews.com,i24news.tv,iava.org,ibtimes.com,icij.org,idahonews.com,idahostatesman.com,ideastations.org,ieee.org,igmchicago.org,ijpr.org,ijr.com,illinoishomepage.net,inc.com,independent.co.uk,independent.ie,independentmail.com,indianapublicmedia.org,indianapublicradio.org,indiancountrymedianetwork.com,indiatimes.com,indystar.com,inewsource.org,informnny.com,inforum.com,inquirer.com,insideclimatenews.org,insideedition.com,insidehighered.com,insidesources.com,inthesetimes.com,investigatemidwest.org,investigativepost.org,investors.com,invw.org,iowapublicradio.org,iowawatch.org,ip-watch.org,ips-dc.org,ipsos.com,irishexaminer.com,irishtimes.com,itep.org,ithacajournal.com,itv.com,ivn.us,jacksonfreepress.com,jacksonsun.com,jacksonville.com,jacobinmag.com,jalopnik.com,jamaicaobserver.com,janes.com,japantimes.co.jp,japantoday.com,jconline.com,joins.com,journalgazette.net,journalnow.com,journalstar.com,jpost.com,jsonline.com,judicialwatch.org,jurist.org,justia.com,justice.gov,justiceonline.org,justsecurity.org,k2tv.com,kaaltv.com,kabc.com,kacu.org,kadn.com,kagstv.com,kait8.com,kake.com,kalb.com,kalw.org,kansas.com,kansascity.com,kansaspublicradio.org,kanw.com,kapptv.com,kare11.com,kark.com,kasu.org,katc.com,kath.tv,katu.com,katv.com,kawc.org,kaxe.org,kazu.org,kbaq.org,kbbgfm.org,kbbi.org,kbia.org,kbjr6.com,kbrw.org,kbsi23.com,kbtx.com,kbut.org,kcaw.org,kcba.com,kcbd.com,kcbx.org,kcci.com,kccu.org,kcentv.com,kchu.org,kclu.org,kcme.org,kcoy.com,kcra.com,kcrg.com,kcrw.com,kctv5.com,kcukradio.org,kcur.org,kcwy13.com,kdfc.com,kdlg.org,kdll.org,kdlt.com,kdminer.com,kdnk.org,kdrv.com,kdsm17.com,kdvr.com,kecytv.com,kedm.org,kedt.org,keloland.com,kens5.com,kentucky.com,kentuckytoday.com,kenvtv.com,kenw.org,keos.org,keprtv.com,kera.org,keranews.org,kesq.com,ket.org,ketr.org,ketv.com,kexp.org,keyc.com,keyt.com,kezi.com,kfbb.com,kfdm.com,kff.org,kfor.com,kfoxtv.com,kfsk.org,kfvs12.com,kfyrtv.com,kget.com,kglp.org,kglt.net,kgns.tv,kgou.org,kgpr.org,kgun9.com,kgvafm.com,kgw.com,khn.org,khns.org,khon2.com,khou.com,khq.com,khqa.com,khsu.org,kiem-tv.com,kiiitv.com,kimatv.com,kimt.com,king5.com,kion546.com,kios.org,kiro7.com,kitv.com,kivitv.com,kiyu.com,kjct8.com,kjnbtv.com,kjrh.com,kjzz.org,kktv.com,klax-tv.com,klcc.org,kldotv.com,klewtv.com,klfy.com,klkntv.com,kltv.com,kmaland.com,kmbc.com,kmhd.org,kmir.com,kmot.com,kmov.com,kmph-kfre.com,kmuw.org,kmvt.com,kmxt.org,knau.org,knba.org,knch.org,kndu.com,knoe.com,knopnews2.com,knoxnews.com,knpr.org,kntu.com,koaa.com,koamtv.com,koat.com,kob.com,kobi5.com,koco.com,kohd.com,koin.com,kold.com,kolotv.com,komonews.com,komu.com,kopn.org,koreaherald.com,koreatimes.co.kr,kosu.org,kotaku.com,kotatv.com,koto.org,kotz.org,kpax.com,kpbs.org,kpbx.org,kpcw.org,kplctv.com,kplr11.com,kprgfm.com,kptv.com,kpvi.com,kq2.com,kqcd.com,kqed.org,krbd.org,krcb.org,krcgtv.com,krcrtv.com,krdo.com,krem.com,krgv.com,kristv.com,kron4.com,krps.org,krqe.com,krtv.com,krvs.org,krwg.org,krza.org,ksat.com,ksbw.com,ksby.com,ksdk.com,ksfy.com,ksgu.org,kshb.com,ksjd.org,ksl.com,ksla.com,kslu.org,ksn.com,ksnblocal4.com,ksnt.com,kspr.com,kstk.org,kstp.com,ksut.org,kswo.com,kswt.com,ktar.com,ktbs.com,kten.com,ktep.org,ktiv.com,ktla.com,ktna.org,ktnv.com,ktoo.org,ktre.com,ktsm.com,ktsuradio.com,kttc.com,kttw.com,kttz.org,ktul.com,ktuu.com,ktva.com,ktvb.com,ktvh.com,ktvl.com,ktvn.com,ktvo.com,ktvq.com,ktvu.com,ktvz.com,ktxk.org,ktxs.com,kuac.org,kuaf.com,kuam.com,kuar.org,kucb.org,kuhbradio.org,kulr8.com,kumv.com,kunm.org,kunr.org,kunv.org,kuow.org,kurdistan24.net,kusc.org,kusi.com,kut.org,kutv.com,kuvo.org,kuyi.net,kval.com,kveo.com,kvewtv.com,kvia.com,kviqcbs17.com,kvlu.org,kvnf.org,kvoa.com,kvpr.org,kvrr.com,kvue.com,kwbu.org,kwch.com,kwit.org,kwqc.com,kwtx.com,kwwl.com,kxan.com,kxcv.org,kxgn.com,kxii.com,kxlf.com,kxly.com,kxnet.com,kxt.org,kxwt.org,kxxv.com,ky3.com,kycir.org,kyivpost.com,kyma.com,kyoutv.com,kyvtradio.com,kztv10.com,kzum.org,kzyx.org,laaclu.org,laindependent.com,lakeshorepublicmedia.org,lambdalegal.org,lansingstatejournal.com,laobserved.com,lasentinel.net,lasvegassun.com,latimes.com,latinousa.org,lawandcrime.com,laweekly.com,lawfareblog.com,lawnewz.com,lcsun-news.com,ledger-enquirer.com,lex18.com,lgbtqnation.com,lifehacker.com,littlevillagemag.com,live5news.com,liveleak.com,ljworld.com,lmtonline.com,local10.com,local12.com,local21news.com,localmemphis.com,localnews8.com,localsyr.com,lohud.com,longwarjournal.org,losangelesblade.com,loudountimes.com,lp.org,lprri.org,lpsentinel.com,macleans.ca,macon.com,madison.com,madison365.com,magicvalley.com,magnews.live,mainepublic.org,maplight.org,marfapublicradio.org,marist.edu,marketplace.org,marketprimenews.com,marketwatch.com,marylandmatters.org,marylandreporter.com,massincpolling.com,masslive.com,mcall.com,mcclatchydc.com,mdjonline.com,meduza.io,mercedsunstar.com,mercurynews.com,merionwest.com,metrotimes.com,mg.co.za,miamiherald.com,miaminewtimes.com,miamitodaynews.com,mic.com,michiganradio.org,mifox32.com,military.com,militarytimes.com,minnpost.com,mises.org,mississippitoday.org,missoulian.com,mit.edu,mlive.com,modbee.com,mondediplo.com,monmouth.edu,montgomeryadvertiser.com,monthlyreview.org,montrealgazette.com,morganton.com,morningconsult.com,motherjones.com,mpbn.net,mpbonline.org,mpr.org,mprnews.org,mrt.com,msmagazine.com,msn.com,msnbc.com,msnewsnow.com,mtpr.net,mtstandard.com,myajc.com,myarklamiss.com,mycbs4.com,mycentraljersey.com,mychamplainvalley.com,mydaytondailynews.com,myfox10tv.com,myfox11.com,myfox23.com,myfox28columbus.com,myfox47.com,myfox8.com,myfoxspokane.com,myfoxtricities.com,myfoxzone.com,myhighplains.com,mylaredofox.com,mynbc15.com,mynbc5.com,mynews4.com,mynspr.org,mypalmbeachpost.com,mypanhandle.com,myrtlebeachonline.com,mysanantonio.com,mystateline.com,mystatesman.com,mysuncoast.com,mytwintiers.com,mywabashvalley.com,naco.org,nantucketnpr.org,naplesnews.com,nasa.gov,nashuatelegraph.com,nashvillepublicradio.org,nationalaffairs.com,nationalgeographic.com,nationalinterest.org,nationalobserver.com,nationalpost.com,nationalreview.com,nativenews.net,nativenewsonline.net,nativesunnews.today,nature.com,navajotimes.com,nbc-2.com,nbc11news.com,nbc12.com,nbc15.com,nbc16.com,nbc24.com,nbc25news.com,nbc26.com,nbc29.com,nbc4i.com,nbcbayarea.com,nbcboston.com,nbcchicago.com,nbcconnecticut.com,nbcdfw.com,nbclosangeles.com,nbcmiami.com,nbcmontana.com,nbcneb.com,nbcnews.com,nbcnewyork.com,nbcphiladelphia.com,nbcrightnow.com,nbcsandiego.com,nbcsports.com,nbcwashington.com,nbcwiregrass.com,nber.org,ncai.org,ncpolicywatch.com,ncregister.com,ncsl.org,nebraska.tv,necir.org,necn.com,nejm.org,nepr.net,netnebraska.org,newamerica.org,newbernsj.com,newhavenindependent.org,newrepublic.com,newrightnetwork.com,news-herald.com,news-journalonline.com,news-leader.com,news-press.com,news10.com,news12.com,news3lv.com,news4jax.com,news4sanantonio.com,news5cleveland.com,news8000.com,news9.com,newscenter1.tv,newscentermaine.com,newschannel10.com,newschannel20.com,newschannel5.com,newschannel6now.com,newschannel9.com,newscientist.com,newsday.com,newsleader.com,newsmax.com,newsminer.com,newsobserver.com,newson6.com,newspressnow.com,newstatesman.com,newstimes.com,newsweek.com,newswest9.com,newyorker.com,nextcity.org,nextgov.com,nhbr.com,nhonews.com,nhpr.org,nhregister.com,niagara-gazette.com,nickiswift.com,niemanlab.org,nj.com,njpublicradio.org,njspotlight.com,njtoday.net,nlc.org,nmindepth.com,nola.com,northcountrypublicradio.org,northernpublicradio.org,northjersey.com,nplusonemag.com,npr.org,nprillinois.org,nraila.org,nrcc.org,nrsc.org,nrtoday.com,nst.com.my,nv1.org,nwahomepage.com,nwaonline.com,nwitimes.com,nwlc.org,nwpr.org,ny1.com,nybooks.com,nyclu.org,nydailynews.com,nymag.com,nypost.com,nystateofpolitics.com,nysun.com,nytimes.com,oann.com,oberlinreview.org,observer.com,ocregister.com,ohio.com,okcfox.com,oklahoman.com,oklahomawatch.org,omaha.com,onewisconsinnow.org,opb.org,opensecrets.org,oregonlive.com,oregonsfox.com,orlandosentinel.com,ottawacitizen.com,ourfuture.org,ourquadcities.com,out.com,outsideonline.com,ozarksfirst.com,pahomepage.com,palmbeachpost.com,pasquines.us,passblue.com,patch.com,pbs.org,pcmag.com,pe.com,pennlive.com,people-press.org,people.com,peoplespolicyproject.org,peoplesworld.org,peoriapublicradio.org,pewglobal.org,pewresearch.org,pewtrusts.org,pfaw.org,pgpf.org,philasun.com,phillytrib.com,phillyvoice.com,phoenixnewtimes.com,pikecountycourier.com,pilotonline.com,pinknews.co.uk,pitchfork.com,pix11.com,plannedparenthood.org,pnj.com,pogo.org,politicalresearch.org,politico.com,politico.eu,politifact.com,popsugar.com,popularmechanics.com,portlandtribune.com,pos.org,post-gazette.com,postandcourier.com,postbulletin.com,poststar.com,poughkeepsiejournal.com,poynter.org,prairiepublic.org,press-citizen.com,pressdemocrat.com,pressherald.com,pressofatlanticcity.com,pri.org,pridepublishinggroup.com,princeton.edu,progressive.org,project-syndicate.org,propublica.org,prospect.org,prospectmagazine.co.uk,providencejournal.com,prri.org,prwatch.org,prx.org,psmag.com,psychologytoday.com,publicagenda.org,publicintegrity.org,publicpolicypolling.com,publicradioeast.org,publicsource.org,q13fox.com,qctimes.com,qu.edu,queenseagle.com,qz.com,rabble.ca,radioiowa.com,radioiq.org,radiomilwaukee.org,rand.org,rapidcityjournal.com,rare.us,rasmussenreports.com,rawstory.com,readfrontier.org,realclearpolitics.com,reason.com,recode.net,redding.com,redriverradio.org,religiondispatches.org,religionnews.com,reporternews.com,represent.us,restoreaccountability.com,reuters.com,reuters.tv,revealnews.org,reviewjournal.com,rgj.com,riaclu.org,richmond.com,rightwingwatch.org,ripr.org,riverfronttimes.com,roanoke.com,rochesterfirst.com,rocketcitynow.com,rockthevote.org,rollcall.com,rollingstone.com,ronpaulinstitute.org,rooseveltinstitute.org,rootsradio.com,rrstar.com,rte.ie,rutherford.org,sacbee.com,sacurrent.com,salon.com,sandiegouniontribune.com,sanluisobispo.com,santacruzsentinel.com,santafenewmexican.com,sbs.com.au,sbsun.com,scientificamerican.com,scmp.com,scotusblog.com,scpr.org,scpublicradio.org,sctimes.com,sdpb.org,seattlepi.com,seattletimes.com,seekingalpha.com,sentencingproject.org,sentinelsource.com,sevendaysvt.com,sfchronicle.com,sfexaminer.com,sfgate.com,shorensteincenter.org,shreveporttimes.com,si.com,sightline.org,silive.com,siouxlandnews.com,siouxlandproud.com,sj-r.com,sky.com,slate.com,sltrib.com,smh.com.au,smithsonianmag.com,snopes.com,socialistworker.org,sojo.net,southbendtribune.com,southcarolinapublicradio.org,space.com,spacenews.com,spectator.co.uk,spectator.org,spectator.us,spiegel.de,splcenter.org,spokesman.com,stanforddaily.com,star-telegram.com,staradvertiser.com,starcitybroadcasting.com,startribune.com,state.gov,statepress.com,statesman.com,statesmanjournal.com,statnews.com,stlouisfed.org,stlpublicradio.org,stltoday.com,stormlake.com,straitstimes.com,streetsblog.org,stripes.com,sun-sentinel.com,sunherald.com,sunjournal.com,sunlightfoundation.com,suntimes.com,surveyusa.com,swtimes.com,syracuse.com,tabletmag.com,talkingpointsmemo.com,tallahassee.com,tampabay.com,tarbell.org,taxfoundation.org,taxpolicycenter.org,tbo.com,tcf.org,tcpalm.com,techcrunch.com,techdirt.com,techonomy.com,teenvogue.com,telegram.com,telegraph.co.uk,tennessean.com,texasmonthly.com,texasobserver.org,texastribune.org,texomashomepage.com,the-american-interest.com,the-japan-news.com,the1a.org,theadvertiser.com,theadvocate.com,theage.com.au,theamericanconservative.com,theatlantavoice.com,theatlantic.com,thebaffler.com,thebalance.com,thebaycitybeacon.com,theblaze.com,thebulletin.org,thebulwark.com,thebureauinvestigates.com,thecalifornian.com,thecannabist.co,thechive.com,thecipherbrief.com,theconversation.com,thecut.com,thedailybeast.com,thedenverchannel.com,thediplomat.com,thedp.com,thefederalist.com,thefiscaltimes.com,thegavoice.com,thegazette.com,theglobeandmail.com,theguardian.com,thehill.com,thehumanist.com,theindychannel.com,theintelligencer.net,theintercept.com,thelensnola.org,themarshallproject.org,themoscowproject.org,themoscowtimes.com,thenation.com,thenevadaindependent.com,thenewamerican.com,thenewscenter.tv,thenewsstar.com,thenewstribune.com,thenotebook.org,theoaklandpress.com,theolympian.com,theonion.com,theoutline.com,thepublicdiscourse.com,therealnews.com,theregister.co.uk,therepublic.com,theroot.com,thescotsman.com,thespectrum.com,thestar.com,thestarpress.com,thestate.com,thestranger.com,thesunchronicle.com,thetimesnews.com,thetowntalk.com,thetrace.org,theverge.com,theweek.com,theworldin.com,thinkprogress.org,thisamericanlife.org,thv11.com,time.com,timesfreepress.com,timesofsandiego.com,timesunion.com,tmj4.com,tmz.com,today.com,toledoblade.com,tomdispatch.com,tomsguide.com,tomshardware.com,topix.com,torontosun.com,townandcountrymag.com,townhall.com,transparency.org,transportation.gov,trib.com,triblive.com,tribtalk.org,tristatehomepage.com,troypublicradio.org,truth-out.org,truthdig.com,tspr.org,tucson.com,tucsonsentinel.com,tufts.edu,tulsaworld.com,turnto10.com,turnto23.com,tuscaloosanews.com,twincities.com,typepad.com,ucsusa.org,undark.org,unesco.org,unfspinnaker.com,unh.edu,unionleader.com,univision.com,unwatch.org,upi.com,upmatters.com,upnorthlive.com,uppermichiganssource.com,upr.org,urban.org,usacanadanews.com,usafmc.org,usathrill.com,usatoday.com,usbreakingnews.net,uschamber.com,usmagazine.com,usnews.com,usnewsbox.com,usni.org,valleycentral.com,valleynewslive.com,vancouversun.com,vanityfair.com,variety.com,vcstar.com,vice.com,vidaenelvalle.com,villagevoice.com,viral199.us,voanews.com,vocalo.org,vogue.com,vox.com,vpap.org,vpr.net,vtdigger.org,waaytv.com,wabe.org,wabi.tv,wach.com,wacotrib.com,wafb.com,waff.com,wagmtv.com,walb.com,wamc.org,wamu.org,wandtv.com,wane.com,waow.com,wapt.com,warontherocks.com,washingtonblade.com,washingtonexaminer.com,washingtonian.com,washingtonmonthly.com,washingtonpost.com,washingtontimes.com,watchfox29.com,wate.com,waus.org,wausaupilotandreview.com,wave3.com,wavy.com,wbaa.org,wbal.com,wbaltv.com,wbay.com,wbbjtv.com,wbez.org,wbfo.org,wbgo.org,wbhm.org,wbir.com,wbkb11.com,wbko.com,wbng.com,wboc.com,wboi.org,wboy.com,wbrc.com,wbrh.org,wbrz.com,wbtv.com,wbtw.com,wbur.org,wcax.com,wcbe.org,wcbi.com,wchstv.com,wcjb.com,wclk.com,wcmu.org,wcnc.com,wcov.com,wcpn.org,wcpo.com,wcqs.org,wcsufm.org,wcti12.com,wctv.tv,wcvb.com,wcwp.org,wcyb.com,wdam.com,wdav.org,wday.com,wdaz.com,wdbj7.com,wdcb.org,wdde.org,wdef.com,wdet.org,wdio.com,wdiy.org,wdna.org,wdrb.com,wdsu.com,wdtn.com,wdtv.com,wearecentralpa.com,wearegreenbay.com,weareiowa.com,weartv.com,weau.com,webcenter11.com,wecsradio.com,wect.com,week.com,weeklystandard.com,weforum.org,weku.fm,wemu.org,weny.com,weos.org,wesa.fm,wesh.com,wesm913.org,westernmassnews.com,westernslopenow.com,westhawaiitoday.com,westword.com,wesufm.org,wets.org,wevv.com,wfaa.com,wfae.org,wfdd.org,wfft.com,wfit.org,wfla.com,wflx.com,wfmj.com,wfmynews2.com,wfmz.com,wfpk.org,wfsb.com,wfsu.org,wftv.com,wfuv.org,wfwm.org,wfxb.com,wfxg.com,wfxl.com,wfxrtv.com,wfyi.org,wgal.com,wgbctv.com,wgbh.org,wgcu.org,wgem.com,wglt.org,wgme.com,wgno.com,wgnradio.com,wgntv.com,wgrz.com,wgtd.org,wguc.org,wgvunews.org,wgxa.tv,whas11.com,whdh.com,whec.com,whil.org,whio.com,whitehouse.gov,whiznews.com,whnt.com,whotv.com,whowhatwhy.org,whqr.org,whsv.com,whtc.com,whyy.org,wibw.com,wickedlocal.com,wicn.org,wicz.com,wifr.com,wilsoncenter.org,wilsontimes.com,wilx.com,winknews.com,wiproud.com,wired.com,wisn.com,wistv.com,witf.org,witn.com,wivb.com,wjab.org,wjactv.com,wjbf.com,wjcl.com,wjct.org,wjfw.com,wjhg.com,wjhl.com,wjla.com,wjsu.org,wjtv.com,wkar.org,wkbn.com,wkbw.com,wkgc.org,wkms.org,wknofm.org,wkow.com,wkrg.com,wkrn.com,wksu.org,wktv.com,wkyc.com,wkyt.com,wkyufm.org,wlfi.com,wlky.com,wlns.com,wlos.com,wlov.com,wlox.com,wlrh.org,wlrn.org,wlsam.com,wltx.com,wltz.com,wlwt.com,wmar2news.com,wmbfnews.com,wmcactionnews5.com,wmdt.com,wmfe.org,wmht.org,wmky.org,wmlu.org,wmnf.org,wmra.org,wmtw.com,wmub.org,wmuk.org,wmur.com,wnbjtv.com,wnct.com,wncu.org,wncw.org,wndu.com,wned.org,wnem.com,wnep.com,wng.org,wnin.org,wnky.com,wnmufm.org,wnyc.org,wnyt.com,woay.com,wogx.com,wojb.org,woodtv.com,worldtruth.tv,wosu.org,wotv4women.com,woub.org,wowktv.com,wowt.com,wpbf.com,wpde.com,wpgh53.com,wpr.org,wpri.com,wprl.org,wpsdlocal6.com,wpsu.org,wpta21.com,wptv.com,wpxi.com,wqad.com,wqcs.org,wqed.org,wqln.org,wqow.com,wral.com,wrbl.com,wrc.fm,wrcbtv.com,wrdetv.com,wrdw.com,wreg.com,wrex.com,wric.com,wrkf.org,wrko.com,wrti.org,wrtu.pr,wrvo.fm,wrvo.org,wsav.com,wsaw.com,wsaz.com,wsbt.com,wsbtv.com,wset.com,wsfa.com,wshu.org,wsiltv.com,wsiu.org,wsj.com,wsjptv.com,wskg.org,wsls.com,wsmc.org,wsmh.com,wsmv.com,wsncradio.org,wsoctv.com,wspa.com,wsvh.org,wsvn.com,wsws.org,wtae.com,wthitv.com,wthr.com,wtip.org,wtjx.org,wtkr.com,wtnh.com,wtnzfox43.com,wtoc.com,wtok.com,wtol.com,wtop.com,wtov9.com,wtrf.com,wtsp.com,wttw.com,wtva.com,wtvm.com,wtvq.com,wtvr.com,wtvy.com,wtwc40.com,wtxl.com,wucf.org,wuft.org,wuga.org,wuky.org,wumb.org,wunc.org,wuot.org,wurc.org,wusa9.com,wusf.org,wutc.org,wutv29.com,wuwf.org,wuwm.com,wvah.com,wvasfm.org,wvgazettemail.com,wvgn.com,wvia.org,wvik.org,wvlt.tv,wvmetronews.com,wvnstv.com,wvof.org,wvpe.org,wvpublic.org,wvtf.org,wvtm13.com,wvva.com,wwaytv3.com,wweek.com,wwlp.com,wwltv.com,wwmt.com,wwno.org,wwnytv.com,wxii12.com,wxow.com,wxpr.org,wxtx.com,wxxi.org,wxxv25.com,wxyz.com,wyep.org,wyff4.com,wymt.com,wyomingnewsnow.tv,wyomingpublicmedia.org,wyomingpublicradio.net,wypr.org,wyso.org,wysu.org,wytv.com,wzzm13.com,xpn.org,yahoo.com,yale.edu,yalelawjournal.org,ydr.com,yellowstonepublicradio.org,yesmagazine.org,yonhapnews.co.kr,yorkdispatch.com,yougov.com,youralaskalink.com,yourbasin.com,yourbigsky.com,yourcentralvalley.com,yourdeltanews.com,yourerie.com,ypradio.org,zdnet.com,zeit.de,zerohedge.com,zogbyanalytics.com'.urlList()}},
	{name: 'media4_20min',                  query: {q:'url:20min.ch,@20min'.expand()}},
	{name: 'media4_achgut',                 query: {q:'url:achgut.com,@Achgut_com'.expand()}},
	{name: 'media4_bild',                   query: {q:'url:bild.de,@BILD,@BILD_Auto,@BILD_Bayern,@BILD_Berlin,@BILD_Blaulicht,@BILD_Bochum,@BILD_Bremen,@BILD_Chemnitz,@BILD_Digital,@BILD_Dresden,@BILD_Frankfurt,@bild_freiburg,@bild_fuerth,@BILD_Hamburg,@BILD_Hannover,@bild_ingolstadt,@BILD_kaempft,@BILD_Koeln,@BILD_Lautern,@BILD_Leipzig,@BILD_Lifestyle,@BILD_Muenchen,@BILD_News,@BILD_Nuernberg,@BILD_Politik,@BILD_Promis,@BILD_Reporter,@BILD_Ruhrgebiet,@BILD_Saarland,@BILD_Sport,@BILD_Stuttgart,@BILD_TopNews,@BILD_Wolfsburg,@BILDamSONNTAG,@BILDDuesseldorf,@BILDhilft,@BILDthueringen'.expand()}},
	{name: 'media4_blick_ch',               query: {q:'url:blick.ch,@Blickch'.expand()}},
	{name: 'media4_bloomberg',              query: {q:'@bloomberg,url:bloomberg.com'.expand()}},
	{name: 'media4_br24',                   query: {q:'url:br24.de,@BR24'.expand()}},
	{name: 'media4_breitbartnews',          query: {q:'@breitbartnews,url:breitbart.com'.expand()}},
	{name: 'media4_cicero',                 query: {q:'url:cicero.de,@cicero_online'.expand()}},
	{name: 'media4_cnn',                    query: {q:'@cnn,url:cnn.it,url:cnn.com'.expand()}},
	{name: 'media4_de_kurier',              query: {q:'url:deutschland?kurier.org,@de_kurier'.expand()}},
	{name: 'media4_derstandard',            query: {q:'url:derstandard.at,@derStandardat,@PolitikStandard'.expand()}},
	{name: 'media4_dpa',                    query: {q:'@dpa'.expand()}},
	{name: 'media4_dwn',                    query: {q:'url:deutsche?wirtschafts?nachrichten.de'.expand()}},
	{name: 'media4_epochtimes_cn',          query: {q:'@dajiyuan,url:epochtimes.com'.expand()}},
	{name: 'media4_epochtimes_de',          query: {q:'url:epochtimes.de,@EpochTimesDE'.expand()}},
	{name: 'media4_epochtimes_en',          query: {q:'@epochtimes,url:theepochtimes.com,url:ept.ms'.expand()}},
	{name: 'media4_epochtimes_jp',          query: {q:'@epochtimes_jp,url:epochtimes.jp'.expand()}},
	{name: 'media4_faz',                    query: {q:'url:faz.net,@FAZ_Auto,@FAZ_BerufChance,@FAZ_Buch,@FAZ_Eil,@FAZ_Feuilleton,@FAZ_Finanzen,@FAZ_Hanz,@FAZ_Immobilien,@FAZ_Kunstmarkt,@FAZ_Literatur,@FAZ_NET,@FAZ_Politik,@faz_Redaktion,@FAZ_Reise,@FAZ_RheinMain,@FAZ_Sport,@FAZ_Technik,@FAZ_Vermischtes,@FAZ_Wirtschaft,@FAZ_Wissen,@FAZBoersenspiel,@faznet'.expand()}},
	{name: 'media4_focus',                  query: {q:'url:focus.de,@focusauto,@focusdigital,@focusonline,@focuspolitik,@focusreise,@focuswissen'.expand()}},
	{name: 'media4_foxnews',                query: {q:'@foxnews,url:foxnews.com'.expand()}},
	{name: 'media4_freitag',                query: {q:'url:freitag.de,@derfreitag'.expand()}},
	{name: 'media4_guardian',               query: {q:'@guardian,url:theguardian.com'.expand()}},
	{name: 'media4_huffingtonpost_de',      query: {q:'url:huffingtonpost.de,@HuffPostDE'.expand()}},
	{name: 'media4_huffpost',               query: {q:'@huffpost,url:huffpost.com,url:huffp.st'.expand()}},
	{name: 'media4_independent',            query: {q:'@independent,url:independent.co.uk'.expand()}},
	{name: 'media4_jouwatch',               query: {q:'url:journalistenwatch.com,@jouwatch'.expand()}},
	{name: 'media4_junge_freiheit',         query: {q:'url:jungefreiheit.de,@Junge_Freiheit'.expand()}},
	{name: 'media4_jungewelt',              query: {q:'url:jungewelt.de,@jungewelt'.expand()}},
	{name: 'media4_kenfm',                  query: {q:'url:kenfm.de'.expand()}},
	{name: 'media4_krone_at',               query: {q:'url:krone.at,@krone_at'.expand()}},
	{name: 'media4_latimes',                query: {q:'@latimes,url:latimes.com'.expand()}},
	{name: 'media4_mdraktuell',             query: {q:'url:mdr.de,@MDRAktuell'.expand()}},
	{name: 'media4_nbc',                    query: {q:'@nbc,url:nbc.com'.expand()}},
	{name: 'media4_neues_deutschland',      query: {q:'url:neues?deutschland.de,@ndaktuell'.expand()}},
	{name: 'media4_news_ntd',               query: {q:'@news_ntd,url:ntd.com'.expand()}},
	{name: 'media4_newsweek',               query: {q:'@newsweek,url:newsweek.com'.expand()}},
	{name: 'media4_npr',                    query: {q:'@npr,url:npr.org'.expand()}},
	{name: 'media4_ntv',                    query: {q:'url:n?tv.de,@ntv_EIL,@ntvde,@ntvde_auto,@ntvde_Politik,@ntvde_politik,@ntvde_sport'.expand()}},
	{name: 'media4_nypost',                 query: {q:'@nypost,url:nypost.com'.expand()}},
	{name: 'media4_nytimes',                query: {q:'@nytimes,url:nytimes.com,url:nyti.ms'.expand()}},
	{name: 'media4_nzz',                    query: {q:'url:nzz.ch,@nzz,@NZZde,@NZZMeinung,@NZZSchweiz,@NZZWissen,@NZZStorytelling,@NZZzuerich,@NZZfeuilleton,@NZZAusland,@nzzwirtschaft,@NZZSport'.expand()}},
	{name: 'media4_oann',                   query: {q:'@oann,url:oann.com'.expand()}},
	{name: 'media4_pbs',                    query: {q:'@pbs,url:pbs.org'.expand()}},
	{name: 'media4_pi_news',                query: {q:'url:pi?news.net,@p_i'.expand()}},
	{name: 'media4_politikversagen',        query: {q:'url:politikversagen.net,@staatsversagen'.expand()}},
	{name: 'media4_rbb',                    query: {q:'url:rbb?online.de,rbb24.de,@rbbabendschau'.expand()}},
	{name: 'media4_rt_deutsch',             query: {q:'url:deutsch.rt.com,@RT_Deutsch'.expand()}},
	{name: 'media4_smopo',                  query: {q:'url:smopo.ch'}},
	{name: 'media4_spiegel',                query: {q:'url:spiegel.de,@SPIEGEL_24,@SPIEGEL_alles,@SPIEGEL_Auto,@SPIEGEL_Data,@SPIEGEL_EIL,@SPIEGEL_English,@SPIEGEL_Gesund,@SPIEGEL_kolumne,@SPIEGEL_Kultur,@SPIEGEL_live,@SPIEGEL_Netz,@SPIEGEL_Pano,@SPIEGEL_Politik,@SPIEGEL_Reise,@SPIEGEL_Rezens,@SPIEGEL_SPAM,@SPIEGEL_Sport,@SPIEGEL_Top,@SPIEGEL_Video,@SPIEGEL_Wirtsch,@SPIEGEL_Wissen,@SPIEGELDAILY,@SPIEGELONLINE,@SPIEGELTV,@SPIEGELzwischen'.expand()}},
	{name: 'media4_sputniknews',            query: {q:'url:de.sputniknews.com'.expand()}},
	{name: 'media4_stern',                  query: {q:'url:stern.de,@sternde'.expand()}},
	{name: 'media4_sueddeutsche',           query: {q:'url:sueddeutsche.de,@SZ,@SZ_WolfratsToel,@SZ_Starnberg,@SZ_Ebersberg,@SZ_Dachau,@SZ_Freising,@SZ_FFB,@SZ_Erding,@SZ_Bildung,@SZ_Medien,@SZ_Eilmeldungen,@SZ_Reise,@SZ_Gesundheit,@SZ_Wissen,@SZ_Digital,@SZ-Digital,@SZ_Auto,@SZ_Bayern,@SZ_Muenchen,@SZ_Karriere,@SZ_Gesellschaft,@SZ_Sport,@SZ_Kultur,@SZ_Geld,@SZ_Wirtschaft,@SZ_Politik,@szmagazin,@SZ_TopNews'.expand()}},
	{name: 'media4_swraktuell',             query: {q:'url:SWRAktuell.de,@SWRAktuell'.expand()}},
	{name: 'media4_t_online',               query: {q:'url:www.t?online.de,@tonline_news'.expand()}},
	{name: 'media4_tagesschau',             query: {q:'url:tagesschau.de,@tagesschau'.expand()}},
	{name: 'media4_tagesspiegel',           query: {q:'url:tagesspiegel.de,@Tagesspiegel,@TspBerlin,@TspCausa,@TspLeute,@TSPSonntag,@tspsport'.expand()}},
	{name: 'media4_taz',                    query: {q:'url:taz.de,@tazgezwitscher,@taz_news'.expand()}},
	{name: 'media4_theeuropean',            query: {q:'url:theeuropean.de,@theeuropean'.expand()}},
	{name: 'media4_tichyseinblick',         query: {q:'url:tichyseinblick.de,@TichysEinblick'.expand()}},
	{name: 'media4_unherd',                 query: {q:'@unherd,url:unherd.com'.expand()}},
	{name: 'media4_unzensuriert_at',        query: {q:'url:unzensuriert.at,@unzensuriert'.expand()}},
	{name: 'media4_unzensuriert_de',        query: {q:'url:unzensuriert.de'.expand()}},
	{name: 'media4_vicenews',               query: {q:'@vicenews,url:vice.com'.expand()}},
	{name: 'media4_voiceofEurope',          query: {q:'url:voiceofeurope.com,@VoiceofEurope'.expand()}},
	{name: 'media4_washingtonpost',         query: {q:'@washingtonpost,url:washingtonpost.com'.expand()}},
	{name: 'media4_waz',                    query: {q:'url:waz.de,@WAZ_Redaktion'.expand()}},
	{name: 'media4_welt',                   query: {q:'url:welt.de,@WELT,@WELT_EIL,@WELT_Wissen,@WELT_Webwelt,@WELT_Kultur,@WELT_Sport,@WELT_Medien,@WELT_Panorama,@WELT_Geld,@WELT_Economy,@WELT_Politik'.expand()}},
	{name: 'media4_worldnetdaily',          query: {q:'@worldnetdaily,url:wnd.com'.expand()}},
	{name: 'media4_wsj',                    query: {q:'@wsj,url:wsj.com'.expand()}},
	{name: 'media4_yahoo_news',             query: {q:'url:news.yahoo.com'.expand()}},
	{name: 'media4_zdf',                    query: {q:'url:zdf.de,@ZDF'.expand()}},
	{name: 'media4_zdf_heute',              query: {q:'url:heute.de,@heutejournal,@heuteplus'.expand()}},
	{name: 'media4_zeit',                   query: {q:'url:zeit.de,@zeitonline,@zeitonline_dig,@zeitonline_ent,@zeitonline_fam,@zeitonline_kul,@zeitonline_live,@zeitonline_pol,@zeitonline_vid,@zeitonline_wir,@zeitonline_wis,@zeitonlinesport'.expand()}},
	{name: 'menaretrash',                   query: {q:'menaretrash OR #menaretrash'}},
	{name: 'merz1',                         query: {q:'aufbruch2020,ausmerzen,frauenfuermerz,frauenfürmerz,frauengegenmerz,merz,merzworte,teammerz,wirfrauenfuermerz,wirfrauenfürmerz,wirfrauengegenmerz,wirfuermerz,wirfürmerz,@_FriedrichMerz'.expand()}},
	{name: 'metoo',                         query: {q:'#metoo OR metoo'}},
	{name: 'metwo',                         query: {q:'#metwo OR metwo'}},
	{name: 'mietendeckel',                  query: {q:'mietendeckel,mietpreisbremse,url:mietendeckel,url:mietpreisbremse,mietenwahnsinn,mietendeckelrechner,miethöhe,miete,mieten,mieter,dwenteignen,vermieter,vermieterin,vermietende,vermietende,wohnungsmarkt'.toOR()}},
	{name: 'migrationshintergrund',         query: {q:'migrationshintergrund'}},
	{name: 'ministerien',                   query: {q:'sksachsentweets,Arne_Wiechmann,SMIsachsen,ChriSchni,StRegSprecherin,Boschemann,julitalk,svefri,amtzweinull,HaufeStephan,jettebo,Opp_Sprecher,ZimmermannSina,al_krampe,Medienheld,bauerzwitschert,hard_er,MSchroeren,pampel_muse,evamariamarks,RouvenKlein,ninasuza,andreasblock,foeniculum,zumtesthier'.toWildFromTo()}},
	{name: 'ministerien2',                  query: {q:'AA_SicherReisen,Digital_Bund,BMVg_Afrika,BundesKultur,TDE2018Berlin,bfarm_de,bka,Stammtisch20,BVerfG,BSI_Presse,Bundestag,ADS_Bund,BBK_Bund,BMBF_Bund,BStU_Presse,BMG_Bund,BMJV_Bund,BAFA_Bund,BMAS_Bund,BAMF_Dialog,BMWi_Bund,netzausbau,BMI_Bund,BMFSFJ,BMF_Bund,GermanyDiplo,BMZ_Bund,bmel,AuswaertigesAmt,BMVI,destatis,RegSprecher,Bundestagsradar,bmu,Umweltbundesamt,bundesrat,bpb_de,HiBTag'.toWildFromTo()}},
	{name: 'moria1',                        query: {q:'moria'}},
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
	{name: 'quattromob',                    query: {q:'quattromob'}},
	{name: 'racism',                        query: {q:'racism,racist,racists,prejudice,anti-semitic,homophobe,lgbtq,lgbtq+,supremacy,superiority,blacklivesmater,blacklivesmatter,youaintblack'.toOR(), splitTime:6}},
	{name: 'racism2',                       query: {q:'racismo,racisme,saynotoracism'.expand()}},
	{name: 'rass_kritischesweißsein',       query: {q:'kritischesweißsein,kritischeweissheiten,rassismusgegenweisse,kritischeweißheiten,kritischesweisssein,kritischesalmansein,rassismusgegendeutsche'.expand()}},
	{name: 'rass_whiteprivilege',           query: {q:'whiteprivilege,criticalwhiteness'.expand()}},
	{name: 'rbg',                           query: {q:'rbg,roshhashanah,ruthbaderginsburg,ruthbaderginsberg,ginsburg,ginsberg,ripruthbaderginsburg,ripruthbaderginsberg,scotus,riprbg,rbgrip'.toOR()}},
	{name: 'rechts',                        query: {q:'afdwaehlen,antifaverbot,merkelmussweg,staatsfernsehen,stopasyl,stopislam,widerstand'.toOR()}},
	{name: 'rechts2',                       query: {q:'"aufrecht erhalten","bedauerlicher einzelfall","esreicht","fake news","große verfall","illegale masseneinwanderung","illegale migranten","islamistische gefährder","islamistischer gefährder","kampf gegen","kapituliert vor","kein einzelfall","konstatiert kontrollverlust","leistet widerstand","links grün versifft","mein vaterland","merkelmussweg","mundtot gemacht","mundtot machen","plünderung freigegeben","politisch inkorrekt","politische korrektheit","rechte ecke","schweigende mehrheit","unkontrollierte einwanderung","unkontrollierte masseneinwanderung","unser land","volkspädagogische kampagne","widerliches pack","wirklichkeitsverweigerung",abmerkeln,abschiebung,achgut,afdimbundestag,afdwaehlen,alllivesmatter,alternativemedien,altparteien,anarchokapitalist,anpassungsmoralismus,antiantifa,antifaverbot,antigender,antimerkel,antisystem,antivegan,armenimport,asyl,asylindustrie,aufrecht,banislam,bedauerlich,bereicherung,bevormundung,bimbo,bluehand,dankeerikasteinbach,defendeurope,defendgermany,demokratur,denkverbot,deplorable,deraustausch,deutschfam,diktatur,dirigismus,ditib,drachenlord,dreck,einwanderung,einzelfall,einzelfallinfos,einzeltäter,endgov,entbrüsseln,erklärung2018,erziehungsmedien,eudssr,fakenews,fakerefugees,familiennachzug,fckislm,flintenuschi,flüchtlingsproblematik,flüchtlingswelle,freekolja,freilerner,frühsexualisierung,gabfam,gedankenpolizei,gefährder,gegenlinks,gegenzecken,geldsystemkritiker,"gender mainstreaming",gendergaga,genderismus,genderterror,gesinnungsterror,gleichgeschaltet,gleichschaltung,grueneversenken,gutmensch,gutmenschen,heimatbewusst,herrschaftsfrei,heterophob,hetzer,homolobby,ichbinpack,identitätspolitik,immigrationskritik,invasoren,invasorenwelle,islambeiuns,islamisierung,islamnixgut,jungefreiheit,kartellparteien,kartoffeldeutsch,kinderehe,kinderfickersekte,klartext,klimalüge,konservativ-freiheitlich,kopftuch,kopftuchverbot,koppverlag,kriegstreiber,krimigranten,kulturbereicherer,kulturtaliban,kuscheljustiz,köterrasse,landeshochverrat,linksextremismus,linksfaschismus,linksmaden,linksnicker,linksversifft,lügenpresse,lügner,machtelite,machtwechsel,maskulist,masseneinwanderung,maulkorb,mediendiktatur,meinungsdiktat,meinungsdiktatur,meinungsfreiheit,merkelei,merkelmussweg,merkelregime,mgga,migrassoren,migrationswaffe,minimalstaat,multikultitötet,mundtot,muslime,muslimisch,männerbeauftragter,männerrechtler,nafri,national-liberal,nationalkonservativ,nationalstolz,nazikeule,neger,neokonservativ,netzdg,nichtohnemeinkopftuch,opfer-abo,opferindustrie,paulanergarten,pckills,proborders,propaganda,propagandaschau,propolizei,quotenneger,realitätsverweigerer,rechtsstaat,redpill,refugeesnotwelcome,remigration,rückführungshelfer,scharia,scheinasylant,schleiereule,schuldkult,selbstabschaffung,selbstviktimiserung,sozial-libertär,sozialparadies,sozialschmarotzer,sozialsysteme,sozialtourist,sprachpolizei,staatsfernsehen,staatspresse,stasi,steuerstaat,stopasyl,stopislam,superstaat,systemgünstlinge,systemkonform,systemkritisch,systempresse,taxationistheft,terror,terroristen,teuro,thewestisbest,tichyseinblick,toleranzdiktatur,traudichdeutschland,tugendterror,tugendwächter,umerziehung,umvolkung,unbequem,unkontrolliert,untertanengeist,unterwerfung,vaterland,vaterländisch,verabschiedungskultur,verbotskultur,verbotspartei,verbrechen,verbrecher,verfassungspatriot,verhindern,verschwulung,voelkisch,volksbetrug,volksdeutsche,volksempfinden,volkspädagogik,volksthumsleugnung,volkstod,volksverräter,voluntarismus,völkisch,werteunion,wertkonservativ,widerlich,widerstand,wirtschaftsflüchtling,zensurland,zuwanderung,zuwanderungskritisch,zwangsgebühren'.toOR(), lang:'de'}},
	{name: 'rechts3',                       query: {q:'mischvölker,halbneger'.toOR(), lang:'de'}},
	{name: 'rechts4',                       query: {q:'staatsfunk,massenmigration,mischvolk,endlösung,überfremdung'.toOR(), lang:'de'}},
	{name: 'rechts5',                       query: {q:'afghane,afghanen,afghanisch,afghanistan,afrikaner,albaner,albanisch,araber,arabisch,arabische,asyl,asylbewerber,asylpolitik,asyltourist,asylurlauber,attacke,ausländer,ausländisch,ausländische,ausländischer,ausländischen,dankemerkel,einwanderer,einzelfall,ersticht,erstochen,flüchtling,flüchtlinge,flüchtlingsheim,hochzeitskorso,irak,iraker,islam,islamisch,islamische,islamisierung,kopftuch,krawall,krawalle,kriminalität,kuscheljustiz,körperverletzung,libyer,masseneinwanderung,merkel,messer,messermigrant,messermigranten,messermigration,messermord,migrant,migranten,migration,mord,muslim,muslima,muslime,muslimisch,muslimische,muslimischen,muslimischer,noislam,pakistan,pakistanisch,pistole,rumäne,rumänien,rumänisch,schlägerei,schusswaffe,schusswaffen,syrer,syrisch,syrische,syrischen,syrischer,südländer,südländisch,südländische,südländischen,südländischer,türke,türkei,türken,türkin,türkisch,umvolkung,verbrechen,vergewaltigen,vergewaltigt,vergewaltigung,vergewaltigungen'.toOR(), lang:'de'}},
	{name: 'reisewarnung',                  query: {q:'reisewarnung OR reisehinweis'}},
	{name: 'rezovideo',                     query: {q:'rezovideo,#rezo,@rezomusik,to:rezomusik,from:rezomusik,@cdu,to:cdu,from:cdu,amthor,amthorvideo,#cdu,www.youtube.com/watch?v=4Y1lZQsyuSQ,"Zerstörung der CDU"'.toOR()}},
	{name: 'rundfunkbeitrag',               query: {q:'rundfunkbeitrag'}},
	{name: 'rücktritt',                     query: {q:'rücktritt'.expand()}},
	{name: 'sarrazin',                      query: {q:'sarrazin OR sarazin'}},
	{name: 'sawsanchebli2',                 query: {q:'@sawsanchebli'.expand()}},
	{name: 'scholl',                        query: {q:'scholl'}},
	{name: 'seebruecke',                    query: {q:'seebruecke OR seebrücke'}},
	{name: 'seehofer',                      query: {q:'seehofer OR #seehofer'}},
	{name: 'shitstormopfer2',               query: {q:'@dunjahayali,@janboehm,@georgrestle,@sawsanchebli,@ebonyplusirony,@fatma_morgana,@igorpianist,@sibelschick,@hatinjuce'.expand()}},
	{name: 'shitstormopfer3',               query: {q:'@migrantifa,@oezgeschmoezge,@habichthorn,@natascha_strobl,@kattascha,@schwarzblond,@_vanessavu,@afelia,@luisamneubauer'.expand()}},
	{name: 'shooting3',                     query: {q:'santafehighschool,santafe,SantaFeShooting,SantaFeSchoolShooting,HoustonShooting'.expand()}},
	{name: 'sibelschick2',                  query: {q:'@sibelschick'.expand()}},
	{name: 'spd',                           query: {q:'#spd'}},
	{name: 'sterbenmitstreeck',             query: {q:'sterbenmitstreeck'}},
	{name: 'sticker',                       query: {q:'@stickerarchive,@c3stoc'.expand()}},
	{name: 'stopasianhate',                 query: {q:'stopaapihate,stopasianhate,stopasianhatecrimes'.expand()}},
	{name: 'stopgates',                     query: {q:'#closethegates,#stopgates,soros,#banbill,#soros,#wwg1wgaworldwide,#infowar,#wwg1gwa,@byoblu24,#byoblu24,#byoblu,@byoblu,#oann,@oann'.expand()}},
	{name: 'syria',                         query: {q:'syria'}},
	{name: 'tabubruch',                     query: {q:'tabubruch'.expand()}},
	{name: 'talk_annewill',                 query: {q:'@annewill,@AnneWillTalk,‏#annewill,annewill,"anne will"'.expand()}},
	{name: 'talk_hartaberfair',             query: {q:'#hartaberfair,#Plasberg,"frank plasberg"'.expand()}},
	{name: 'talk_maischberger',             query: {q:'@maischberger,#maischberger,maischberger'.expand()}},
	{name: 'talk_markuslanz',               query: {q:'@ZDFMarkusLanz,"Markus Lanz",#lanz'.expand()}},
	{name: 'talk_maybritillner',            query: {q:'@maybritillner,#illner,#maybritillner,maybritillner,"maybrit illner"'.expand()}},
	{name: 'tempolimit',                    query: {q:'tempolimit OR #tempolimit'}},
	{name: 'tenderage',                     query: {q:'"tender age"'}},
	{name: 'thueringenmpwahl',              query: {q:'afd,afdp,akk,antifa,björn,bodoramelow,c_lindner,cdu,cdu_fraktion_th,cdu_thueringen,dammbruch,faschist,faschisten,fckfdp,fdp,fdp_thueringen,gnaden,hirte,höcke,kanzlerin,kemmerich,kemmerichruecktritt,kemmerichrücktritt,kemmerichs,kemmerichthl,kramp-karrenbauer,lindner,merkel,mikemohring,ministerpräsident,ministerpräsidentenwahl,mohring,mpwahl,neuwahl,niewieder,noafd,paktieren,paktiert,ramelow,rechtsextremen,rot-rot-grün,steigbügelhalter,tabubruch,thueringen,thueringenwahl,thüringen,thüringens,unfassbar,unverzeihlich,werteunion'.toOR()}},
	{name: 'timnit_gebru',                  query: {q:'Timnit Gebru,@timnitgebru,istandwithtimnit'.expand()}},
	{name: 'toptweets_de_20',               query: {q:'lang:de min_retweets:20'}},
	{name: 'toptweets_de_50',               query: {q:'lang:de min_retweets:50'}},
	{name: 'toptweets_en_10k',              query: {q:'lang:en min_retweets:10000'}},
	{name: 'trier',                         query: {q:'trier'}},
	{name: 'trudeaumustgo',                 query: {q:'trudeaumustgo OR #trudeaumustgo'}},
	{name: 'trump_hashtags_1',              query: {q:'trumptreason,trumpbeggedlikeadog,lockhimup,trumpmeltdown,countryovertrump,impeachagain,trumptape,trumpisacriminal,trumptapes,trumpbegged'.expand()}},
	{name: 'trump_mentions',                query: {q:'to:realdonaldtrump OR to:potus OR realdonaldtrump OR potus', splitTime:6}},
	{name: 'trump_quoted',                  query: {q:'url:twitter.com/realdonaldtrump OR url:twitter.com/potus'}},
	{name: 'trump_tweets',                  query: {q:'from:realdonaldtrump OR from:potus'}},
	{name: 'tupoka_o',                      query: {q:'@tupoka_o'.expand()}},
	{name: 'ueberwachung',                  query: {q:'überwachungspaket OR staatstrojaner OR bundestrojaner OR ueberwachungspaket OR zib2 OR überwachung OR privatsphäre OR datenschutz OR sicherheit OR vds OR sicherheitspaket'}},
	{name: 'ukelection',                    query: {q:'GeneralElection2019,UKElection,GE2019'.toOR()}},
	{name: 'unionsstreit1',                 query: {q:'unionsstreit,seehofer,csu,asylstreit,merkel,afd,ultimatum,zuwanderung,groko'.toOR(), lang:'de'}},
	{name: 'unteilbar',                     query: {q:'unteilbar,unteilbar_,to:unteilbar_,from:unteilbar_'.toOR()}},
	{name: 'uploadfilter',                  query: {q:'uploadfilter,saveyourinternet,leistungsschutzrecht,deleteart13,censorshipmachine,axelvossmdep,from:axelvossmdep,to:axelvossmdep,fixcopyright'.toOR()}},
	{name: 'uselection2020_accounts_1',     query: {q:'@gop,@housedemocrats,@housegop,@joebiden,@kamalaharris,@mike_pence,@realdonaldtrump,@senatedems,@senategop,@thedemocrats'.expand()}},
	{name: 'uselection2020_accounts_2',     query: {q:'@GovBillWeld,@MarkSanford,@WalshFreedom,@MichaelBennet,@CoryBooker,@GovernorBullock,@PeteButtigieg,@JulianCastro,@BilldeBlasio,@JohnDelaney,@TulsiGabbard,@gillbrandny,@SenKamalaHarris,@Hickenlooper,@JayInslee,@amyklobuchar,@SenAmyKlobuchar,@WayneMessam,@sethmoulton,@BetoORourke,@TimRyan,@BernieSanders,@ericswalwell,@ewarren,@SenWarren,@marwilliamson,@AndrewYang,@JoeSestak,@MikeGravel,@TomSteyer,@DevalPatrick,@MikeBloomberg,@staceyabrams,@SenDuckworth,@TammyforIL,@KeishaBottoms,@RepValDemings,@val_demings,@AmbassadorRice,@GovMLG,@Michelle4NM,@SenatorBaldwin,@tammybaldwin,@KarenBassTweets,@RepKarenBass,@Maggie_Hassan,@SenatorHassan,@GovRaimondo,@GinaRaimondo,@GovWhitmer'.expand()}},
	{name: 'uselection2020_hashtags_1',     query: {q:'#1u,#2018midterms,#2020election,#2020elections,#absenteeballot,#activemeasures,#aksen,#alsen,#america,#americafirst,#american,#americans,#arsen,#azsen,#ballots,#beatexasvoter,#berniesanders,#biden,#biden2020,#bidenforprison,#bidenharris,#bidenharris2020,#bidenharris2020landslide,#bidenharris2020tosaveamerica,#bidenharrislandslide2020,#bidensamerica,#bidenstoplyin,#blue2020,#bluetsunami,#bluetsunami2018,#bluewave,#bluewave2018,#bluewave2020,#bluewavecoming2018,#bluewaveiscoming,#buildthewall,#bunkerboy,#casen,#cavotes,#ccot,#ccp,#cheatbymail,#clinton,#colinpowell,#congress,#corruptdemocrats,#cosen,#ctsen,#demcast,#demconvention,#demconvention2020,#demforce,#democrat,#democratic,#democraticconvention,#democraticconvention2020,#democraticnationalconvention,#democraticparty,#democrats,#democratsaredestroyingamerica,#democratshateamerica,#dems,#demsenate2020,#demswork4usa,#desen,#dnc,#dnc2020,#dncconvention,#dncconvention2020,#dobbs,#donaldtrump,#draintheswamp,#dumptrump,#dumptrump2020,#election,#election2018,#election2020,#election2020-nov-3,#election2024,#electioncommission,#electionday,#electionfraud,#elections,#elections2020,#electionseason,#electiontwitter,#extrememagashoutout,#fairelections,#fakenews,#fakepolls,#fakepresident,#fbr,#fbresistance,#fbrparty,#fighttovote,#flipitblue,#flsen,#fucktrump,#gasen,#geeksresist,#gop,#gopbetrayedamerica,#gotv,#govote,#greatawakening,#harris,#harrisbiden2020,#hillaryclinton,#hisen,#hunterbiden,#iasen,#idsen,#ilsen,#impeach45,#impeachtrump,#imwithher,#indivisible,#insen,#insidepolitics,#joebiden,#joebiden2020,#joebidenforpresident2020,#joebidenisapedo,#joebidenkamalaharris2020,#kag,#kag2018,#kag2020,#kamalaharris,#kamalaharrisvp,#kavanaugh,#keepitblue,#kssen,#kysen,#lasen,#leadership,#letherspeak,#maga,#maga2020,#mailboxes,#mailinballot,#mailinballots,#mailinvoterfraud,#mailinvoting,#makeamericagreatagain,#marxist,#masen,#maskup,#mdsen,#mesen,#michelleobama,#midterm,#midterm18,#midterm2018,#midterms,#midterms2018,#milesguo,#misen,#mnsen,#mosen,#mssen,#mtsen,#myvotematters,#ncsen,#ndsen,#nesen,#neverbiden,#nevertrump,#nhsen,#njsen,#nmsen,#notmypresident,#november2020,#nra,#nvsen,#ny24,#nysen,#ohsen,#oksen,#openthedebates,#orangecounty,#orsen,#paresists,#pasen,#patriots,#plaidshirtguy,#politics,#polls,#portland,#postalservice,#postoffice,#potus,#president,#presidentbiden,#presidential,#presidentialelection,#presidentialelection2020,#presidenttrump,#propaganda,#protectthevote,#realdonaldtrump,#reconnectthemailsortersnow,#redwave,#redwave2020,#redwaverising,#registertovote,#registertovote2020,#rememberinnovember,#replacepelosi,#republican,#republicans,#republicansforbiden,#resist,#resistance,#ridinwithbiden,#risen,#rnc2020,#savethepostalservice,#savethepostoffice,#scsen,#sdsen,#senate,#settleforbiden,#signofresistance,#sleepyjoe,#sleepyjoebiden,#socialismkills,#specialelection,#stayhometovote,#stevebannon,#streamtext,#strongertogether,#swingstates,#takeitback,#taxcuts,#tcot,#teambidenharris,#thanksgop,#thanksobama,#theatlantavoice,#thegreatawakening,#theresistance,#thursdaymotivation,#tnsen,#tradewar,#trump,#trump2020,#trump2020landslide,#trump2020nowmorethanever,#trumpcanceledamerica,#trumpcorruption,#trumpisanationaldisgrace,#trumpislosing,#trumpisnotwell,#trumpmeltdown,#trumprussia,#trumptrain,#trumpvirus,#txsen,#unrigthesystem,#us,#usa2020,#uspostalservice,#usps,#uspsprotests,#uspssabotage,#ussenate,#utpol,#utsen,#vasen,#vote,#vote2020,#votebidenharris2020,#votebidenharristosaveamerica,#voteblue,#voteblue2018,#voteblue2020,#voteblueforamerica,#votebluetoendthisnightmare,#votebluetosaveamerica,#votebluetosaveamerica2020,#votebold,#votebymail,#votebymail2020,#votebymailearly,#votedem,#voteearly,#votefordemocracy,#voteforher,#votegold,#votegold2020,#votegopout,#votehimout,#votelikeyourlifedependsonit,#votered,#votered2018,#votered2020,#voteredtosaveamerica,#voteredtosaveamerica2020,#voterepublican,#voterfraud,#voterid,#voters,#votersfirst,#votersuppression,#votersuppressionisreal,#votethemout,#votetrumpout,#votewhileyoustillcan,#voting,#votingmatters,#vtsen,#wakeupamerica,#walkaway,#walkawaycampaign,#walkawayfromdemocrats,#walkawayfromdemocrats2018,#wasen,#wethepeople,#winblue,#wisen,#wrwy,#wvsen,#wwg1wga,#wysen,#yeswecan,#yourvotematters'.expand()}},
	{name: 'uselection2020_hashtags_2',     query: {q:'#debate2020,#presidentialdebate,#debates2020,#presidentialdebate2020'.expand()}},
	{name: 'uselection2020_hashtags_3',     query: {q:'#battlegroundstate,#blacksfortrump,#counteverylegalvote,#counteveryvote,#eleccion2020,#electionday,#electionmeddling,#electionnight,#electionresults,#electionresults2020,#givebacktrumpvotes,#thepostelection,#trumpvsbiden,#usaelection2020,#usaelections2020,#usaelection,#usaelectionresults,#usaelectionresults2020,#usaelections,#uselection,#uselection2020,#uselectionresults,#uselectionresults2020,#uselections,#uselections2020,#voterfraud,#voterfruad'.expand()}},
	{name: 'uselection2020_keywords_1',     query: {q:'ballot,mailin,mail-in,mail,donaldtrump,donaldjtrump,donald,joebiden,biden,mike,michael,mikepence,michaelpence,kamala,kamalaharris,#DonaldTrump,PresidentTrump,MAGA,trump2020,Sleepy,Sleepyjoe,HidenBiden,CreepyJoeBiden,NeverBiden,BidenUkraineScandal,DumpTrump,NeverTrump,VoteRed,VoteBlue,RussiaHoax'.expand()}},
	{name: 'uselection2020_keywords_2',     query: {q:'@milionmagamarch,bidenharrisvictoryday,bidenharrisvictoyday,blacklivesmetter,dcprotests,url:milionmagamarch,url:1327653470502084613,url:1327631118280122369,url:1327629900350681088,url:1327625910724546568,url:1327646530103369728,url:1327646657538891781,url:1327659829372993542,url:1327639369377869824,url:1327645784544784384,itstimetoconcede,magamarch,magamarchdc,magamillionmarch,magamillionmarch2020,marchers,marchfortrump,#marching,milionmagamarch,millionmagamarch,millionmagamarch2020,millionmoronmarch,millionsmagamarch,#pancakes,proudboys,stopthesteai,stopthesteal,trumpconcede'.expand()}},
	{name: 'verschwoerung1',                query: {q:'billgatesisevil,clintonbodycount,clintoncrimefamily,clintonemails,coronahoax,covid1984,deepstate,frazzledrip,generalflynn,georgesorosriots,greatawakeningworldwide,inittogether,isaackappy,justiceiscoming,merkelgate,obamagate,obamagate,pedogate,pedowood,pizzagate,podestaemails,qanon,qanongermany,transitiontogreatness,unitednotdivided,wachtauf,wakeupworld,wearethenewsnow,wearetherevolution,weinerslaptop,weltfrieden,wwg1wga'.expand()}},
	{name: 'virologen2',                    query: {q:'drosten,kekule,streeck,@c_drosten,@alexanderkekule,@hendrikstreeck'.expand()}},
	{name: 'volkmarsen',                    query: {q:'volkmarsen,menschenmenge,rosenmontag,rosenmontagsumzug,rosenmontagszug'.toOR()}},
	{name: 'wallstreetbets',                query: {q:'gamestop,robinhood,wallstreetbets'.expand()}},
	{name: 'weidel',                        query: {q:'weidel'.expand()}},
	{name: 'wirmachenauf',                  query: {q:'wirmacheneuchdicht,wirmachenauf,lasstdieschulenzu,wirhabenplatz,wirmacheneuchwiederzu,keinlockdownmehr'.expand()}},
	{name: 'wirvsvirushackathon',           query: {q:'wirvsvirus,#wirvsvirus,wirvsvirushackathon,#wirvsvirushackathon,from:wirvsvirushack,to:wirvsvirushack,wirvsvirushack,#wirvsvirushack,hackathon,#hackathon'.toOR()}},
	{name: 'wuerzburg',                     query: {q:'wuerzburg,würzburg'.expand()}},
	{name: 'xsarahleee',                    query: {q:'xsarahleee,to:xsarahleee,from:xsarahleee,rassismus gegen weisse'.expand()}},
];

var lists = [
	'AfD',
	'AfDkompakt',
	'gfd_grundgesetz',
	'wahl_beobachter',
	'bild',
	'splitternackt_',
	'VictoriaLinnea1',
	'goldtogreen_',
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

								var name = (screen_name+'_list2_'+list.slug).toLowerCase();
								name = name.replace(/ü/g, 'ue');
								name = name.replace(/ö/g, 'oe');
								name = name.replace(/ä/g, 'ae');
								name = name.replace(/ß/g, 'ss');

								queries.push({
									name: name,
									query: {
										q:users.map(u => 'from:'+u+' OR to:'+u+' OR url:twitter.com/'+u+'/status').join(' OR ')
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
		parallelLimit,
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

		var T = entry.query.splitTime ? 2 : 1;

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
