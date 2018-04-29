$(function () {
	var wrapper = $('#wrapperleft');
	var canvas = $('#canvas');
	var ctx = canvas.get(0).getContext('2d');
	var width, height, retina, simulation;
	var doRedraw = false;
	var nodeCount = 3000;
	var mouseX, mouseY, mousedown = false, selectedNode;
	var slow = true, startTime = 1e50;

	canvas.mousedown(e => {mousedown = true; click(e)});
	canvas.mouseup(() => mousedown = false);
	canvas.mouseleave(() => mousedown = false);
	//canvas.mousemove(e => {if (mousedown) click(e)});
	
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
		doRedraw = 2;
	}

	var data;

	generateData();
	//simulateFakeNews();
	doRedraw = 1;
	init();

	function init() {
		simulation = d3.forceSimulation(data.nodes);
		simulation.alphaMin(0.1);
		simulation.alphaDecay(1 - Math.pow(simulation.alphaMin(), 1 / 100)),

		simulation.force('charge', forceRepulsion());
		function forceRepulsion() {
			var nodes,
			    strength = -100,
			    theta2 = 1;

			function force(alpha) {
				var tree = quadtree(nodes);
				nodes.forEach(n => tree(n, (x,y,w) => {
					var dx = x - n.x;
					var dy = y - n.y;
					var d = dx*dx + dy*dy;
					if (d < 1e-6) return;
					d = strength*w*alpha*Math.pow(d+0.1, -1.5);
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
					var size = sqr(x1-x0)+sqr(y1-y0);

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
						var d = sqr(n.x-xc)+sqr(n.y-yc);
						if (d > theta2*size) {
							cb(xc,yc,w); // entfernt genug
						} else {
							quad1(n,cb);
							quad2(n,cb);
						}
					}
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
				if (link.weight === 0) return;

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
		//simulation.force('center', forceGravity);
		function forceGravity(alpha) {
			var k = alpha * 0;
			data.nodes.forEach(n => {
				var s = k/*Math.sqrt(n.x*n.x + n.y*n.y)*/;
				n.vx -= s*n.x;
				n.vy -= s*n.y;
			})
		}

		simulation.on('tick', () => doRedraw += 0.1);
		simulation.on('end', () => {
			console.log('Finished');
			doRedraw = 2;
		});

		setInterval(redraw, 20);
	}

	function redraw() {
		//if (mousedown && selectedNode) markFakeNews(selectedNode, slow);

		if (doRedraw < 1) return;
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
			n.pr = retina*Math.sqrt(n.weight)*2;
		})

		var playTime = 10*(Date.now()-startTime)/1000;

		if (doRedraw >= 2) {
			ctx.lineWidth = 0.5*retina;
			data.edges.sort((a,b) => a.prio - b.prio);
			data.edges.forEach(e => {
				if (playTime < 0) {
					ctx.strokeStyle = '#00a';
				} else if (playTime < e.endTime) {
					ctx.strokeStyle = '#bbf';
				} else if (playTime > e.endTime) {
					ctx.strokeStyle = '#c00';
				}
				ctx.beginPath();
				ctx.moveTo(e.source.px, e.source.py);
				ctx.lineTo(e.target.px, e.target.py);
				ctx.stroke();

				if ((playTime >= e.startTime) && (playTime < e.endTime) ) {
					var a = (playTime-e.startTime)/(e.endTime-e.startTime);
					var s = e.forward ? e.source : e.target;
					var t = e.forward ? e.target : e.source;
					ctx.strokeStyle = '#c00';
					ctx.beginPath();
					ctx.moveTo(s.px, s.py);
					ctx.lineTo(
						(t.px-s.px)*a+s.px,
						(t.py-s.py)*a+s.py,
					);
					ctx.stroke();
				}
			})
		}

		data.nodes.forEach(n => {
			if (playTime < 0) {
				ctx.fillStyle = '#00a';
			} else if (playTime < n.gotTime) {
				ctx.fillStyle = '#bbf';
			} else if (playTime < n.sendTime) {
				ctx.fillStyle = '#c66';
			} else {
				ctx.fillStyle = '#c00';
			}
			ctx.beginPath();
			ctx.arc(n.px, n.py, n.pr, 0, 2*Math.PI);
			ctx.fill();
		})

		if (startTime > 1e49) return doRedraw = 0;
		if (playTime > 100) return doRedraw = 0;
	}

	function click(e) {
		mouseX = e.clientX*retina;
		mouseY = e.clientY*retina;

		var minD = 400*retina, minNode = false;
		data.nodes.forEach(n => {
			var d = Math.sqrt(sqr(n.px-mouseX)+sqr(n.py-mouseY));
			if (d < minD) {
				minD = d;
				minNode = n;
			}
		})
		selectedNode = minNode;

		markFakeNews(selectedNode);
		startTime = Date.now()+0;
	}

	function markFakeNews(startNode) {
		if (!startNode) return;

		var todos = [];

		data.edges.forEach(e => {
			e.prio = 1e50;
			e.startTime = 1e50;
			e.endTime = 1e50;
			e.transmitted = false;
		});
		data.nodes.forEach(n => {
			n.gotTime = 1e50;
			n.sendTime = 1e50;
			n.received = false;
			n.send = false;
		})

		nodeReceived(startNode, -1);
		nodeSend(startNode, Math.random());

		function nodeReceived(node, time) {
			if (node.received) return;
			node.received = true;

			node.gotTime = time;
			if (node.prop > Math.random()) {
				todos.push([nodeSend, node, time+Math.random()*1]);
				return true;
			}
		}

		function nodeSend(node, time) {
			var changes = false
			if (node.send) return;
			node.send = true;

			node.sendTime = time;
			node.neighbours.forEach(entry => {
				var node2 = entry[0];
				var edge = entry[1];

				if (!edge.transmitted) {
					edge.prio = time;
					edge.startTime = time;
					edge.endTime = time + edge.length/100;
					edge.forward = (edge.source === node);
					edge.transmitted = true;

					if (!node2.received) {
						todos.push([nodeReceived, node2, edge.endTime]);
						changes = true;
					}
				}
			})

			return changes;
		}


		todos.sort((a,b) => a[2]-b[2]);
		while (todos.length > 0) {
			var todo = todos.shift();
			var n = todos.length;
			var result = todo[0].call(this, todo[1], todo[2]);
			if (result) todos.sort((a,b) => a[2]-b[2]);
		}

		//console.log(end);

		//console.table(data.nodes);
		//console.table(data.edges);

		

		doRedraw = 2;
/*
		data.edges.forEach(e => {
			e.color = '#bbf';
			e.prio = 2;
			e.forward = true;
			e.checked = false;
			e.
		});
		data.nodes.forEach(n => {
			n.checked = false;
			n.sendFake = false;
			n.gotFake = false;
			n.color = '#bbf';
			n.startTime = 1e10;
		})

		startNode.color = '#c00';
		startNode.checked = true;
		startNode.sendFake = true;
		startNode.gotFake = true;
		startNode.startTime = 0;
		var checkSender = new Set([startNode]), checkReceiver;

		do {
			didSomething = false;
			checkReceiver = new Set();

			Array.from(checkSender.values()).forEach(n => {
				n.neighbours.forEach(entry => {
					var edge = entry[1];
					if (!edge.checked) {
						edge.color = '#c00';
						edge.prio = 0;
						edge.startTime = n.startTime;
						edge.forward = edge.source === n;
						edge.checked = true;
					}

					if (!entry[0].checked) {
						checkReceiver.add(entry[0]);
						entry[0].startTime = n.startTime+1;
					}
				})
			})

			checkSender = new Set();
			Array.from(checkReceiver.values()).forEach(n => {
				n.gotFake = true;
				if (n.prop > Math.random()) {
					n.color = '#c00';
					n.sendFake = true;
					checkSender.add(n);
				} else {
					n.color = '#e90';				}
				n.checked = true;
			})
		} while (!slow && (checkSender.size > 0));

		if (slow && (checkSender.size > 0)) setTimeout(() => markFakeNews(false, true), 300);
		*/
	}

	function generateData() {
		var maxR = 1000;

		var nodes = [];
		for (var i = 0; i < nodeCount; i++) {
			var node = getRandomNode(0,0,maxR/2);
			node.group = 0;
			node.prop = 0.1;
			nodes.push(node);
		}

		
		for (var i = 0; i < nodeCount*0.1; i++) {
			var node = getRandomNode(maxR*0.6,0,0.2*maxR/2);
			node.group = 1;
			node.prop = 0.3;
			nodes.push(node);
		}
		
		

		var edges = [];
		var nodesLeft = nodes;
		while (nodesLeft.length > 0) {
			var node = nodesLeft[Math.floor(nodesLeft.length*Math.random())];
			
			nodesLeft.forEach(n => {
				n.d = Math.sqrt(sqr(node.x-n.x) + sqr(node.y-n.y)) + Math.random()*maxR*0.2;
			})
			nodesLeft.sort((a,b) => a.d - b.d);

			for (var i = 0; i < Math.min(nodesLeft.length, node.count); i++) {
				var rNode = nodesLeft[i];
				var edge = {
					source:node,
					target:rNode,
					weight:1,//Math.sqrt(node.weight*rNode.weight)
					//color:'#00f',
					length:rNode.d,
				};
				edges.push(edge);
				node.count--;
				rNode.count--;
				node.neighbours.push([rNode,edge]);
				rNode.neighbours.push([node,edge]);
			}
			nodesLeft = nodesLeft.filter(n => n.count > 0);
		}

		data = {
			nodes: nodes,
			edges: edges,
		}

		function getRandomNode(x0,y0,r0) {
			var alpha = Math.random()*Math.PI*2;
			var r = Math.pow(Math.random(), 0.5)*r0;
			//var count = Math.round(Math.pow(Math.random(),50)*100+10);
			var count = Math.round(Math.pow(Math.random(),5)*25+5);
			//console.log(count);
			return {
				x: x0 + r*Math.cos(alpha),
				y: y0 + r*Math.sin(alpha),
				count: count,
				weight: count/10,
				//color: '#00a',
				neighbours: [],
				prop: 0.1,
			}
		}

		function gauss() {
			return (Math.random() + Math.random() + Math.random() + Math.random() + Math.random() + Math.random() - 3) / 3;
		}
	}

	function simulateFakeNews() {
		var histo = [];

		for (var i = 0; i < 10000; i++) {
			var sumGot = 0, sumSend = 0, sumNone = 0;
			var node = data.nodes[Math.floor(data.nodes.length*Math.random())];
			markFakeNews(node);
			data.nodes.forEach(n => {
				if (!n.gotFake ) return sumNone++;
				if (!n.sendFake) return sumGot++;
				sumSend++;
			})
			if (histo[sumNone]) histo[sumNone].none++; else histo[sumNone] = {none:1, got:0, send:0};
			if (histo[sumGot ]) histo[sumGot ].got++;  else histo[sumGot ] = {none:0, got:1, send:0};
			if (histo[sumSend]) histo[sumSend].send++; else histo[sumSend] = {none:0, got:0, send:1};
		}

		//console.table(histo);
	}

})

function sqr(v) { return v*v }