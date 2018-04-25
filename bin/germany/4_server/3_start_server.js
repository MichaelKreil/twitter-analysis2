"use strict"

const fs = require('fs');
const path = require('path');
const lzma = require('lzma-native');
const async = require('async');
const level = require('level');
const Canvas = require('canvas');
const express = require('express');

var db, screen_names, nodeX, nodeY, nodeCount, app, tileTree, maxValue, decinhex;
var cache = new Map();
var dataFolder = path.resolve(__dirname, '../../../data/germany/');

console.log('read colors: started');
var colors = {};
async.eachSeries(
	fs.readdirSync(dataFolder),
	(filename, cb) => {
		var key = filename.match(/^color_(.*)\.bin\.xz$/);
		if (!key) return cb();
		key = key[1];
		console.log('   read '+key);
		readColors(
			path.resolve(dataFolder,filename),
			result => {
				colors[key] = result;
				cb();
			}
		)
	},
	() => {
		console.log('read colors: finished');
		async.parallel([
			initServer,
			initData,
			initDatabase
		])	
	}
)


function initServer(cb) {
	console.log('init server: started');

	app = express();
	app.use(express.static(path.resolve(__dirname, '../web/')));
	app.get('/tile/:color/:z/:x/:y.jpg', (req, res) => {
		respond();
		function respond() {
			if (!tileTree) return setTimeout(respond, 1000);

			var key = Object.keys(req.params).sort().map(k => k+'='+req.params[k]).join(',');
			if (cache.has(key)) return send(cache.get(key))

			fetchTile(
				parseInt(req.params.z, 10),
				parseInt(req.params.x, 10),
				parseInt(req.params.y, 10),
				colors[req.params.color],
				buffer => {
					cache.set(key, buffer);
					send(buffer);
				}
			)
		}

		function send(buffer) {
			res
				.status(200)
				.type('jpeg')
				.send(buffer)
		}
	})
	app.get('/get/point/:x/:y', (req, res) => {
		findPoints(
			parseFloat(req.params.x),
			parseFloat(req.params.y),
			points => res.status(200).json(points)
		)
	})
	app.get('/get/screen_name/:name', (req, res) => {
		findScreenName(req.params.name, 
			points => res.status(200).json(points)
		)
	})
	app.get('/get/schemes', (req, res) => {
		res.status(200).json(Object.keys(colors));
	})
	app.listen(8080);

	console.log('init server at http://localhost:8080 - finished');
}

function initData(cb) {
	console.log('init data: started');
	var x,y;

	async.parallel(
		[
			cb => lzma.decompress(
				fs.readFileSync(path.resolve(dataFolder,'positionsX.bin.xz')),
				result => { x = result; cb(); }
			),
			cb => lzma.decompress(
				fs.readFileSync(path.resolve(dataFolder,'positionsY.bin.xz')),
				result => { y = result; cb(); }
			)
		],
		() => {
			nodeCount = x.length/8;

			nodeX = new Float64Array(nodeCount);
			nodeY = new Float64Array(nodeCount);

			x.copy(Buffer.from(nodeX.buffer));
			y.copy(Buffer.from(nodeY.buffer));

			var pointList = new Array(nodeCount);
			maxValue = 0;
			for (var i = 0; i < nodeCount; i++) {
				pointList[i] = i;
				if (maxValue < Math.abs(nodeX[i])) maxValue = Math.abs(nodeX[i]);
				if (maxValue < Math.abs(nodeY[i])) maxValue = Math.abs(nodeY[i]);
			}

			tileTree = [[[pointList]]];

			console.log('init data: finished');
			cb();
		}
	)
}

function initDatabase(cb) {
	console.log('init database: started');
	db = level('_server', { keyEncoding: 'utf8', valueEncoding: 'utf8' });
	console.log('init database: finished');
}

function getPointList(z,x,y) {
	if (z < 0) return [];
	if (x < 0) return [];
	if (y < 0) return [];

	var s = Math.pow(2,z);
	if (x >= s) return [];
	if (y >= s) return [];

	if (tileTree[z] && tileTree[z][x] && tileTree[z][x][y]) return tileTree[z][x][y];
	
	var pointList = getPointList(z-1, Math.floor(x/2), Math.floor(y/2));
	var step = Math.pow(0.5, z)*2*maxValue;
	var pad = Math.pow(10, z/13)*0.1;
	var minX = (x  -pad)*step - maxValue;
	var maxX = (x+1+pad)*step - maxValue;
	var minY = (y  -pad)*step - maxValue;
	var maxY = (y+1+pad)*step - maxValue;
	//console.log(z, x, y, maxValue, step, minX, maxX, minY, maxY);

	pointList = pointList.filter(index => {
		var x = nodeX[index];
		var y = nodeY[index];
		if (x < minX) return false;
		if (x > maxX) return false;
		if (y < minY) return false;
		if (y > maxY) return false;
		return true;
	})

	if (!tileTree[z]) tileTree[z] = [];
	if (!tileTree[z][x]) tileTree[z][x] = [];
	tileTree[z][x][y] = pointList;

	return pointList;
}

function fetchTile(z, x, y, colors, cb) {
	var pointList = getPointList(z,x,y);

	var size = 256;
	var step = Math.pow(0.5, z)*2*maxValue;
	var minX = x*step - maxValue;
	var minY = y*step - maxValue;
	var zoom = size/step;

	var canvas = new Canvas(size, size), ctx = canvas.getContext('2d');

	ctx.fillStyle = '#fff';
	ctx.fillRect(0,0,size,size);

	var minRadius = 0.04*Math.pow(2,z/2);

	pointList.forEach(index => {
		ctx.fillStyle = colors[index].color;
		ctx.beginPath();
		ctx.arc(
			(nodeX[index]-minX)*zoom,
			(nodeY[index]-minY)*zoom,
			minRadius*colors[index].radius,
			0,
			2*Math.PI
		)
		ctx.fill();
	})

	cb(canvas.toBuffer('jpg'));
}

function readColors(filename, cb) {
	if (!decinhex) {
		decinhex = new Array(256);
		for (var i = 0; i < 256; i++) decinhex[i] = (i+256).toString(16).slice(1);
	}

	var buffer = fs.readFileSync(filename);
	lzma.decompress(buffer, buffer => {
		var count = buffer.length/4;
		var array = new Array(count);
		var lookup = new Map();

		for (var i = 0; i < count; i++) {
			var key = `${buffer[i*4+0]},${buffer[i*4+1]},${buffer[i*4+2]},${buffer[i*4+3]}`;
			if (!lookup.has(key)) {
				lookup.set(key, {
					color:`#${decinhex[buffer[i*4+0]]}${decinhex[buffer[i*4+1]]}${decinhex[buffer[i*4+2]]}`,
					radius: Math.pow(32,buffer[i*4+3]/256)
				});
			}
			array[i] = lookup.get(key);
		}
		cb(array);
	});
}

function findPoints(x,y,cbFind) {
	x = (x - 0.5)*2*maxValue;
	y = (y - 0.5)*2*maxValue;
	var minD = 1e50;
	var bestIndex = -1;

	for (var i = 0; i < nodeCount; i++) {
		var d = sqr(nodeX[i] - x) + sqr(nodeY[i] - y);
		if (d < minD) {
			minD = d;
			bestIndex = i;
		}
	}

	var data = [bestIndex];

	async.map(
		data,
		(index, cb) => {
			db.get('node_'+index, (err, key) => {
				db.get(key, (err, obj) => {
					obj = JSON.parse(obj);
					obj.x = nodeX[index]/(2*maxValue) + 0.5;
					obj.y = nodeY[index]/(2*maxValue) + 0.5;
					cb(null,obj);
				})
			})
		},
		(err, results) => {
			cbFind(results)
		}
	)

	function sqr(v) { return v*v }
}

function findScreenName(screen_name, cbFind) {
	db.get('name_'+screen_name.toLowerCase(), (err, key) => {
		db.get(key, (err, obj) => {
			if (err) return cbFind(false);
			obj = JSON.parse(obj);
			obj.x = nodeX[obj.node]/(2*maxValue) + 0.5;
			obj.y = nodeY[obj.node]/(2*maxValue) + 0.5;
			cbFind([obj]);
		})
	})
}

