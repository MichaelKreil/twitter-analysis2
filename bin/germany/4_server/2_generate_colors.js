"use strict"

const fs = require('fs');
const tsv = require('tsv');
const lzma = require('lzma-native');
const resolve = require('path').resolve;
const level = require('level');

var db = level('_server', { keyEncoding: 'utf8', valueEncoding: 'utf8' });

var colorSchemes = {
	activity: () => {
		var endD = Date.parse('2017-06-15');
		return obj => {
			var activity = (endD - obj.created_at)/(obj.statuses_count+1);
			if (activity < 0) console.log(obj.created_at);
			activity /= 86400000;
			return getGradient(activity, 0, 5)
		}
	},
	age: () => {
		var start = Date.parse('2009-01-01');
		var end = Date.parse('2017-01-01');
		return obj => getGradient(obj.created_at, start, end)
	},
	statuses: () => {
		var start = Math.log(50);
		var end = Math.log(1e3);
		return obj => getGradient(Math.log(obj.statuses_count), start, end)
	},
	location: () => {
		var size = 128;
		var defaultColor = [170,170,170,64];
		var locationColors = {
			'heilbronn,solingen,jena,flensburg,erlangen,leverkusen,kaiserslautern,ruhrpott,oberhausen,baden württemberg,gelsenkirchen,schleswig holstein,oldenburg,germany,berlin,hamburg,deutschland,münchen,köln,frankfurt,stuttgart,düsseldorf,munich,leipzig,hannover,cologne,dresden,bonn,bremen,dortmund,bayern,nürnberg,essen,karlsruhe,mainz,münster,nordrhein-westfalen,nordrhein westfalen,nrw,kiel,baden-württemberg,aachen,wiesbaden,hessen,bielefeld,mannheim,niedersachsen,augsburg,bochum,freiburg,darmstadt,heidelberg,braunschweig,duisburg,potsdam,erfurt,wuppertal,magdeburg,rostock,kassel,würzburg,halle,göttingen,sachsen,osnabrück,regensburg,saarbrücken,chemnitz,lübeck,saarland,koblenz,salzburg,ulm,trier,thüringen,ruhrgebiet,rheinland-pfalz,schleswig-holstein,paderborn,mönchengladbach,bavaria,bamberg,krefeld,innsbruck,schwerin,hildesheim,mülheim an der ruhr,wolfsburg,neuss,lüneburg,ingolstadt,bremerhaven,bayreuth,siegen,konstanz,hagen,marburg,rheinland pfalz,aschaffenburg,tübingen,hamm,pforzheim,reutlingen,recklinghausen,ffm,passau,mecklenburg vorpommern,almanya,cottbus,fulda,rosenheim,fürth,ludwigsburg,gießen,italy,muc,brandenburg,german,zwickau,remscheid,klagenfurt,weimar,gütersloh,landshut,greifswald,baden baden,hh,celle,bottrop,moers,ludwigshafen,iserlohn,wilhelmshaven,franken,bodensee,salzgitter,minden,stralsund,ludwigshafen am rhein,bergisch gladbach,offenburg,hameln,düren,offenbach,coburg,hanau,worms,plauen,ostfriesland,witten,herford,gera,lünen,rheinland,lüdenscheid,nuremberg,aalen,aarau,alemania,ansbach,bad homburg,bautzen,bocholt,castrop rauxel,cuxhaven,dinslaken,dorsten,duesseldorf,esslingen,friedrichshafen,gladbeck,goslar,grevenbroich,gummersbach,göppingen,görlitz,kempten,lippstadt,olten,ratingen,ravensburg,rhein main,rheine,sauerland,schaffhausen,schweinfurt,siegburg,soest,speyer,straubing,troisdorf,unna,viersen,villach,villingen schwenningen,wetzlar,wesel':[255,183,55,size],
			'wien,vienna,austria,österreich,graz,linz':[0,166,88,size],
			'st gallen,winterthur,zürich,schweiz,switzerland,bern,zurich,basel,luzern,zuerich,zug':[0,166,88,size],
			'london,england':[0,176,235,size],
			'somewhere,weltweit,erde,irgendwo im nirgendwo,home,europe,europa,hogwarts,world,wonderland,internet,zuhause,everywhere,worldwide,hier,iphone,earth,neverland,www,space,honeymoon ave,online,eu,gotham city,üt,überall,youtube,hell,sormadidim,de,irgendwo,hyrule,zu hause,da wo du nicht bist,mars,narnia,welt,impressum,nowhere,mystic falls,hinter dir,international,here,wunderland,bikini bottom,global,daheim,nipawomsett,überall und nirgendwo,dreamland,heaven,nimmerland,moon,universe,am arsch der welt':[246,90,159,size],
			'mexico,playa del carmen,monterrey,toluca,puebla,guadalajara,puerto vallarta,merida,saltillo,cancun,veracruz':[249,87,45,size],
			'los angeles,new york,usa':[249,87,45,size],
			'luxemburg,luxembourg,liechtenstein,paris,amsterdam,belgien,belgium,brussels,brüssel,france,madrid':[0,80,158,size],
			'türkiye,türkei,istanbul':defaultColor,
		}
		var list = [];
		Object.keys(locationColors).forEach(key => key.split(',').forEach(k => {list.push(k); locationColors[k] = locationColors[key]}));

		//console.log(list);

		return obj => {
			var location = obj.location.toLowerCase().replace(/[^a-zäöüß]+/g,' ').trim();
			if (location === '') return defaultColor;
			//console.log(location);
			if (locationColors[location]) return locationColors[location];

			var found = location.split(' ').find(string => locationColors[string]);
			if (found) return locationColors[found];

			var found = list.find(string => (location.indexOf(string) >= 0));
			if (found) return locationColors[found];

			//console.log(location);
			return defaultColor;
			//return locationColors[location] || [170,170,170,size];
		}
	},
	fakenews: () => {
		var accountColors = new Map();
		var accounts = tsv.parse(fs.readFileSync('accounts_fake.tsv', 'utf8'));
		accounts.forEach(entry => {
			var radius = Math.sqrt(Math.abs(entry.fakes))*2-1;
			if (radius > 4) radius = 4;
			radius = 191 + 32*radius;

			accountColors.set(
				entry.name.toLowerCase(),
				entry.fakes < 0 ? [0,170,85,radius] : [238,0,0,radius]
			)
		})
		return obj => accountColors.get(obj.screen_name.toLowerCase()) || [170,170,170,64];
	},
	parties: () => {
		var accountColors = new Map();
		var accounts = tsv.parse(fs.readFileSync('accounts_party.tsv', 'utf8'));
		accounts.forEach(entry => {
			accountColors.set(
				entry.name.toLowerCase(),
				[entry.r,entry.g,entry.b,255]
			)
		})
		return obj => accountColors.get(obj.screen_name.toLowerCase()) || [170,170,170,64];
	},
	verified: () => {
		return obj => (obj.verified ? [0,170,85,192] : [0,0,0,0]);
	},
	default_profile_image: () => {
		return obj => (obj.default_profile_image ? [238,0,0,128] : [0,0,0,0]);
	},
	utc_offset: () => {
		var colors = {
			'-11': [255,  0,255,128],
			'-10': [191,  0,255,128],
			 '-9': [128,  0,255,128],
			 '-8': [ 64,  0,255,128],
			 '-7': [  0,  0,255,128],
			 '-6': [  0, 51,204,128],
			 '-5': [  0,102,153,128],
			 '-4': [  0,153,102,128],
			 '-3': [  0,204, 51,128],
			 '-2': [  0,255,  0,128],
			 '-1': [ 43,255,  0,128],
			  '0': [ 84,255,  0,128],
			  '1': [128,255,  0,128],
			  '2': [255,255,  0,128],
			  '3': [255,128,  0,128],
			  '4': [255, 64, 64,128],
			  '5': [255,  0,128,128],
			  '6': [255,  0,191,128],
			  '7': [255,  0,255,128],
			  '8': [255,  0,255,128],
			  '9': [255,  0,255,128],
			 '10': [255,  0,255,128],
			 '11': [255,  0,255,128],
			 '12': [255,  0,255,128],
			 '13': [255,  0,255,128]
		}
		return obj => (obj.utc_offset === null ? [255,0,0,64] : (colors[Math.round(obj.utc_offset/3600)] || [255,0,0,64]));
	},
}

colorSchemes = Object.keys(colorSchemes).map(key => ({
	key: key,
	getColor: colorSchemes[key](),
	writer: new ColorWriter(resolve(__dirname, '../../../data/germany/color_'+key+'.bin.xz'))
}))

var count = 0;
var max = 1587616;

db.createReadStream({
	gte: 'id_', lte: 'id_@',
	keys: false, values: true,
})
	.on('data', function (data) {
		if (count % 2e5 === 0) console.log((100*count/max).toFixed(1)+'%');
		count++;

		data = JSON.parse(data);
		var node = data.node;

		//console.dir(data, {colors:true}); process.exit();

		colorSchemes.forEach(entry => {
			entry.writer.write(node, entry.getColor(data));
		})
	})
	.on('error', function (err) {
		console.log('Oh my!', err)
	})
	.on('end', function () {
		colorSchemes.forEach(entry => {
			entry.writer.close();
		})
		console.log('Stream ended', count)
	})

function getGradient(v, vMin = 0, vMax = 1, size = 128) {
	var a = (v-vMin)/(vMax-vMin);
	if (a < 0) a = 0;
	if (a > 1) a = 1;
	return ([
		 -52*a*a - 186*a + 238,
		-188*a*a + 358*a + 0,
		-358*a*a + 443*a + 0,
		size
	]).map(v => Math.round(v))
}

function ColorWriter(filename) {
	var maxCount = 2e6;
	var buffer = new Buffer(maxCount*4);
	var maxIndex = 0;
	
	return {
		close: () => {
			buffer = buffer.slice(0,(maxIndex+1)*4);
			lzma.compress(buffer, {preset:9 | lzma.PRESET_EXTREME}, buffer => fs.writeFileSync(filename, buffer))
		},
		write: (index, data) => {
			if (index > maxIndex) maxIndex = index;
			buffer[index*4+0] = data[0];
			buffer[index*4+1] = data[1];
			buffer[index*4+2] = data[2];
			buffer[index*4+3] = data[3];
		}
	}
}