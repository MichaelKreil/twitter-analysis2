"use strict";

const scraper = (require('../../lib/scraper.js'))('download_lists');

var lists = {
	mdb_bundestag:'wahl_beobachter/mdb-bundestag',

	mdl_baden_wuerttemberg:'wahl_beobachter/mdl-baden-w-rttemberg',
	mdl_bayern:'wahl_beobachter/mdl-bayern',
	mdl_berlin:'wahl_beobachter/abgeordnetenhaus-agh',
	mdl_brandenburg:'wahl_beobachter/mdl-brandenburg',
	mdl_bremen:'wahl_beobachter/mdbb-bremen',
	mdl_hamburg:'wahl_beobachter/mdhb-hamburg',
	mdl_hessen:'wahl_beobachter/mdl-hessen',
	mdl_mecklenburg_vorpommen:'wahl_beobachter/mdl-mecklenburg-vorpommen',
	mdl_niedersachsen:'wahl_beobachter/mdl-niedersachsen',
	mdl_nrw:'wahl_beobachter/mdl-nrw',
	mdl_rheinland_pfalz:'wahl_beobachter/mdl-rheinland-pfalz1',
	mdl_saarland:'wahl_beobachter/mdl-saarland',
	mdl_sachsen:'wahl_beobachter/mdl-sachsen',
	mdl_sachsen_anhalt:'wahl_beobachter/mdl-sachsen-anhalt',
	mdl_schleswig_holstein:'wahl_beobachter/mdl-schleswig-holstein',
	mdl_thueringen:'wahl_beobachter/mdl-th-ringen',

	bundesregierung:'wahl_beobachter/bundesregierung',
	ministerien:'wahl_beobachter/ministeriums-twitterati',
	deutsche_mep:'wahl_beobachter/alle-deutschen-mep',

	afd_bundestagsabgeordnete:'AfD/bundestagsabgeordnete',
	afd_verifizierte_accounts:'AfD/verifizierte-accounts',
	afd_landtagsabgeordnete:'AfD/landtagsabgeordnete',
	afd_landessprecher:'AfD/landesvors-sprecher',
	afd_landtagsfraktionen:'AfD/landtagsfraktionen',
	afd_landesverbaende:'AfD/landesverb-nde',
	afd_bundesvorstand:'AfD/bundesvorstand',
	afd_bundestagsmitglieder:'AfDKompakt/bundestagsmitglieder',

	afdkompakt_landessprecher:'AfDKompakt/landessprecher-vors',
	afdkompakt_unterstuetzer:'AfDKompakt/unterst-tzer',
	afdkompakt_alles_auf_einen_blick:'AfDKompakt/alles-auf-einen-blick',
	afdkompakt_junge_alternative:'AfDKompakt/junge-alternative',
	afdkompakt_lv_sachsen:'AfDKompakt/lv-sachsen',
	afdkompakt_lv_brandenburg:'AfDKompakt/lv-brandenburg',
	afdkompakt_lv_niedersachsen:'AfDKompakt/lv-niedersachsen',
	afdkompakt_lv_thueringen:'AfDKompakt/lv-th-ringen',
	afdkompakt_lv_hamburg:'AfDKompakt/lv-hamburg',
	afdkompakt_lv_bayern:'AfDKompakt/lv-bayern',
	afdkompakt_lv_hessen:'AfDKompakt/lv-hessen',
	afdkompakt_lv_saarland:'AfDKompakt/lv-saarland',
	afdkompakt_lv_bremen:'AfDKompakt/lv-bremen',
	afdkompakt_lv_mecklenburg_vorpommern:'AfDKompakt/lv-mecklenburg-vorpommern',
	afdkompakt_lv_sachsen_anhalt:'AfDKompakt/lv-sachsen-anhalt',
	afdkompakt_lv_baden_wuerttemberg:'AfDKompakt/lv-baden-w-rttemberg',
	afdkompakt_lv_rheinland_pfalz:'AfDKompakt/lv-rheinland-pfalz',
	afdkompakt_lv_berlin:'AfDKompakt/lv-berlin',
	afdkompakt_lv_nordrhein_westfalen:'AfDKompakt/lv-nordrhein-westfalen',
	afdkompakt_lv_schleswig_holstein:'AfDKompakt/lv-schleswig-holstein',
	afdkompakt_landtagsabgeordnete:'AfDKompakt/landtagsabgeordnete',
	afdkompakt_bundesvorstand:'AfDKompakt/bundesvorstand',
	afdkompakt_landesverbaende:'AfDKompakt/landesverb-nde',
	afdkompakt_landtagsfraktionen:'AfDKompakt/landtagsfraktionen',
}

Object.keys(lists).forEach(name => {
	var url = lists[name].split('/');
	var task = scraper.getSubTask();
	task.fetch(
		'lists/members',
		{
			owner_screen_name: url[0],
			slug: url[1],
			count: 5000,
			skip_status: true,
		},
		result => {
			var list = result.users.map(u => u.screen_name);
			var spaces = ' '.repeat(Math.max(0,30-name.length));
			console.log("\t{name: '"+name+"',"+spaces+"query: {q:'"+list.join(',')+"'.toWildFromTo()}},");
		}
	)
})

scraper.run();



