"use strict"

const EventEmitter = require('events');

class Stack extends EventEmitter {
	constructor() {
		super();
		this.isEnding = false;
		this.isFinished = false;
		this.isReadable = false;
		this.isWritable = true;
		this.id = false;
		this.line = false;
		this.maxEntries = 100;
		this.stack = [];
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

		this.stack.push(line);

		if (this.isWritable && (this.stack.length >= this.maxEntries)) {
			this.isWritable = false;
		}

		if (!this.isReadable) {
			this._update();
			this.isReadable = true;
			this.emit('changed');
			this.emit('readable');
		}

		return this.isWritable;
	}

	shift() {
		if (this.isFinished) throw Error();

		this.stack.shift();

		if (this.stack.length > 0) this._update();

		if (this.isReadable && (this.stack.length === 0)) {
			this.isReadable = false;
			if (this.isEnding) this._close();
		}

		if ((!this.isWritable) && (this.stack.length < this.maxEntries)) {
			this.isWritable = true;
			this.emit('writable');
		}

		if (this.stack.length === 0) {
			this.isFinished = true;
			this.emit('changed');
			this.emit('finished');
		}
	}

	end() {
		if (this.isEnding) throw Error();
		if (this.isFinished) throw Error();

		this.isEnding = true;
		if (this.stack.length === 0) this._close();
	}

	_close() {
		if (this.isFinished) throw Error();
		
		this.isFinished = true;
		this.emit('changed');
		this.emit('finished');
	}

	_update() {
		this.line = this.stack[0];
		var i = this.line.indexOf('\t');
		this.id = (i >= 0) ? this.line.slice(0, i) : this.line;
	}
}

module.exports = Stack;