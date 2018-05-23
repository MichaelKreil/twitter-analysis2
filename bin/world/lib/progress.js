"use strict"

module.exports = Progress;

function Progress(max) {
	if (!max) max = 1;
	
	var position = 0;
	var width = 100;
	//var blocks = [8193,9617,9618,9619,9608].map(code => String.fromCharCode(code));
	//var blocks = [8193,9615,9614,9613,9612,9611,9610,9609,9608].map(code => String.fromCharCode(code));
	var blocks = '░▓'.split('');

	var startTime = Date.now();
	var dirty = false;

	function update() {
		dirty = false

		var pos = position/max;
		if (pos < 0) pos = 0;
		if (pos > 1) pos = 1;

		var n = blocks.length-1;
		var size = Math.round(pos*(n*width+1));
		var bar = [];
		for (var i = 0; i < width; i++) {
			var left = Math.max(0, Math.min(n, size));
			bar.push(blocks[left]);
			size -= n;
		}

		var timeNow = Date.now();
		var timeLeft = ((timeNow-startTime)*(1-pos)/pos)/1000;
		timeLeft = [
			Math.floor(timeLeft/3600),
			(100+(Math.floor(timeLeft/60) % 60)).toFixed(0).substr(1),
			(100+(Math.floor(timeLeft) % 60)).toFixed(0).substr(1),
		].join(':')
		
		process.stdout.clearLine();
		process.stdout.write('\r▐'+bar.join('')+'▌   '+timeLeft);
	}

	var interval = setInterval(() => {
		if (dirty) update();
	}, 1000);

	function queueUpdate() {
		dirty = true;
	}
	
	return {
		setSize: value => {
			if (value === max) return;
			max = value;
			update();
		},
		set: value => {
			if (value === position) return;
			position = value;
			queueUpdate();
		},
		increase: value => {
			if (value === 0) return;
			position += value;
			queueUpdate();
		},
		end: () => {
			clearInterval(interval);
			position = max;
			update();
			process.stdout.write('\n');
		},
	};
}