"use strict"

const EventEmitter = require('events');

class Queue extends EventEmitter {
	constructor() {
		super();
		this.isEnding = false;
		this.isFinished = false;
		this.isReadable = false;
		this.isWritable = true;
		this.id = false;
		this.line = false;
		this.maxEntries = 100;
		this.queue = [];
	}
	/*
	const me = {
		isWritable: true,
		isReadable: false,
		id: false,
		line: false,

		push:push,
		shift:shift,
		end:end,

		onFinished:onFinished,
		onReadable:onReadable,
		onWriteable:onWriteable,
	}*/

	push(line) {
		if (this.isEnding) throw Error();
		if (this.isFinished) throw Error();

		this.queue.push(line);

		if (this.isWritable && (this.queue.length >= this.maxEntries)) {
			this.isWritable = false;
		}

		if (!this.isReadable) {
			this._update();
			this.isReadable = true;
			this.emit('changed');
		}

		return this.isWritable;
	}

	shift() {
		if (this.isFinished) throw Error();

		this.queue.shift();

		this._update();

		if (this.isReadable && (this.queue.length === 0)) {
			this.isReadable = false;
			if (this.isEnding) this._close();
		}

		if ((!this.isWritable) && (this.queue.length < this.maxEntries)) {
			this.isWritable = true;
			this.emit('writable');
		}
	}

	end() {
		if (this.isEnding) throw Error();
		if (this.isFinished) throw Error();

		this.isEnding = true;
		if (this.queue.length === 0) this._close();
	}

	_close() {
		if (this.isFinished) throw Error();
		
		this.isFinished = true;
		this.emit('changed');
	}

	_update() {
		if (this.queue.length === 0) {
			this.line = false;
			this.id = false;
		} else {
			this.line = this.queue[0];
			var i = this.line.indexOf('\t');
			this.id = (i >= 0) ? this.line.slice(0, i) : this.line;
		}
	}
}

module.exports = Queue;