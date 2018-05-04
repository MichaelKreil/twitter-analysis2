"use strict";

const fs = require('fs');
const lzma = require('lzma-native');
const async = require('async');
const utils = require('../../lib/utils.js');
const colors = require('colors');
const resolve = require('path').resolve;
const scraper = (require('../../lib/scraper.js'))('search_and_dump');

String.prototype.toFromTo = function () {
	return this.split(',').map(a => 'from:'+a+' OR to:'+a).join(' OR ')
}

String.prototype.toWildFromTo = function () {
	return this.split(',').map(a => a+' OR from:'+a+' OR to:'+a).join(' OR ')
}

String.prototype.toOR = function () {
	return this.split(',').join(' OR ')
}

// List of search queries
var queries = [
	{name: '120db',                         query: {q:'frauenmarsch OR 120db OR b1702 OR dd1702 OR ndh1702 OR niun1702 OR niun OR no120db'}}, 
	{name: '1mai',                          query: {q:'c0105 OR ef0105 OR e0105 OR zwickau3004 OR b0105 OR fue0105 OR 1Mai2018 OR TagderArbeit OR 1Mai'}},
	{name: '34c3',                          query: {q:'34c3'}},
	{name: 'afd_bundestagsabgeordnete',     query: {q:'mueller_mdb,JoernKoenigAfD,Jacobi_AfD,VerHartmannAfD,Frank_Magnitz,ChrWirthMdB,Martin_Sichert,BraunAfD,KestnerJens,JensMaierAfD,DrFriesenMdB,Th_Seitz_AfD,SteffenKotre,AndreasBleckMdB,EspendillerM,Buettner_MdB,Martin_Hess_AfD,CorinnaMiazga,NKleinwaechter,S_Muenzenmaier,UdoHemmelgarn,GottfriedCurio,h_weyel,Alice_Weidel,Rene_Springer,ProfMaier,M_HarderKuehnel,JoanaCotar,PetrBystronAfD,DirkSpaniel,MarcBernhardAfD,Tino_Chrupalla,StefanKeuterAfD,EnricoKomning,Leif_Erik_Holm,Marcus_Buehl,Schneider_AfD,Jochen_Haug,StBrandner,MdB_Lucassen,Witt_Uwe,ElsnervonGronow,Frohnmaier_AfD,Marc_Jongen,Herrmann_AfD,WaldemarHerdt,Ulrich_Oehme,Friedhoff_AfD,Robby_Schlund,Nicole_Hoechst,mrosek1958,uwe_kamann,M_Reichardt_AfD,Renner_AfD,TobiasMPeterka,axelgehrke,ttte94,Frank_Pasemann,ProtschkaStepha,KayGottschalk1,ulschzi,GtzFrmming,Beatrix_vStorch,R_Hartwig_AfD,Buergerwohl,PeterBoehringer,Uwe_Schulz_AfD'.toWildFromTo()}},
	{name: 'afd_bundesvorstand',            query: {q:'AndreasKalbitz,Joachim_Kuhs,Alice_Weidel,GuidoReil,Georg_Pazderski,Joerg_Meuthen,SteffenKoeniger,Frank_Pasemann,ProtschkaStepha,KayGottschalk1,Beatrix_vStorch'.toWildFromTo()}},
	{name: 'afd_landessprecher',            query: {q:'AndreasKalbitz,Frank_Magnitz,Martin_Sichert,Dana_Guth_AfD,thomasroecke,Helmut_Seifen,WittgensteinAfD,RalfOezkara,Uwe_Junge_MdL,Leif_Erik_Holm,Georg_Pazderski,Marc_Jongen,MoellerAfD,BjoernHoecke'.toWildFromTo()}},
	{name: 'afd_landesverbaende',           query: {q:'AfDSaar,AfD_LV_SH,RLP_AfD,AfD_Hamburg,AfD_LSA,AfD_Sachsen_ASA,AlternativeNRW,AlternativeNds,AfD_Thueringen,BrandenburgAfD,AfD_HB,AfDBerlin,AfD_MV,AlternativeBW,AfD_Hessen,AfD_Bayern'.toWildFromTo()}},
	{name: 'afd_landtagsabgeordnete',       query: {q:'DieterNeuendorf,AndreasKalbitz,LPBerg_MdL,lutzhecker_mdl,BaumMdL,CarolaWolle,afdgehlmann,bothe_stephan,AndreWendtMdL,Dana_Guth_AfD,heinermerz,StefanHerreMdL,WMuhsal,ChristianBlex,Strotebeck_AfD,thomasroecke,HPStauch,Vincentz_AfD,Pankow_im_AGH,Helmut_Seifen,MdLFernandes,UlrichSiegmund,hanno_bachmann,WittgensteinAfD,Joerg_Nobis_AfD,StefanRaepple,EnricoKomning,AfD_Lieschke,VolkerOlenicak,Daniel_Roi_AfD,JoachimPaul_AfD,UbbelohdeBerlin,AlexTassisAfD,AfDLindemann,Uwe_Junge_MdL,Leif_Erik_Holm,MatzeBuettner,haraldlaatsch,spiegelbergafd,DrRainerBalzer,udostein_mdl,Wagner_AfD_MdL,Iris_AfD_MdL,ClausSchaffer,Georg_Pazderski,StBrandner,Jan_Bollinger,Joerg_Meuthen,Galau_MdL,RogerBeckamp,WieseFranz,MdL_Schade,Keith_AfD,FrankHansel,jaweschmi,PoggenburgAndre,BirgitBessin,MoellerAfD,WeissAfD,BjoernHoecke,Loose_AfD,mrosek1958,FrankScholtysek,Kristin_Brinker,Damian_Lohr,SteffenKoeniger,MVallendar,HughBronson_AfD,Keineausrede,HeriFriedmann,GWalgerDemolsky,FScheermesser,JessicaBiessman,Huetter_Carsten,twittschler,Wollihood,ronaldglaeser'.toWildFromTo()}},
	{name: 'afd_landtagsfraktionen',        query: {q:'AfD_FraktionNds,AfD_ThL,AfD_Fraktion_SH,AfDFraktionRLP,AfD_FraktionNRW,AfDFraktion_MV,AfDFraktionBW,AfDFraktionLSA,AfD_Fraktion_HH,AfD_SLT,AfDFraktionAGH,AfD_FraktionBB'.toWildFromTo()}},
	{name: 'afd_verifizierte_accounts',     query: {q:'AfDimBundestag,DS_AfD,WMuhsal,Martin_Hess_AfD,RonnyKumpf,UdoHemmelgarn,GottfriedCurio,AfD_HeikeThemel,KayUweZiegler71,Strotebeck_AfD,AfD_OF_Land,Holger_Lucius,Alice_Weidel,M_HarderKuehnel,AfD_KV_Biberach,MarcBernhardAfD,Ludwig_AfD,MdLFernandes,UlrichSiegmund,torben_braga,AfDKompakt,VolkerOlenicak,Daniel_Roi_AfD,AfDFraktionLSA,UbbelohdeBerlin,AfDLindemann,Uwe_Junge_MdL,Leif_Erik_Holm,AfD_HD,haraldlaatsch,Iris_AfD_MdL,AfD_GE,Georg_Pazderski,stsc_,StBrandner,Joerg_Meuthen,RogerBeckamp,AfD_Fraktion_HH,Marc_Jongen,MdL_Schade,jessica_malisch,FrankHansel,PoggenburgAndre,AfDFraktionAGH,AfD_LSA,AfD_FraktionBB,AlternativeNRW,AfD_Thueringen,BjoernHoecke,Mario_Hau_AfD,AfD_Magdeburg,Loose_AfD,mrosek1958,uwe_kamann,M_Reichardt_AfD,Renner_AfD,AfD_Muenster,Kristin_Brinker,AfDBerlin,SteffenKoeniger,HughBronson_AfD,Frank_Pasemann,AfD_Hessen,AfD_Bayern,GtzFrmming,Beatrix_vStorch,R_Hartwig_AfD,AfD_RBK,twittschler,MalteKaufmann,Wollihood'.toWildFromTo()}},
	{name: 'afdkompakt_alles_auf_einen_blick',query: {q:'AfDLG_BRB,DieterNeuendorf,afd_nauen,AfD_OV_Kehl,afd_kreis_lippe,AfD_KV_Ortenau,PetraFederau,AndreasKalbitz,LPBerg_MdL,Joachim_Kuhs,AfD_FraktionNds,AfD_KV_IN_EI,TB_Pol,mueller_mdb,AfD_EE,kuper_elena,afd_kv,JoernKoenigAfD,AfDStuttgart,lutzhecker_mdl,CarolaWolle,afd_ffo,HagenKohlMdL,kaiser_mt,JA_Bayern,afdgehlmann,StefanAdler91,Jacobi_AfD,VerHartmannAfD,AfDOstholstein,tommytabor,Frank_Magnitz,bothe_stephan,AfD_OV_BEW,AfD_Esslingen,AfD_Pf_Enzkreis,Reutlinger_AfD,P_Plattform,KnieseTosca,ChrWirthMdB,ReimondHoffmann,Martin_Sichert,AndreWendtMdL,BraunAfD,KestnerJens,JensMaierAfD,DrFriesenMdB,FalkRodig,Th_Seitz_AfD,SteffenKotre,AndreasBleckMdB,JoergSobolewski,Berliner_JA,JuergenSprick,ja_detmold,DietmarWagner22,AfD_KULIF,LinnKuppitz,AfDFraktionBS,DS_AfD,handt_afd,IreneLienshoeft,AfD_MR_BID,EspendillerM,VerenaSigmumd,Dana_Guth_AfD,AfD_MainzBingen,AfDHochfranken,heinermerz,AfD_Ludwigsburg,Buettner_MdB,AfD_ThL,rebi_adam,StefanHerreMdL,TomCologne4,JanEndert,JA_Wiesbaden,WMuhsal,Martin_Hess_AfD,Helferich_AfD,RonnyKumpf,SimonDennen,AfD_Potsdam_SVV,AfD_GG_Sued,CorinnaMiazga,NKleinwaechter,S_Muenzenmaier,AfdCelle,TBojani,heiner_rehnen,Bottrop_AfD,gregormodos,ChristianBlex,AfDMettmann,AfD_Gummersbach,leschik_afd,ScheilDr,UdoHemmelgarn,GottfriedCurio,AfD_HeikeThemel,KayUweZiegler71,papenfoth,Nienaber_Ralf,david_c_eckert,AfD_Karlsruhe,Strotebeck_AfD,afdkvcwfds,AfD_Zwickau,w_boncourt,AfD_Fraktion_SH,h_weyel,AfDFraktionRLP,MarkusMatzerath,MaryKhan77,AfD_OF_Land,AfD_Jahn,Holger_Lucius,Biesel_AfD,AfD_Stormarn,AfDDuesseldorf,BJPrzybylla,EdwinMichel18,AfD_SE,thomasroecke,Alice_Weidel,ThienStefan,ErwinLudwig_AfD,AfD_KV_FS_PAF,Eure_LeylaBilge,Rene_Springer,Andi_Schumacher,PatAndreasBauer,TomaszFroelich,Thomas120683,AfD_Whv,Marius_Radtke,JeanetteAuricht,HPStauch,AfD_Vechta,AFD_WK_65,ErtelDietmar,ProfMaier,Vincentz_AfD,AfD_Muelheim,D_Wamhoff_AfD,AfD_Dueren,afd_krefeld,D14112015,KV_HStadt,AfDSchmidt,JA_Neuss,skorbiene,helmutwaniczek,AfD_Lueneburg,Pankow_im_AGH,M_HarderKuehnel,JoanaCotar,AfD_KV_Biberach,M_Schild_AfD_UN,Kleve_AfD,AfD_Oberhausen,Helmut_Seifen,PetrBystronAfD,Denny_Jankowski,DirkSpaniel,Minden_AfD,Dietmar_Gedig,JA_Essen,Theresa_Wittig,JABVDuesseldorf,pfahler_m,AfDrus,JA_Bremen,AfD_Eifelkreis,MarcBernhardAfD,Ludwig_AfD,AfDSaar,GuidoReil,d_lutzow,JA_Lueneburg,AfD_Gladbach,Corina_Buelow,Tino_Chrupalla,AfD_BN,Marzischewski,AfdHarz,AfD_Luebeck,StefanKeuterAfD,AfD_FraktionNRW,MdLFernandes,AFDLKLeipzig,UlrichSiegmund,JeanPascal_Hohm,SabineSchueler,AfD_Chemnitz,edgar_naujok,Reyners_AfD,hanno_bachmann,AfDKreisMK,AfD_Guetersloh,AfD_RTK,WittgensteinAfD,Joerg_Nobis_AfD,torben_braga,StefanRaepple,AfD_Leverkusen,Kalleskoppel,KlinglerBernd,EnricoKomning,afd_ik_gth,AfDFraktionBVV,AfD_RZ,AfD_Lieschke,AndreasWildAfD,ollimoe,AfD_Mitte,Nicolaus_Fest,AfD_Radio,AfD_Television,FranziskaHoff,andreaslichert,AfDHHWandsbek21,MBueschges,JA_Augsburg,karsten_franck,AfD_Limburg,afdatr,Afd_OSN,AfD_Dessau,AfDFraktion_MV,JA_Deutschland,AfD_Bv_HH_Nord,UweGewiese,VolkerOlenicak,Daniel_Roi_AfD,AfDFraktionBW,AfDFraktionLSA,MHehouse,JoachimPaul_AfD,UbbelohdeBerlin,AfDWMK,RalfOezkara,jschock76,NicolaiBoudaghi,AlexTassisAfD,AfDLindemann,Uwe_Junge_MdL,AfD_Wf,KatjaJungBuhl,AfD_Kolbermoor,Leif_Erik_Holm,AfD_HD,afdhomburg,AfD_Pinneberg,AFD_Heidekreis,MatzeBuettner,haraldlaatsch,Schlembach_AfD,jochen_rohrberg,spiegelbergafd,Marcus_Buehl,ja_kassel,DrRainerBalzer,udostein_mdl,Rausch_Christof,AfD_SOK,Wagner_AfD_MdL,AfD_KV_Diepholz,Iris_AfD_MdL,AfD_Wandsbek,ClausSchaffer,AfD_Ahaus,Schneider_AfD,Siegen_AfD,AfD_GE,AfDKoeln,AMassolle,Jochen_Haug,JA_BaWue,Georg_Pazderski,stsc_,AfD_Duisburg,AfD_Aachen,Fuer_Warendorf,StBrandner,Ahlenerin,TheoGottschalk,Jan_Bollinger,AfD_Mannheim,Joerg_Meuthen,AfDimKreistagGT,laatsch_k,KEbnerSteiner,MarkmannAnja,AfDMelsungen,AfDRodenkirchen,LarsSteinke,AfD_Frankenthal,afd_mei,AfD_Kiel,MdB_Lucassen,afd_osterholz,afd_verden,AfdMatzke,AfD_Kamen,AfD_Deggendorf,Galau_MdL,geisteskerker,LoriBerlinTK,JorgJunger,Rekonstrukteur,RogerBeckamp,SabineGollombe1,AfD_Paderborn,brandenburg_ja,DanielJ83920495,Witt_Uwe,AfD_Fraktion_HH,AfD_LV_SH,ElsnervonGronow,ja_hessen,WiedemannChris,WieseFranz,Frohnmaier_AfD,Marc_Jongen,NicoKoehler_C,chr_cremer1982,JA_Koeln,NTrubner,AfD_Kassel,AfD_Ehrenfeld,MdL_Schade,RLP_AfD,AfDLudwigshafen,AidABund,LionEdler,AfDBorken,christianlueth,AfD_Hamburg,AfD_Oberberg,Herrmann_AfD,WaldemarHerdt,Ulrich_Oehme,jessica_malisch,Friedhoff_AfD,Heitmann_EU,Keith_AfD,FrankHansel,AfDBocholt,AfD_Detlev_Frye,jaweschmi,afd_essen,PoggenburgAndre,JANiedersachsen,NicVogel_AfD,alternativeNMS,wollihoodsecret,AfD_SLT,AfDFraktionAGH,AfDSoest,AfD_KV_Northeim,AfD_LSA,Spenrath_AfD,Robby_Schlund,Nicole_Hoechst,AfD_Sachsen_ASA,AfD_FraktionBB,AfDNbg,AfD_MSE,AfD_FW,RobertBuckAfD,AfD_Dresden,BirgitBessin,robert_farle,HattelSusanne,SvenKachelmann,MoellerAfD,AfD_VG,AlternativeNRW,HenHoffgaard,FFillbach,WeissAfD,AlternativeNds,AfD_Thueringen,BjoernHoecke,Mario_Hau_AfD,AfdNiederkassel,AfDKREUZNACH,AfD_Magdeburg,Loose_AfD,AfDLichtenberg,mrosek1958,SaschaUlbrich,markus_mohr,MaxEricThiel,uwe_kamann,M_Reichardt_AfD,AfDDortmund,AfD_Rdorf,Renner_AfD,FrankScholtysek,Matzke3Matzke,RichardMol_,1MartinSchiller,HelmutBirke,TobiasMPeterka,AFDHHMITTE,AfD_Muenster,FredHerzogAfD,AfDVerOhz,TBrackmann,AfD_HB,ChWaldheim,Kristin_Brinker,AfDBerlin,AfD_Trier,AfDLDS,JaninKlatt,JA_Muenster,AfDBochum,Damian_Lohr,afdforchheim,magnusbecker,SteffenKoeniger,HofmannJochen,ChristinThuene,MVallendar,axelgehrke,ChrAfD,MatthiasNiebel,ReinhardRupsch,justineb98,AlternativeEU,wdliese,HughBronson_AfD,AfD_Darmstadt,AfDPankow,Schulze_AfD,AfDRatsgruppeMS,KaufmannAfD,dr_karin_kaiser,AfDErzgebirge,AfD_MV,Familienforum,AlternativeBW,ttte94,EugenCiresa,DGrtzmann,Frank_Pasemann,AfD_Hessen,ProtschkaStepha,BeateProemm,AfD_Bayern,BerndMichelau,Keineausrede,DrKonradAdam,Andreas_Kemper_,HeriFriedmann,GWalgerDemolsky,KayGottschalk1,mchlniedzulka,JulianFlak,_annaleisten,KrahMax,Iceman030,julianHermn,AliceBlanck,PierreJungAfD,ulschzi,AfD,GtzFrmming,Beatrix_vStorch,NTautermann,FScheermesser,Norjenta,andreasroesler,wuppersieg,t_orth,mikubv2012,JensChristoph1,MBolsch,JessicaBiessman,Huetter_Carsten,AfDDinslaken,R_Hartwig_AfD,GuidoDietel,AfD_RBK,NRW_JA,Alex_v_Wrese,Mattes1969,Huenich,bernd471,Buergerwohl,JoeyGerlach,twittschler,Manuel_Wurm,PeterBoehringer,MalteKaufmann,sboyens,Daniel_Buhl_AfD,Wollihood,evermann,ronaldglaeser,maschmi73,Eckleben,Uwe_Schulz_AfD'.toWildFromTo()}},
	{name: 'afdkompakt_bundesvorstand',     query: {q:'AndreasKalbitz,Joachim_Kuhs,Alice_Weidel,GuidoReil,Georg_Pazderski,Joerg_Meuthen,SteffenKoeniger,Frank_Pasemann,ProtschkaStepha,KayGottschalk1,Beatrix_vStorch'.toWildFromTo()}},
	{name: 'afdkompakt_junge_alternative',  query: {q:'TB_Pol,JA_Bayern,StefanAdler91,ReimondHoffmann,Berliner_JA,ja_detmold,MaFreuJA,rebi_adam,JA_Wiesbaden,SimonDennen,leschik_afd,david_c_eckert,MaryKhan77,Biesel_AfD,Andi_Schumacher,PatAndreasBauer,JA_Neuss,JA_Essen,JABVDuesseldorf,JA_Bremen,JA_Augsburg,JA_Deutschland,spiegelbergafd,ja_kassel,JA_BaWue,LarsSteinke,Rekonstrukteur,brandenburg_ja,ja_hessen,Frohnmaier_AfD,JA_Koeln,jessica_malisch,jaweschmi,JANiedersachsen,SvenKachelmann,FFillbach,WeissAfD,markus_mohr,MaxEricThiel,Matzke3Matzke,JA_Muenster,Damian_Lohr,_annaleisten,julianHermn,NTautermann,Norjenta,NRW_JA,twittschler,Manuel_Wurm'.toWildFromTo()}},
	{name: 'afdkompakt_landessprecher',     query: {q:'AndreasKalbitz,Frank_Magnitz,Martin_Sichert,Dana_Guth_AfD,thomasroecke,Helmut_Seifen,WittgensteinAfD,RalfOezkara,Uwe_Junge_MdL,Leif_Erik_Holm,Georg_Pazderski,Marc_Jongen,MoellerAfD,BjoernHoecke'.toWildFromTo()}},
	{name: 'afdkompakt_landesverbaende',    query: {q:'AfDSaar,AfD_LV_SH,RLP_AfD,AfD_Hamburg,AfD_LSA,AfD_Sachsen_ASA,AlternativeNRW,AlternativeNds,AfD_Thueringen,AfD_HB,AfDBerlin,AfDBrandenburg,AfD_MV,AlternativeBW,AfD_Hessen,AfD_Bayern'.toWildFromTo()}},
	{name: 'afdkompakt_landtagsabgeordnete',query: {q:'DieterNeuendorf,AndreasKalbitz,LPBerg_MdL,lutzhecker_mdl,CarolaWolle,HagenKohlMdL,afdgehlmann,tommytabor,bothe_stephan,P_Plattform,AndreWendtMdL,Dana_Guth_AfD,heinermerz,StefanHerreMdL,WMuhsal,ChristianBlex,GottfriedCurio,Strotebeck_AfD,thomasroecke,HPStauch,Vincentz_AfD,Pankow_im_AGH,Helmut_Seifen,MdLFernandes,UlrichSiegmund,hanno_bachmann,WittgensteinAfD,Joerg_Nobis_AfD,StefanRaepple,AfD_Lieschke,VolkerOlenicak,Daniel_Roi_AfD,JoachimPaul_AfD,UbbelohdeBerlin,AlexTassisAfD,AfDLindemann,Uwe_Junge_MdL,MatzeBuettner,haraldlaatsch,spiegelbergafd,DrRainerBalzer,udostein_mdl,Wagner_AfD_MdL,Iris_AfD_MdL,ClausSchaffer,Georg_Pazderski,Jan_Bollinger,Joerg_Meuthen,Galau_MdL,RogerBeckamp,WieseFranz,MdL_Schade,Keith_AfD,FrankHansel,jaweschmi,PoggenburgAndre,NicVogel_AfD,BirgitBessin,robert_farle,MoellerAfD,WeissAfD,BjoernHoecke,Loose_AfD,FrankScholtysek,Kristin_Brinker,Damian_Lohr,SteffenKoeniger,MVallendar,HughBronson_AfD,Keineausrede,HeriFriedmann,GWalgerDemolsky,FScheermesser,JessicaBiessman,Huetter_Carsten,twittschler,Wollihood,ronaldglaeser'.toWildFromTo()}},
	{name: 'afdkompakt_landtagsfraktionen', query: {q:'AfD_FraktionNds,AfD_ThL,AfD_Fraktion_SH,AfDFraktionRLP,AfD_FraktionNRW,AfDFraktion_MV,AfDFraktionBW,AfDFraktionLSA,AfD_Fraktion_HH,AfD_SLT,AfDFraktionAGH,AfD_FraktionBB'.toWildFromTo()}},
	{name: 'afdkompakt_lv_baden_wuerttemberg',query: {q:'AfD_OV_Kehl,AfD_KV_Ortenau,LPBerg_MdL,Joachim_Kuhs,AfDStuttgart,CarolaWolle,AfD_OV_BEW,AfD_Esslingen,AfD_Pf_Enzkreis,Reutlinger_AfD,ReimondHoffmann,BraunAfD,Th_Seitz_AfD,heinermerz,AfD_Ludwigsburg,StefanHerreMdL,Martin_Hess_AfD,SimonDennen,AfD_Karlsruhe,afdkvcwfds,Alice_Weidel,ThienStefan,Andi_Schumacher,TomaszFroelich,HPStauch,ProfMaier,AfDSchmidt,AfD_KV_Biberach,DirkSpaniel,MarcBernhardAfD,StefanRaepple,KlinglerBernd,ollimoe,AfDFraktionBW,RalfOezkara,AfD_HD,DrRainerBalzer,udostein_mdl,AfD_SOK,JA_BaWue,AfD_Mannheim,Joerg_Meuthen,MarkmannAnja,JorgJunger,DanielJ83920495,Frohnmaier_AfD,Marc_Jongen,MaxEricThiel,TBrackmann,MatthiasNiebel,AlternativeBW,AliceBlanck,MalteKaufmann'.toWildFromTo()}},
	{name: 'afdkompakt_lv_bayern',          query: {q:'AfD_KV_IN_EI,mueller_mdb,JA_Bayern,Martin_Sichert,AfD_KULIF,AfDHochfranken,CorinnaMiazga,AfD_HeikeThemel,AfD_KV_FS_PAF,PetrBystronAfD,JA_Augsburg,AfD_Kolbermoor,KEbnerSteiner,AfD_Deggendorf,AfDNbg,SvenKachelmann,TobiasMPeterka,afdforchheim,ttte94,ProtschkaStepha,AfD_Bayern,PeterBoehringer'.toWildFromTo()}},
	{name: 'afdkompakt_lv_berlin',          query: {q:'DieterNeuendorf,tommytabor,FalkRodig,JoergSobolewski,Berliner_JA,GottfriedCurio,Marius_Radtke,JeanetteAuricht,Pankow_im_AGH,SabineSchueler,hanno_bachmann,AfDFraktionBVV,AndreasWildAfD,Nicolaus_Fest,FranziskaHoff,karsten_franck,UbbelohdeBerlin,AfDLindemann,haraldlaatsch,Georg_Pazderski,LoriBerlinTK,SabineGollombe1,FrankHansel,wollihoodsecret,AfDFraktionAGH,HattelSusanne,WeissAfD,AfDLichtenberg,AfD_Rdorf,FrankScholtysek,FredHerzogAfD,Kristin_Brinker,AfDBerlin,MVallendar,HughBronson_AfD,AfDPankow,BeateProemm,Iceman030,GtzFrmming,Beatrix_vStorch,FScheermesser,MBolsch,JessicaBiessman,Wollihood,ronaldglaeser'.toWildFromTo()}},
	{name: 'afdkompakt_lv_brandenburg',     query: {q:'AfDLG_BRB,afd_nauen,AfD_EE,afd_ffo,SteffenKotre,AfD_Potsdam_SVV,NKleinwaechter,papenfoth,Eure_LeylaBilge,Rene_Springer,AFD_WK_65,ErtelDietmar,pfahler_m,d_lutzow,JeanPascal_Hohm,Galau_MdL,brandenburg_ja,WieseFranz,MdL_Schade,LionEdler,AfD_Detlev_Frye,AfD_FraktionBB,BirgitBessin,AfDLDS,SteffenKoeniger,_annaleisten,Huenich,maschmi73'.toWildFromTo()}},
	{name: 'afdkompakt_lv_bremen',          query: {q:'Frank_Magnitz,JA_Bremen,AlexTassisAfD,AfD_HB'.toWildFromTo()}},
	{name: 'afdkompakt_lv_hamburg',         query: {q:'DietmarWagner22,AfDHHWandsbek21,AfD_Bv_HH_Nord,AfD_Wandsbek,Rekonstrukteur,AfD_Fraktion_HH,AlexanderCKuhn2,AfD_Hamburg,RobertBuckAfD,AFDHHMITTE,ChWaldheim,KayGottschalk1,Eckleben'.toWildFromTo()}},
	{name: 'afdkompakt_lv_hessen',          query: {q:'kuper_elena,StefanAdler91,AfD_MR_BID,JA_Wiesbaden,AfD_GG_Sued,w_boncourt,MaryKhan77,AfD_OF_Land,EdwinMichel18,PatAndreasBauer,M_HarderKuehnel,JoanaCotar,AfD_RTK,andreaslichert,AfD_Limburg,AfDWMK,jschock76,ja_kassel,AfDMelsungen,ja_hessen,AfD_Kassel,HofmannJochen,ChristinThuene,AfD_Darmstadt,AfD_Hessen,DrKonradAdam,t_orth,mikubv2012,Manuel_Wurm,Uwe_Schulz_AfD'.toWildFromTo()}},
	{name: 'afdkompakt_lv_mecklenburg_vorpommern',query: {q:'PetraFederau,MdLFernandes,EnricoKomning,AfDFraktion_MV,Leif_Erik_Holm,stsc_,AfD_MSE,AfD_FW,AfD_VG,HenHoffgaard,AfD_MV,ulschzi,andreasroesler'.toWildFromTo()}},
	{name: 'afdkompakt_lv_niedersachsen',   query: {q:'AfD_FraktionNds,afd_kv,JoernKoenigAfD,kaiser_mt,bothe_stephan,KestnerJens,AfDFraktionBS,Dana_Guth_AfD,rebi_adam,AfdCelle,TBojani,heiner_rehnen,Thomas120683,AfD_Whv,AfD_Vechta,KV_HStadt,skorbiene,AfD_Lueneburg,JA_Lueneburg,Marzischewski,afdatr,Afd_OSN,AfD_Wf,AFD_Heidekreis,jochen_rohrberg,AfD_KV_Diepholz,AMassolle,LarsSteinke,afd_osterholz,afd_verden,WaldemarHerdt,Friedhoff_AfD,JANiedersachsen,AfD_KV_Northeim,AlternativeNds,AfDVerOhz,Familienforum,mchlniedzulka,Norjenta,JensChristoph1,bernd471'.toWildFromTo()}},
	{name: 'afdkompakt_lv_nordrhein_westfalen',query: {q:'afd_kreis_lippe,Jacobi_AfD,JuergenSprick,ja_detmold,LinnKuppitz,handt_afd,EspendillerM,TomCologne4,Helferich_AfD,Bottrop_AfD,ChristianBlex,AfDMettmann,AfD_Gummersbach,leschik_afd,UdoHemmelgarn,Nienaber_Ralf,david_c_eckert,Strotebeck_AfD,h_weyel,MarkusMatzerath,AfD_Jahn,Holger_Lucius,AfDDuesseldorf,thomasroecke,Vincentz_AfD,AfD_Muelheim,AfD_Dueren,afd_krefeld,JA_Neuss,helmutwaniczek,M_Schild_AfD_UN,Kleve_AfD,AfD_Oberhausen,Helmut_Seifen,Minden_AfD,Dietmar_Gedig,JA_Essen,JABVDuesseldorf,AfDrus,GuidoReil,AfD_Gladbach,Corina_Buelow,AfD_BN,StefanKeuterAfD,AfD_FraktionNRW,Reyners_AfD,AfDKreisMK,AfD_Guetersloh,AfD_Leverkusen,AfD_Mitte,MBueschges,MHehouse,NicolaiBoudaghi,Schlembach_AfD,Rausch_Christof,Wagner_AfD_MdL,Iris_AfD_MdL,AfD_Ahaus,Schneider_AfD,Siegen_AfD,AfD_GE,AfDKoeln,Jochen_Haug,AfD_Duisburg,AfD_Aachen,Fuer_Warendorf,Ahlenerin,TheoGottschalk,AfDimKreistagGT,laatsch_k,AfDRodenkirchen,MdB_Lucassen,AfdMatzke,AfD_Kamen,RogerBeckamp,AfD_Paderborn,Witt_Uwe,ElsnervonGronow,chr_cremer1982,JA_Koeln,AfD_Ehrenfeld,AfDBorken,AfD_Oberberg,jessica_malisch,Heitmann_EU,Keith_AfD,AfDBocholt,afd_essen,NicVogel_AfD,AfDSoest,Spenrath_AfD,afdwtal,AlternativeNRW,AfdNiederkassel,Loose_AfD,SaschaUlbrich,markus_mohr,uwe_kamann,AfDDortmund,Renner_AfD,Matzke3Matzke,RichardMol_,1MartinSchiller,HelmutBirke,AfD_Muenster,JA_Muenster,AfDBochum,magnusbecker,ReinhardRupsch,wdliese,Schulze_AfD,AfDRatsgruppeMS,BerndMichelau,Andreas_Kemper_,GWalgerDemolsky,KayGottschalk1,julianHermn,PierreJungAfD,wuppersieg,AfDDinslaken,R_Hartwig_AfD,GuidoDietel,AfD_RBK,NRW_JA,Alex_v_Wrese,Mattes1969,JoeyGerlach,twittschler,sboyens'.toWildFromTo()}},
	{name: 'afdkompakt_lv_rheinland_pfalz', query: {q:'AndreasBleckMdB,AfD_MainzBingen,S_Muenzenmaier,ScheilDr,AfDFraktionRLP,ErwinLudwig_AfD,AfD_Eifelkreis,JoachimPaul_AfD,Uwe_Junge_MdL,Jan_Bollinger,AfD_Frankenthal,RLP_AfD,AfDLudwigshafen,Nicole_Hoechst,FFillbach,Mario_Hau_AfD,AfDKREUZNACH,AfD_Trier,Damian_Lohr,HeriFriedmann'.toWildFromTo()}},
	{name: 'afdkompakt_lv_saarland',        query: {q:'lutzhecker_mdl,ChrWirthMdB,IreneLienshoeft,Biesel_AfD,AfDSaar,afdhomburg'.toWildFromTo()}},
	{name: 'afdkompakt_lv_sachsen',         query: {q:'VerHartmannAfD,AndreWendtMdL,JensMaierAfD,JanEndert,AfD_Zwickau,BJPrzybylla,Tino_Chrupalla,AFDLKLeipzig,AfD_Chemnitz,edgar_naujok,afd_mei,NicoKoehler_C,Herrmann_AfD,Ulrich_Oehme,AfD_SLT,AfD_Sachsen_ASA,AfD_Dresden,JaninKlatt,AfDErzgebirge,KrahMax,NTautermann,Huetter_Carsten'.toWildFromTo()}},
	{name: 'afdkompakt_lv_sachsen_anhalt',  query: {q:'TB_Pol,HagenKohlMdL,afdgehlmann,P_Plattform,DS_AfD,Buettner_MdB,RonnyKumpf,KayUweZiegler71,D14112015,AfdHarz,UlrichSiegmund,AfD_Lieschke,AfD_Dessau,UweGewiese,VolkerOlenicak,Daniel_Roi_AfD,AfDFraktionLSA,MatzeBuettner,spiegelbergafd,WiedemannChris,NTrubner,jaweschmi,PoggenburgAndre,AfD_LSA,robert_farle,AfD_Magdeburg,mrosek1958,M_Reichardt_AfD,Frank_Pasemann'.toWildFromTo()}},
	{name: 'afdkompakt_lv_schleswig_holstein',query: {q:'AfDOstholstein,AfD_Fraktion_SH,AfD_Stormarn,AfD_SE,D_Wamhoff_AfD,AfD_Luebeck,WittgensteinAfD,Joerg_Nobis_AfD,Kalleskoppel,AfD_RZ,KatjaJungBuhl,AfD_Pinneberg,ClausSchaffer,AfD_Kiel,AfD_LV_SH,alternativeNMS,axelgehrke,dr_karin_kaiser,DGrtzmann,JulianFlak,Daniel_Buhl_AfD,evermann'.toWildFromTo()}},
	{name: 'afdkompakt_lv_thueringen',      query: {q:'KnieseTosca,DrFriesenMdB,VerenaSigmumd,AfD_ThL,WMuhsal,gregormodos,Denny_Jankowski,Theresa_Wittig,Ludwig_AfD,torben_braga,afd_ik_gth,Marcus_Buehl,StBrandner,geisteskerker,Robby_Schlund,MoellerAfD,AfD_Thueringen,BjoernHoecke,justineb98,KaufmannAfD,Keineausrede,Buergerwohl'.toWildFromTo()}},
	{name: 'afdkompakt_unterstuetzer',      query: {q:'MutFuerWahrheit,afdkinzigtal,AfD_Tweets,Lettinnen,AfD_Engagement,AfDUnterstuetze,Zeit_fuer_AfD,AfD_Freunde,IchwaehleAfD,2018_AfDwaehlen,PinocchioPresse,Mundaufmachen,NickKuenzel,AfD_Support,_macmike,AfDBrandenburg,balleryna,aotto1968_2,lawyerberlin'.toWildFromTo()}},
	{name: 'afrin',                         query: {q:'afrin'}},
	{name: 'amadeuantonio',                 query: {q:'amadeuantonio'.toWildFromTo()}},
	{name: 'bahn',                          query: {q:'bahn OR bahnhof OR hbf OR zug OR bahnsteig OR to:dbbahn OR dbbahn OR fahrradabteil OR ice OR schaffner OR bordbistro OR verspätung OR anschluss OR umsteigen OR ansage OR anzeige OR stellwerk OR störung OR weiche', lang:'de'}},
//	{name: 'berlin',                        query: {q:'', geocode:'52.5,13.4,50km'}},
	{name: 'bild',                          query: {q:'BILD,BILD_Berlin,BILD_Digital,BILD_Frankfurt,BILD_Hamburg,BILD_Muenchen,BILD_News,BILD_Politik,BILD_TopNews,jreichelt'.toFromTo()}},
	{name: 'brexit',                        query: {q:'brexit'}},
	{name: 'bundesregierung',               query: {q:'SilberhornMdB,Mi_Muentefering,RitaHaglKehl,SvenjaSchulze68,LambrechtMdB,katarinabarley,StSLindner,AdlerGunther,Thomas_Bareiss,AnjaKarliczek,AnetteKramme,MiRo_SPD,JochenFlasbarth,guenterkrings,MJaegerT,W_Schmidt_,peteraltmaier,LangeMdB,jensspahn,RegSprecher,DoroBaer,fuchtel,zierke,thomasgebhart,rischwasu,AndiScheuer,NielsAnnen,KerstinGriese,OlafScholz,ChristianHirte,meister_schafft,JuliaKloeckner,HeikoMaas,SteffenBilger,petertauber,FlorianPronold,HBraun,BoehningB,wanderwitz,hubertus_heil'.toWildFromTo()}},
	{name: 'cuentalo',                      query: {q:'cuentalo'}},
	{name: 'deutsche_mep',                  query: {q:'RadtkeMdEP,jakob_eu,Joerg_Meuthen,MichaelDetjen,MariaHeubuch,ThomasMannEP,martina_michels,albert_dess,JStarbatty,peter_jahr,markuspieperMEP,Stefan_Eck_MEP,MHohlmeier,GabrielePreuss,TrebesiusMdEP,ElmarBrok_MEP,MepMCramer,Arne_Gericke,sabineverheyen,Bernd_Koelmel,UdoBullmann,GabiZimmerMEP,ConstanzeKrehl,WestphalKerstin,MartinaWernerEU,schulzeeuropa,Dr_KlausBuchner,MarkusFerber,BirgitSippelMEP,ArndtKohn,KaufmannSylvia,RebHarms,thaendel,MarcusPretzell,ErnstCornelia,ArneLietz,jo_leinen,langen_werner,PeterSimonMdEP,ANiebler,blochbihler,schirdewan,UliMuellerMdEP,IsmailErtug,TerryReintke,inge_graessle,HansOlafHenkel,PeterSimonMEP,WernerKuhnMdEP,AxelVossMdEP,michaelgahler,MartinHaeusling,udovoigt,joachimzeller,peterliese,martinkastler,burkhardbalz,EuropaJens,Andreas_Schwab,UlrikeRodust,MarionWinter,helmutscholz,nadjahirsch,bueti,MartinSonneborn,ManfredWeber,knufleckenstein,woelken,caspary,davidmcallister,berndlange,JanAlbrecht,sven_giegold,SkaKeller,HelgaTruepel,Senficon'.toWildFromTo()}},
	{name: 'elysee',                        query: {q:'elysee'.toWildFromTo()}},
	{name: 'emmanuelmacron',                query: {q:'emmanuelmacron'.toWildFromTo()}},
	{name: 'floridashooting',               query: {q:'emmagonzalez OR floridahighschool OR floridaschoolshooting OR floridashooter OR floridashooting OR floridastrong OR guncontrol OR guncontrolnow OR gunlawsnow OR gunreformnow OR gunsafety OR gunsense OR gunshooting OR highschoolshooter OR march4ourlives OR marchforourlives OR massshooting OR massshootings OR neveragain OR nrabloodmoney OR parklandschoolshooting OR parklandshooting OR righttobeararms OR schoolshooting'}},
	{name: 'floridashooting2',              query: {q:'neveragain OR gunreformnow OR guncontrolnow OR guncontrol OR marchforourlives OR parkland OR parklandschoolshooting OR floridaschoolshooting OR parklandshooting OR #nra OR floridashooting OR nrabloodmoney OR banassaultweapons OR gunsense OR emmagonzalez OR schoolshooting OR parklandstudents OR parklandstudentsspeak OR gunviolence OR floridashooter OR wecallbs OR studentsstandup OR parklandstrong'}},
	{name: 'groko',                         query: {q:'groko'}},
	{name: 'heimat',                        query: {q:'heimat'}},
	{name: 'heimathorst',                   query: {q:'heimathorst OR heimatministerium'}},
	{name: 'iranprotests',                  query: {q:'تظاهرات_سراسری OR IranProtests'}},
	{name: 'iranprotests2',                 query: {q:'iranprotests OR تظاهرات_سراسرى OR مظاهرات_ايران OR تظاهرات_سراسری OR تظاهرات_سراسري'}},
	{name: 'jensspahn',                     query: {q:'jensspahn'.toWildFromTo()}},
	{name: 'kippa',                         query: {q:'kippa', lang:'de'}},
	{name: 'lufthansa',                     query: {q:'lufthansa OR lufthansablue OR explorethenew'}},
	{name: 'mdb_bundestag',                 query: {q:'peteraumer,JoernKoenigAfD,BijanDjir,FrStraetmanns,katharina_kloke,KirstenKappert,TillMansmann,SilberhornMdB,JudithSkudelny,Mi_Muentefering,Jacobi_AfD,margit_stumpp,MdB_Schreiber,Frank_Magnitz,EstherDilcher,MBiadaczMdB,busen_mdb,G_UllrichFDP,Philipp_Amthor,MieruchMario,Schmidt_MdB,reuther_bernd,axel_knoerig,MdB_Freihold,reinholdmdb,ChrWirthMdB,Martin_Sichert,BraunAfD,HartmutEbbing,JensMaierAfD,DrFriesenMdB,Th_Seitz_AfD,olafinderbeek,SiemtjeMoeller,SteffenKotre,AndreasBleckMdB,Brehm_inNBGNord,koehler_fdp,EspendillerM,BrunnerGanzOhr,Buettner_MdB,DanyWagner_DA,SchaeferCDU,carina_konrad,Martin_Hess_AfD,SybilleBenning,CorinnaMiazga,UliGroetsch,NKleinwaechter,S_Muenzenmaier,mvabercron,ChristophFDP,sandra_weeser,JBrandenburgFDP,GustavHerzogMdB,CarloCronenberg,AchimKessler,UdoHemmelgarn,GottfriedCurio,Nienaber_Ralf,KlausMindrup,NinaScheer_SPD,h_weyel,RitaHaglKehl,KatharinaKloke,Alice_Weidel,Rene_Springer,c_bernstiel,Oehmeulrich,VoepelDirk,WSchinnenburg,nicolabeerfdp,ManjaSchuele,HoubenReinhard,katrin_staffler,hans_michelbach,ProfMaier,StephPilsinger,M_HarderKuehnel,DirkWiese4,JoanaCotar,PetrBystronAfD,DirkSpaniel,DerDanyal,mischrodi,MarcBernhardAfD,Dr_Rainer_Kraft,BraFDP,mueller_sepp,dirk_heidenblut,Tino_Chrupalla,GruebelMdb,StefanKeuterAfD,HellmichMdB,MuellerChemnitz,EnricoKomning,FGuentzler,Paul_Podolay,Bruno_Hollnagel,Neumann_AfD,Karsten_Hilse,LeniBreymaier,c_jung77,Leif_Erik_Holm,josip_juratovic,SabinePoschmann,Marcus_Buehl,MdB_Ulrike_Bahr,Schneider_AfD,Jochen_Haug,StBrandner,LambrechtMdB,HPFriedrichCSU,DrLaunert,MdB_Lucassen,StefingerMdB,DorisAchelwilm,dr_tiemann,HajdukBundestag,goekayakbulut,MichaelFrieser,ZdebelHubertus,Witt_Uwe,ElsnervonGronow,Norbert_MdB,MichaelKuffer,jankortemdb,Frohnmaier_AfD,Marc_Jongen,SchickGerhard,katarinabarley,stamm_fibich,KorkmazGT,YvonneMagwas,UdoSchiefner,thlutze,DerLenzMdB,CarstenTraeger,Toens_NRW04,vonGottberg_AfD,Jan_Nolte_AfD,Gminder_AfD,HessenkemperAfD,Herrmann_AfD,WaldemarHerdt,Ulrich_Oehme,PeterFelser,Friedhoff_AfD,matthiasbartke,AWidmannMauz,victorperli,stadler_svenja,Karl_Lauterbach,Thomas_Ehrhorn,JensKestnerAfD,AndreasSteier,KartesMdB,Siegbert_Droese,Heiko_Wildberg,Spenrath_AfD,Robby_Schlund,Nicole_Hoechst,MAStrackZi,BerndBaumannAfD,michael_g_link,GabyKatzmarek,Peter_Stein_CDU,MarcusHeld_SPD,DeRidder_MdB,UllaJelpke,AlexanderRadwan,michaelgrossmdb,fritzfelgentreu,Thomas_Bareiss,cdu_schweiger,ruppert_stefan,KoobMar,mrosek1958,Lothar_Binding,Conni_Moehring,uwe_kamann,M_Reichardt_AfD,Renner_AfD,ZaklinNastic,Huber_AfD,AnjaKarliczek,TobiasMPeterka,Kai_Whittaker,GerdesMdB,BetMueller,MdbWendt,RonjaKemmer,muellerboehm,OWvonHoltz,DietmarBartsch,UliFreese,MarkusTressel,ZieglerMdB,Schwarz_MdB,TErndl,ABaerbock,thomas_jurk,Dr_Roy_Kuehne,dittmarsabine,HoldingEuropa,axelgehrke,Hansjoerg_Durz,annachristmann,mb_hb,ttte94,GydeJ,crueffer,HHirte,Frank_Pasemann,julia_verlinden,SusannRuethrich,AnetteKramme,AndreaLindholz,RenateKuenast,lier_e,EskenSaskia,NordMdb,ProtschkaStepha,oezdemir_spd,joerg_cezanne,uhl_markus,MarkHauptmann,jojoschraps,Stettenchris,th_sattelberger,KirstenTackmann,Florian_Ossner,KayGottschalk1,AlexanderSNeu,MatthiasHauer,ChrisKuehn_mdb,BriHasselmann,Achim_P,s_schwartze,MiRo_SPD,EUTheurer,KarstenMoering,SylviaPantel,sebast_hartmann,berlinliebich,MetinHakverdi,arnoklare,JanMetzler,GabiWeberSPD,A_Gloeckner,MechthildHeil,StefanRouenhoff,susanne_mittag,GruenClaudia,WilfriedOellers,GregorGysi,MarcusWeinberg,ulschzi,NicoleGohlke,FOstendorff,SylviaGabelmann,b_riexinger,GtzFrmming,Beatrix_vStorch,uihnen,MWBirkwald,FlorianPost,JanaSchimke,MatthiasGastel,SteffenSonja,GoeringEckardt,HaraldWeinberg,UllmannMdB,JuttaKrellmann,LieblingXhain,MGrosseBroemer,sigmargabriel,MaikBeermann,lisapaus,MTodtenhausen,PetraPauMaHe,danielakolbe,Timon_Gremmels,JTrittin,FrankeEdgar,MargareteBause,KonstantinKuhle,BabettesChefin,ULechte,KLeikert,helgelindh,JensZimmermann1,Peter_Beyer,ToniHofreiter,StefanGelbhaar,ch_buchholz,DFoest,michael_thews,UweSchummer,hahnflo,armin_schuster,guenterkrings,JoWadephul,UlliNissen,peteraltmaier,PSchnieder,PeterAumer_,HeikeHaensel,LangeMdB,KarambaDiaby,pascalmeiser,jensspahn,GaHeinrich,Petra_Sitte_MdB,ThomasOppermann,ThomasHitschler,PaulZiemiak,R_Hartwig_AfD,badulrichmartha,SteinekeCDU,SabineLeidig,yasmin_fahimi,KaczmarekOliver,Katrin_Werner,filizgreen,BaerbelKofler,jensbeeck,SBarrientosK,Buergerwohl,agnieszka_mdb,LindaTeuteberg,felixschreiner,Axel_Fischer,Johann_Saathoff,MatthiasHeider,HeikeBrehmerMdB,markuskurthmdb,Lambsdorff,JensKoeppen,HESommer,NikolasLoebel,IreneMihalic,DoroBaer,SevimDagdelen,lgbeutin,anjaweisgerber,c_lindner,HildeMattheis,NiemaMovassat,TinoSorge,KaiGehring,fdp_hessel,UteVogt,MarcoBuschmann,stephankuehn,GittaConnemann,PeterBoehringer,schneidercar,dieschmidt,groehe,BjoernSimon,MichaelLeutert,hacker_fdp,Oliver_Krischer,AndrejHunko,NilsSchmid,JoSteiniger,oezoguz,Birke_Bull,FalkoMohrs,fjunge,StephanThomae,LINKEPELLI,MartinaRenner,UlrichLange,fuchtel,KarinStrenz,ernst_klaus,zierke,CPetryMdB,SeesternPauly,Manfredbehrens,monikalazar,olavgutting,soerenbartol,stephanharbarth,Wellenreuther,PeterWeissMdB,CarstenMuellers,GrueneBeate,TabeaRoessner,matthiaszimmer,ebner_sha,marcobuelow,DJanecek,StefanKaufmann,thomasgebhart,rischwasu,AndiScheuer,DrAndreasNick,SWagenknecht,UweFe,BeateWaRo,stonie_kiel,UweKekeritz,MartinRabanus,MarcHenrichmann,Ingrid_Nestle,FrankHeinrich,PatrickSensburg,RKiesewetter,NielsAnnen,NadineSchoen,KerstinAndreae,kaiwegner,TSchipanski,KerstinGriese,edrossmann,juergenhardt,starkwatzinger,rbrinkhaus,kerstin_tack,ChristianHirte,tj_tweets,LischkaB,BurkertMartin,SoenkeRix,EvaHoegl,kahrs,meister_schafft,Erwin_Rueddel,VolkmarKlein,fbrantner,SPDuesseldorf,FrankSchwabe,bstrasser,MartinRosemann,VolkerUllrich,DanielaKluckert,josefoster,franksitta,katjakipping,franksteffel,cad59,GabiHillerOhm,LoetzschMdB,HeikoMaas,SteffenBilger,ErhardGrundl,AMattfeldt,Ingmar_Jung,CanselK,JM_Luczak,KemmerichThL,MarcusFaber,petertauber,ekindeligoez,swenschulz,joloulou,marlenemortler,CarenLay,voglerk,KatrinHelling,tobiaslindner,OlliLuksic,Diether_Dehm,RuedigerKruse,UlrichKelber,W_SK,gero_storjohann,PascalKober,katjadoerner,baerbelbas,matschie,FlorianPronold,Uwe_Schulz_AfD,cem_oezdemir,HBraun,KatjaSuding,rainerspiering,f_schaeffler,DennisRohde,MariaKlSchmeink,Otto_Fricke,jimmyschulz,smuellermdb,ManuelSarrazin,K_SA,KonstantinNotz,MartinSchulz,torstenherbst,christianduerr,ManuelHoeferlin,larscastellucci,florian_toncar,ulle_schauws,sven_kindler,SteffiLemke,svenlehmann,tpflueger,nouripour,anked,wanderwitz,solms,larsklingbeil,hubertus_heil,katdro,MatthiasHoehn,johannesvogel,FabioDeMasi'.toWildFromTo()}},
	{name: 'mdl_baden_wuerttemberg',        query: {q:'BaumMdL,CarolaWolle,heinermerz,HPStauch,HagelManuel,ElkeZimmerMdLBW,StefanRaepple,profdrgoll,FabianGramling,DrRainerBalzer,udostein_mdl,StochAndreas,Joerg_Meuthen,stefanfulstblei,Martin_Hahn_MdL,schuetteMdL,USckerl,nicolerazavi,TheresiaBauer,NeseErikli,ErnstKopp,hfiechtner,SabineWoelfle,KlausHoher,DanielRenkonen,salomon_alex,WilliStaechele,karlkleinmdl,mannelucha,ledeabal,jochenhaussmann,trenker75,Muhterem_Aras,saschabinder,timmkern,siegfriedlorek,Winfried_Mack,gruen_kern,SandraBoser,lasotta,brigitte_loesch,martinrivoir,JoshaFrey,ErikSchweickert,alindlohr,WinneHermann,ruelke,reinholdgall'.toWildFromTo()}},
	{name: 'mdl_bayern',                    query: {q:'IlonaDeckwerth,HorstArnold_SPD,brannekamper,HKraenzlein,MartinGuell,KathiausFranken,HerbertWoerlein,RigoRos1,BeateMerk1,StrohmayrS,SteinbergerRosi,RuthMuellerSPD,HReichhart,ThorstenGlauber,DrFahnMdL,JuergenMistol,ZachariasMdL,Thomas_Gehring_,reinhold_strobl,HubertAiwanger,GeRosenthal,WBausback,NataschaKohnen,m_rinderspacher,IlseAigner,tonikreitmair,MdL_KSteiner,TSchorerDremel,MichaelPiazolo,UlliLeiner,FlorianStreibl,KS_MdL,KerstinCelina,EricBeisswenger,GiselaSengl,MelanieHuml,C_StammTeam,JoachimHanisch,BertholdRueth,arif_tasdelen,PetraDettenhfer,MarkusBlume,Markus_Soeder,Andreas_Schalk,WTaubeneder,SeppDuerr,KarlFreller,MuetzeMDL,DorowAlex,PeterTomaschko,Hintersberger,UlrikeGote,LudwigHartmann,FlorianvonBrunn,AlexKoenigMdL,scheuenstuhl,Marcel_Huber,StoettnerK,DuenkelNorbert,KathaSchulze,KlausAdelt,Weidenbusch_E,mstuempfig,FRANKENSPRECHER,Christine_Kamm,mdl_felbinger,susannbiedefeld,Osgyan,GuttenbergerMdL,thomasgoppel,huber_ebe,IngridHeckner,GansGruen,fwhfreising,Gertinger,presse_mdlkarl,Andreas_Lotte,claudiastamm,Roter_Ritter'.toWildFromTo()}},
	{name: 'mdl_berlin',                    query: {q:'tommytabor,FlorianGraf_CDU,bildungsconsult,ThomasSeerig,F_Brychcy,JeanetteAuricht,MaikPenn,Pankow_im_AGH,ChGraeff,st_foerster,topac_fatos,FlorianSwyter,GoinyChristian,michaeldietmann,UbbelohdeBerlin,Bettina_Jarasch,ineslinks,AfDLindemann,haraldlaatsch,nelken_berlin,juneimseptember,jj_schube,die_gennburg,Georg_Pazderski,regina_kittler,SebCzaja,frank_jahnke,Caglar_Derya_,s_kahlefeld,CathPieroth,FrankHansel,BerlinGestalter,TomSchreiberMdA,UdoWolfMdA,k_ronneburg,dmanuelaschmidt,BilligDaniela,WeissAfD,otto_direkt,LasicMaja,Fcm_BeckerSPD,UelkerRadziwill,freekolja,FrankScholtysek,Thomas_Isenberg,MKhnemann,hildebentele,RamonaPop,Kristin_Brinker,junomaerz,RobertSchaddach,StefRemlinger,MVallendar,HughBronson_AfD,Harald_Moritz,MarenJasper,DirkStettner,NotkerBerlin,CorneliaSeibeld,DrTurgutAltug,nikschrader,FDoerstelmann,StSchmidtBerlin,BurkertEulitz,stefanie_fuchs,FScheermesser,dpwes,CzyIna,TimZeelen,HakanTasBerlin,torschber,KohlmeierSPD,Antje_Kapek,JessicaBiessman,MichaelEfler,AnjaKofbinger,s_k_walter,BuBernd,StefanTaschner,SabineBangert,Katina_Schubert,Dennis_Buchner,KatrinVogel,dannyfreymark,burkarddregger,SeeroiberJenny,A_Schillhaneck,MarioCzaja,dilkol,BertramPH,HolgerKrestel,LudwigNicole,Wollihood,Stroedter,Tobias_Schulze,schatzbln,PaulFresdorf,GYGeorg,schluesselburg,ronaldglaeser,HendrikjeKlein,hennerschmidt,langenbrinck,stefanziller,kaddinsky,Marc_Urbatsch,HeikoMelzer,bene_lux,SilkeGebel'.toWildFromTo()}},
	{name: 'mdl_brandenburg',               query: {q:'AndreasKalbitz,RoickWolfgang,JanRedmannWk,aschwbg,rainer_van,klara_geywitz,Margitta1610,Galau_MdL,WieseFranz,MdL_Schade,SchroederMdL,BirgitBessin,AfDPotsdam,dunkelrotseher,InaMuhss,schierack_cdu,UNonnemacher,SteffenKoeniger,GuentherHdf,soerenkosanke,ReneWilke,herrwichmann,BLakenmacher,SaskiaLudwig17,KristyAugustin,SvenPetke,ElisabethAlter,KerstinKircheis,gordonhoffmann,InkaGoRe,Dierkhomeyer,DEZi_Brb,Ben_Raschke,marieluise,mjungclaus,SCHINOWSKY'.toWildFromTo()}},
	{name: 'mdl_bremen',                    query: {q:'NimaPirooznia,MullerHenrike,MattGueldner,AlexTassisAfD,bjoernfecker,SaxeRalph,GrobienSusanne,miriamstrunge,SofiaLeonidakis,patrickoeztuerk,PeterZenner,ArnoGottschalk,jenseckhoff,a_grotheer,NelsonJanssen,mustihb,JCrueger,Klausmoehle,HaukeHilz,chrisschnittker,claasrohmeyer,Bolayela,SandraAhrens,JanTimke,MustafaGuengoer,PietLeidreiter,Magnus_Buhlert,frank_schildt,hbde,EliasSPD,SteffiD'.toWildFromTo()}},
	{name: 'mdl_hamburg',                   query: {q:'FDPNicolaysen,UlrikeSparr,Jenny_Dutschke,anjes_tjarks,SoeSchu,s_boeddinghaus,MehmetYildiz_HH,stoberock,LudwigFlocken,Jens_P_Meyer,filizdemi,feb63640e151433,barbaraduden,JetteEnckevort,ThiloKleibauer,Czech_MdHB,wolfgang_rose,AstridHennies,krusehamburg,1319Pink,pochnicht,HeikeSudmann,Jan_Quast,StephanGamm,mdolzer,JoernKruse,AnnaVTreuenfels,MartinaKoeppen1,AnnaGallinaHH,DenizCelikhh,CansuOezdemir,GAL_AntjesBuero,AMjetztGRUENE,ChristianeSchn2,KazimAbaci,AKammeyer,dkienscherf,Michael21109,philippheissner,PeriArndt,Doro_Martin,sventode,mareikeengels,DennisThering,drmpetersen,frank_schmitt,uwelohmann,gdobusch,otbhh,AnneKrischok,StephanJersch,Stefanie_vBerg,ThomasKreuzmann,CarstenOvens,caro3009,ilkhanipour,HaukeWagner,DennisGladiator,carola_veit,FaridMueller,hschmidt'.toWildFromTo()}},
	{name: 'mdl_hessen',                    query: {q:'ElkeBarth_MdL,Ma_Pentz,RavensburgC,UlrichCaspar,Bauer_MdL,grudolph_,SchaeferHessen,eva_goldbach,TobiasEckertSPD,rock_fdp,MMeysner,hofmann_heike,AstridWallmann,ChristophDegen,UAlexMdL,YpsilantiAndrea,GruegerS,WGreilich,FPKaufmann,kerstin_geis,NancyFaeser,JFroemmrich,UweFrankenberge,MFeldmayer,BchleS,RHolschuh,Ismailtipi,joerguwehahn,heschaus,WiebkeFDP,marcusbocklet,muervetoeztuerk,hartmuthonka,Janine_Wissler,LenaArnoldt,Karin_Wolff,daniel_may_kb,gerhardmerz,mariusweiss,KurtWiegel,peterbeuth,KayaKinkel,andihofmeister,LuciaPuttrich,MathiasWagner,tsghessen,Angela_Dorn'.toWildFromTo()}},
	{name: 'mdl_mecklenburg_vorpommen',     query: {q:'MdLFernandes,eva_kroeger,SimoneOldenburg,StephanReuken,Holger_Arppe,ManfredDachner,larisch_karen,ralfmucha,Ostseewal,LorenzCaffier,MFJ_MdL_MV,NBBretschneider,rettirp,pdacu,TGundlack,SWippermann,BauernhofKliewe,DirkStamer,Dahlemann,torstenkoplin,NadineJulitz,Marc2244'.toWildFromTo()}},
	{name: 'mdl_niedersachsen',             query: {q:'Dana_Guth_AfD,althusmann,DLiebetruth,cbratmann,ImkeByl,d_kreiser,alexandersaipa,MpStephanWeil,HannaNaber,MartinBaeumer,UweSantjer,MarcoMohrmann,cfuehner,hujahn,TobiasHeilmann2,lechner_seblec,MiriamStaudte,GruenMeyer,BelitOnay,RainerFrederman,OliverSchatta,DragosGruene,Guido_Pott,Anja_Piel,Stefan_Birkner,DirkToepffer,DetlevSchulzHen,MetaJanssenKucz,DorisSchroederK,BrinkmannB,stephanweil,jcoetjen,Thiemo_Roehler,KaiSeefried,SilkeLesemann,Grafschafter1,StephanSiemer,Klein_MdL,Philipp_Raulfs,Helge_Limburg,StefWenzel,_Heineken_,UweSchuenemann,JModder,SebastianZinke,JoergHillmer,Ch_Pantazis,joergbode,eva_viehoff,OlafLies,FHeiligenstadt,Axel_Miesner,williehamburg'.toWildFromTo()}},
	{name: 'mdl_nrw',                       query: {q:'MartinaHannen,m_dueker,sonjabongers,K_Rudolph_SPD,Strotebeck_AfD,thomasroecke,MuellerWitt_MdL,nrw_sw2017,Vincentz_AfD,stefanlenzennrw,Schmeltzer_NRW,TrolesHeike,ALueckMdL,CDahmMdL,jochen_klenner,Helmut_Seifen,AnjaButschkau,PatriciaPeill,StephenPaulMdL,OKehrl,NettekovenJens,Gebauer_CDU,Fabian_Schrumpf,Wagner_AfD_MdL,Iris_AfD_MdL,HendrikWuest,WatermannKrass,ante_terhaag,carsten_loecker,RogerBeckamp,LangguthAlex,mue_re,NicVogel_AfD,berivan_aymaz,DuesselSchmitz,ThomasNueckel,RalphBombis,BjoernFranken,Loose_AfD,DiekhoffMarkus,AKossiski,Fuer_Iserlohn,AKuperRtbg,GWalgerDemolsky,MarcusPretzell,mostofiz,becker_horst,c_kampmann,petelkau,MOptendrenk,ArminLaschet,SusaSchneider,AStullich,effe1900,PeterBiesenbach,Chris_Rasche,KlausKaiserCDU,philipp_fuer_DU,AndreasBeckerRE,santosherrmann,JosefinePaul,Minister_Remmel,StefanZimkeit,SebWatermeier,norwichruesse,Alexbrockmeier,twittschler,JoachimStamp,JosefSPD,GregorGolland,Daniel_Sieveke,koppherr,alexander_vogt,GordanDudas,IbrahimYetim,voussem,Michael_Huebner,fortmeier2,Dennis_Maelzer,RainerDeppe,ABialas,Ruediger_Scholz,ingeblask,svenwolf,marc_herter,marcelhafke,lorenzdeutsch,DrStefanBerger,MarcLuerbke,klartextmueller,marcovoge,st_kaemmerling,brockes,ChristianMangen,bodoloettgen,henninghoene,flobraun,frank_mueller,moritzkoerner,JoergGeerlings,beerenstark,DietmarBell,Arndt_Klocke,joernfreynick,wibkegt,matthi_bolte,schaeffer_nrw,RainerMatheisen,jochenott,schneider_rene'.toWildFromTo()}},
	{name: 'mdl_rheinland_pfalz',           query: {q:'NinaKlinkel,JoachimPaul_AfD,dirk_herber,ChristophGensch,Uwe_Junge_MdL,BernhardBraunLT,bettinabrueck,JohannesKlomann,SPD_AndreasRahm,mi_wae,MKGmdl,AnklamTrapp,KazunguHass,alt_aber_gut,J_Denninghoff,Damian_Lohr,AstridSchmitt59,Marcruland,JensGuth_SPD,GerdSchreiner,ElfriedeMeurer,HediThelen,GordonSchnieder,Beneoster,AdolfKessel1,EndersDr,ma_schn,DtschInfo,Horstgies,Sabine_Baetzing,hendrikhering,ChBaldauf,MarcoWeberEifel,BarbaraMdL,steven_wink,AnkeSimonLU,wolfschwarz,EllenDemuth,JJRauschkolb,katharina_binz,sippelheiko,GabiWieland,MichaelHuettner,HansJosefBracht,ChSchneider,MartinBrandl,MJ_AfDKreisGER,MartinHaller,TMachalet,PiaSchellhammer,hjnoss,Wissing,SvenTeuber,daniel_koebler,Alex_Schweitzer'.toWildFromTo()}},
	{name: 'mdl_saarland',                  query: {q:'lutzhecker_mdl,SarahGillen_MdL,DennisLander,reinerzimmerhsw,kurtz_hp,r_schaefer81,DIELINKEUMWELT,Juergen_Renner,RalfGeorgi,AnkeRehlinger,peter_strobel,Stephan_Toscani,MarcSpeicher,klausbouillon,alwintheobald,alexzeyer,TimoMildau,SaschaZehner,rolandtheis,tobiashans,UlrichCommercon'.toWildFromTo()}},
	{name: 'mdl_sachsen',                   query: {q:'AlexDierks1987,AndreWendtMdL,JanHippold,uwe_wurlitzer,EnnoSachsen,baumspd,Ka_Meier,MdlWild,NicoBruenler,Null4Zwo77,Andreas_Nowak75,SebastianGemkow,StangeMaria,ricogebhardt,baumannhasske,FranziskaOL,PZais,SoerenVoigt,KoselHeiko,MarionJunge,HorstWehner,LuiseNeuhaus,KlTischendorf,AntjeFeiks,HolgerMannLE,Gerald130964,dirkpanter,Huetter_Carsten,dagmarneukirch,VZschocke,ClaudiaMaicher,LutzRichter,Hoesl_MdL,Koepping,HolgerGasse,luna_le,InesSpringer,IrisFirmenich,Janinapfau,gerdlippold,kerstinkoeditz,MeyerSt,schullegr,MartinDulig,HenningHomann,Schreiber_DD,AlbrechtPallas,geertmackenroth,sabinefriedel,VaLippmann,BoehmeMarco,Heimat_Zukunft'.toWildFromTo()}},
	{name: 'mdl_sachsen_anhalt',            query: {q:'MonikaHohmann,AndreasSchuman9,UlrichSiegmund,KerEisen,AfD_Lieschke,KatjaPaehle,VolkerOlenicak,Daniel_Roi_AfD,MatzeBuettner,spiegelbergafd,Borchert_CDU,Kristin_Heiss,FlorianJPhilip1,jaweschmi,BarthJuergen,SturmMdL,PoggenburgAndre,katja_bahlmann,robert_farle,wolfgangaldag,GuidoHeuer,DanielSzarata,CDU_Schroeder,DrAndrSchmidt,boenisch2012,Hobi99,HenrietteQuade,ThomasKeindorf,angelagorr,doro_frederking,WulfGallert,LarsJoernZimmer,falkogrube,reinerhaseloff,SchulenburgCh,StefGeb,olaf_meister,MarcoTullner,Eva0112,Andreashoeppner,AndreasSteppuhn,Connylue,ruedigererben,SwenHalle,ulithomas,HendrikLange,StriegSe'.toWildFromTo()}},
	{name: 'mdl_schleswig_holstein',        query: {q:'CCCfuerStormarn,BHerdejuergen,WittgensteinAfD,Joerg_Nobis_AfD,JetteWaldinger,ClausSchaffer,aminajxx,TobiasLoose,DABornhoeft,regina_poersch,DGuenther_CDUSH,harms_lars,L_Petersdotter,TobiasKoch,StefanWeberSE,MarretGruen,anitaklahn,martinhabersaat,TobiasVonPein,tietze_andreas,Thomasrother,wolfgangbaasch,StephanHolowaty,AltJusoKai,c_vogt,Kumbartzky,LukasKilian,ekavonkalben,Ralf_Stegner,RasmusAndresen'.toWildFromTo()}},
	{name: 'mdl_thueringen',                query: {q:'WMuhsal,Kristin_Flo,unsuwe44,RobertoKobelt,BPfefferlein,MoellerAfD,Frank_Warnecke,BjoernHoecke,HeikeTaubert,RalfKalich,Kati_Engel,Buehlandreas,ManfredScherer_,Scheringer_W,OMueller_Jena,dialehm,Keineausrede,GruenerDirk,MikeMohring,EMuehlbauer_SPD,MarionWalsmann,iia_i,St_Dittes,gudrunlukin,ChristianSchaft,Rainerkraeuter,henfling_m,BineB,Harzerkas,KarolaStange,Chr_Tischner,KatharinaKoenig,KKorschewsky,linkeanja,FKuschel,SusanneHennig,Astrid_RB,Katinka_Mitt,StefanGruhner,marx2009,mariovoigt'.toWildFromTo()}},
	{name: 'mdr_sn',                        query: {q:'mdr_sn'.toWildFromTo()}},
	{name: 'metoo',                         query: {q:'#metoo'}},
	{name: 'ministerien',                   query: {q:'sksachsentweets,Arne_Wiechmann,SMIsachsen,ChriSchni,StRegSprecherin,Boschemann,julitalk,svefri,amtzweinull,HaufeStephan,jettebo,Opp_Sprecher,ZimmermannSina,al_krampe,Medienheld,bauerzwitschert,hard_er,MSchroeren,pampel_muse,evamariamarks,RouvenKlein,ninasuza,andreasblock,foeniculum,zumtesthier'.toWildFromTo()}},
	{name: 'muenster',                      query: {q:'muenster OR münster OR anschlag'}},
	{name: 'netzdg',                        query: {q:'netzdg'}},
	{name: 'nichtohnemeinkopftuch',         query: {q:'nichtohnemeinkopftuch'}},
	{name: 'nobillag',                      query: {q:'#neinzunobillag OR #nobillag OR #nobillagnein'}},
	{name: 'olympics_2018',                 query: {q:'#olympia2018 OR #pyeongchang2018 OR #olympics OR #olympia OR #doping'}},
	{name: 'pflege',                        query: {q:'pflegenotstand OR pflege'}},
	{name: 'pyeongchang2018',               query: {q:'pyeongchang2018'}},
	{name: 'rechts',                        query: {q:'afdwaehlen,antifaverbot,merkelmussweg,staatsfernsehen,stopasyl,stopislam,widerstand'.toOR()}},
	{name: 'rechts2',                       query: {q:'"aufrecht erhalten","bedauerlicher einzelfall","esreicht","fake news","große verfall","illegale masseneinwanderung","illegale migranten","islamistische gefährder","islamistischer gefährder","kampf gegen","kapituliert vor","kein einzelfall","konstatiert kontrollverlust","leistet widerstand","links grün versifft","mein vaterland","merkelmussweg","mundtot gemacht","mundtot machen","plünderung freigegeben","politisch inkorrekt","politische korrektheit","rechte ecke","schweigende mehrheit","unkontrollierte einwanderung","unkontrollierte masseneinwanderung","unser land","volkspädagogische kampagne","widerliches pack","wirklichkeitsverweigerung",abmerkeln,abschiebung,achgut,afdimbundestag,afdwaehlen,alllivesmatter,alternativemedien,altparteien,anarchokapitalist,anpassungsmoralismus,antiantifa,antifaverbot,antigender,antimerkel,antisystem,antivegan,armenimport,asyl,asylindustrie,aufrecht,banislam,bedauerlich,bereicherung,bevormundung,bimbo,bluehand,dankeerikasteinbach,defendeurope,defendgermany,demokratur,denkverbot,deplorable,deraustausch,deutschfam,diktatur,dirigismus,ditib,drachenlord,dreck,einwanderung,einzelfall,einzelfallinfos,einzeltäter,endgov,entbrüsseln,erklärung2018,erziehungsmedien,eudssr,fakenews,fakerefugees,familiennachzug,fckislm,flintenuschi,flüchtlingsproblematik,flüchtlingswelle,freekolja,freilerner,frühsexualisierung,gabfam,gedankenpolizei,gefährder,gegenlinks,gegenzecken,geldsystemkritiker,"gender mainstreaming",gendergaga,genderismus,genderterror,gesinnungsterror,gleichgeschaltet,gleichschaltung,grueneversenken,gutmensch,gutmenschen,heimatbewusst,herrschaftsfrei,heterophob,hetzer,homolobby,ichbinpack,identitätspolitik,immigrationskritik,invasoren,invasorenwelle,islambeiuns,islamisierung,islamnixgut,jungefreiheit,kartellparteien,kartoffeldeutsch,kinderehe,kinderfickersekte,klartext,klimalüge,konservativ-freiheitlich,kopftuch,kopftuchverbot,koppverlag,kriegstreiber,krimigranten,kulturbereicherer,kulturtaliban,kuscheljustiz,köterrasse,landeshochverrat,linksextremismus,linksfaschismus,linksmaden,linksnicker,linksversifft,lügenpresse,lügner,machtelite,machtwechsel,maskulist,masseneinwanderung,maulkorb,mediendiktatur,meinungsdiktat,meinungsdiktatur,meinungsfreiheit,merkelei,merkelmussweg,merkelregime,mgga,migrassoren,migrationswaffe,minimalstaat,multikultitötet,mundtot,muslime,muslimisch,männerbeauftragter,männerrechtler,nafri,national-liberal,nationalkonservativ,nationalstolz,nazikeule,neger,neokonservativ,netzdg,nichtohnemeinkopftuch,opfer-abo,opferindustrie,paulanergarten,pckills,proborders,propaganda,propagandaschau,propolizei,quotenneger,realitätsverweigerer,rechtsstaat,redpill,refugeesnotwelcome,remigration,rückführungshelfer,scharia,scheinasylant,schleiereule,schuldkult,selbstabschaffung,selbstviktimiserung,sozial-libertär,sozialparadies,sozialschmarotzer,sozialsysteme,sozialtourist,sprachpolizei,staatsfernsehen,staatspresse,stasi,steuerstaat,stopasyl,stopislam,superstaat,systemgünstlinge,systemkonform,systemkritisch,systempresse,taxationistheft,terror,terroristen,teuro,thewestisbest,tichyseinblick,toleranzdiktatur,traudichdeutschland,tugendterror,tugendwächter,umerziehung,umvolkung,unbequem,unkontrolliert,untertanengeist,unterwerfung,vaterland,vaterländisch,verabschiedungskultur,verbotskultur,verbotspartei,verbrechen,verbrecher,verfassungspatriot,verhindern,verschwulung,voelkisch,volksbetrug,volksdeutsche,volksempfinden,volkspädagogik,volksthumsleugnung,volkstod,volksverräter,voluntarismus,völkisch,werteunion,wertkonservativ,widerlich,widerstand,wirtschaftsflüchtling,zensurland,zuwanderung,zuwanderungskritisch,zwangsgebühren'.toOR(), lang:'de'}},
	{name: 'rp18',                          query: {q:'rp18 OR republica OR "re-publica" OR "re:publica" OR from:republica OR to:republica'}},
	{name: 'russianelection',               query: {q:'#ИзбирательныйУчасток OR #ПУТИН OR #Выборы2018 OR #ПУТИН2018 OR #Саки OR #городСаки OR #РеспубликаКрым OR #КрымНаш OR #МыСтроимМосты OR #КрымРоссияНавсегда OR #КрымРоссия OR #ПутинВВ OR #ТвойВыбор2018 OR #2018ТвойВыбор OR #Выбор2018 OR #ПутинВладимирВладимирович OR #ЯзаПутина OR #ЯзаПутинаВВ'}},
	{name: 'syria',                         query: {q:'syria'}},
	{name: 'trump_mentions',                query: {q:'to:realdonaldtrump OR to:potus OR realdonaldtrump OR potus'}},
	{name: 'trump_tweets',                  query: {q:'from:realdonaldtrump OR from:potus'}},
	{name: 'ueberwachung',                  query: {q:'überwachungspaket OR staatstrojaner OR bundestrojaner OR ueberwachungspaket OR zib2 OR überwachung OR privatsphäre OR datenschutz OR sicherheit OR vds OR sicherheitspaket'}},
];

// Search with each of these queries,
// for each of the last 14 days
var queue = [];
var yesterday = Math.floor(Date.now()/86400000)-0.5;
for (var i = -11; i <= 0; i++) {
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
	8,
	() => console.log(colors.green.bold('FINISHED'))
)

// Start scraper
scraper.run();


function runScraper(name, query, date, cbScraper) {
	var title = '"'+name+' - '+date+'"';
	
	var tempFilename = resolve(__dirname, '../../tmp', Math.random().toFixed(16).substr(2)+'.tmp.xz');
	var filename = resolve(__dirname, '../../data/search_and_dump/'+name+'/'+name+'_'+date+'.jsonstream.xz');

	// Does the file already exists
	if (fs.existsSync(filename)) {
		console.log(colors.grey('Ignore '+title));
		return setTimeout(cbScraper,0);
	} else {
		console.log(colors.green('Starting '+title));
	}

	var outputStream = new OutputStream(tempFilename, filename)

	function OutputStream(tempFilename, filename) {
		// Prepare Compressor
		var compressor = lzma.createCompressor({
			check: lzma.CHECK_NONE,
			preset: 9/* | lzma.PRESET_EXTREME*/,
			synchronous: false,
			threads: 1,
		});
		var stream = fs.createWriteStream(tempFilename, {highWaterMark: 8*1024*1024});
		compressor.pipe(stream);

		// Make sure that the folder exists
		utils.ensureDir(filename);

		// flush data buffer to lzma compressor
		function flush(percent, cbFlush) {
			console.log(colors.green('flushing '+title+' - '+(100*percent).toFixed(1)+'%'))

			var buffer = Array.from(tweets.values());
			tweets = new Map();
			tweetCount = 0;

			if (buffer.length === 0) return cbFlush();

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
		function close(cbClose) {
			//console.log(colors.green('prepare closing '+title));
			flush(1, () => {
				//console.log(colors.green('closing '+title));
				stream.on('close', () => {
					console.log(colors.green.bold('closed '+title));
					fs.renameSync(tempFilename, filename);
					cbClose();
				})
				compressor.end();
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

					result.statuses.forEach(t => tweets.set(t.id_str, {
						id_str: t.id_str,
						created_at: t.created_at,
						buffer: Buffer.from(JSON.stringify(t)+'\n', 'utf8')
					}));
					tweetCount += result.statuses.length;

					var date = (result.statuses[0]||{}).created_at;

					if (tweetCount > 10000) {
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