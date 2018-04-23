$(function () {
	var wrapper = $('#wrapperleft');
	var canvas = $('#canvas');
	var ctx = canvas.get(0).getContext('2d');
	var width, height, retina, simulation;
	
	resize();
	$(window).resize(resize);
	function resize() {
		retina = window.devicePixelRatio;
		width = wrapper.width();
		height = wrapper.height();
		canvas.attr('width', width*retina);
		canvas.attr('height', height*retina);
		canvas.css('width', width);
		canvas.css('height', height);
		redraw();
	}

	var data = {
		words:false,
		nodes:false,
		edges:false,
	}

	console.log('loading data');
	Object.keys(data).forEach(key => {
		$.getJSON('/data/'+key+'_web.json', result => start(data[key]=result))
	})

	function start() {
		if (Object.keys(data).some(key => !data[key])) return;

		console.log('decompressing data');

		data.words.count = decompressDiff(decompressRLE(data.words.count));
		data.words = decompressObjectArray(data.words);

		data.nodes = decompressObjectArray(data.nodes);
		data.nodes.forEach(n => {
			n.word_index = decompressDiff(decompressRLE(n.word_index));
			n.word_count = decompressRLE(n.word_count);
			n.weight = 1;
		})

		data.edges.source = decompressDiff(decompressRLE(data.edges.from));
		data.edges.source = data.edges.source.map(index => data.nodes[index]);
		delete data.edges.from;
		data.edges.target = decompressDiff(decompressRLE(data.edges.to));
		data.edges.target = data.edges.target.map(index => data.nodes[index]);
		delete data.edges.to;

		data.edges.weight = decompressRLE(data.edges.weight);
		data.edges.both = decompressRLE(data.edges.both);
		data.edges.retweeting = decompressRLE(data.edges.retweeting);

		data.edges = decompressObjectArray(data.edges);

		console.log('start');

		simulation = d3.forceSimulation(data.nodes);
		simulation.alphaMin(0.01);
		simulation.alphaDecay(1 - Math.pow(simulation.alphaMin(), 1 / 100)),

		simulation.force('charge', forceRepulsion(30));
		function forceRepulsion() {
			var nodes,
			    strength = -10,
			    theta2 = 2;

			function force(alpha) {
				var tree = quadtree(nodes);
				nodes.forEach(n => tree(n, (x,y,w) => {
					var dx = x - n.x;
					var dy = y - n.y;
					var d = dx*dx + dy*dy;
					if (d < 1e-6) return;
					d = strength*w*alpha*Math.pow(d+0.1, -1);
					n.vx += dx*d;
					n.vy += dy*d;
					//if (!n.vx) return;
				}));
			}

			force.initialize = function(_) {
				nodes = _;
			};

			function quadtree(nodes) {
				if (nodes.length === 0) {
					console.log(nodes);
					debugger;
					throw Error();
				}

				var xc, yc, w;
				if (nodes.length > 1) {
					var x0 = 1e10, x1 = -1e10;
					var y0 = 1e10, y1 = -1e10;
					xc = 0;
					yc = 0;
					w = 0;

					nodes.forEach(n => {
						if (n.x < x0) x0 = n.x;
						if (n.x > x1) x1 = n.x;
						if (n.y < y0) y0 = n.y;
						if (n.y > y1) y1 = n.y;
						xc += n.weight*n.x;
						yc += n.weight*n.y;
						w  += n.weight;
					})
					xc /= w;
					yc /= w;
					var size = Math.sqrt(sqr(x1-x0)+sqr(y1-y0));

					if (Math.max(x1-x0,y1-y0) === 0) {
						return function (n,cb) {
							cb(xc,yc,w);
						}
					}

					var quad1 = [], quad2 = [];
					
					if ((x1-x0) > (y1-y0)) {
						var xc = (x0+x1)/2;
						nodes.forEach(n => ((n.x < xc) ? quad1 : quad2).push(n))
					} else {
						var yc = (y0+y1)/2;
						nodes.forEach(n => ((n.y < yc) ? quad1 : quad2).push(n))
					}
					quad1 = quadtree(quad1);
					quad2 = quadtree(quad2);

					return function (n,cb) {
						var d = Math.sqrt(sqr(n.x-xc)+sqr(n.y-yc));
						if (d > theta2*size) {
							cb(xc,yc,w); // entfernt genug
						} else {
							quad1(n,cb);
							quad2(n,cb);
						}
					}
					function sqr(v) { return v*v }
				} else {
					xc = nodes[0].x;
					yc = nodes[0].y;
					w = nodes[0].weight;
					return function (n,cb) {
						cb(xc, yc, w);
					}
				}
			}

			return force;
		}
		simulation.force('link', forceLink);
		function forceLink(alpha) {
			data.edges.forEach(link => {
				var target = link.target;
				var source = link.source;
				var x = target.x + target.vx - source.x - source.vx || jiggle();
				var y = target.y + target.vy - source.y - source.vy || jiggle();
				var l = Math.sqrt(x * x + y * y);
				//l = l*alpha * link.weight/10000;
				l = alpha * link.weight/40;
				x *= l, y *= l;
				target.vx -= x;
				target.vy -= y;
				source.vx += x;
				source.vy += y;
			})
			function jiggle() {
				return (Math.random() - 0.5) * 1e-6;
			}
		}
		simulation.force('center', forceGravity);
		function forceGravity(alpha) {
			var k = alpha * 0.0001;
			data.nodes.forEach(n => {
				var s = k*Math.sqrt(n.x*n.x + n.y*n.y);
				n.vx -= s*n.x;
				n.vy -= s*n.y;
			})
		}

		simulation.on('tick', redraw);
	}

	function redraw() {
		if (!simulation) return;
		
		ctx.clearRect(0, 0, width*retina, height*retina);

		//console.log(data.nodes[0].x, data.nodes[0].y);
		var minX = 1e10, maxX = -1e10;
		var minY = 1e10, maxY = -1e10;
		data.nodes.forEach(n => {
			if (minX > n.x) minX = n.x;
			if (maxX < n.x) maxX = n.x;
			if (minY > n.y) minY = n.y;
			if (maxY < n.y) maxY = n.y;
		})

		var xc = (minX+maxX)/2;
		var yc = (minY+maxY)/2;
		var s = 0.95*Math.min(width/(maxX-minX), height/(maxY-minY));

		data.nodes.forEach(n => {
			n.px = retina*((n.x-xc)*s+width/2);
			n.py = retina*((n.y-yc)*s+height/2);
			n.pr = retina*0.5;
		})

		ctx.lineWidth = 0.1;
		ctx.strokeStyle = 'rgba(255,0,0,0.3)';
		data.edges.forEach(e => {
			if (e.retweeting < 5) return;
			ctx.beginPath();
			ctx.moveTo(e.source.px, e.source.py);
			ctx.lineTo(e.target.px, e.target.py);
			ctx.stroke();
		})

		ctx.fillStyle = 'rgba(0,0,0,0.3)';
		data.nodes.forEach(n => {
			ctx.beginPath();
			ctx.arc(n.px, n.py, n.pr, 0, 2*Math.PI);
			ctx.fill();
		})
	}

})


function decompressObjectArray(data) {
	var result = [];
	Object.keys(data).forEach(key => {
		data[key].forEach((v,i) => {
			if (!result[i]) result[i] = {};
			result[i][key] = v;
		})
	});
	return result;
}

function decompressDiff(data) {
	for (var i = 1; i < data.length; i++) data[i] += data[i-1];
	return data;
}

function decompressRLE(data) {
	var result = [];
	var i0 = 0;
	for (var i = 0; i < data.length; i++) {
		if (Array.isArray(data[i])) {
			add(i0,i-1);
			i0 = i+1;
			var block = new Array(data[i][1]+1);
			block.fill(data[i][0], 0, data[i][1]+2);
			result.push(block);
		}
	}
	add(i0,data.length-1);

	function add(i0, i1) {
		if (i1 < i0) return;
		result.push(data.slice(i0, i1+1));
	}

	result = Array.prototype.concat.apply([],result);

	return result;
}