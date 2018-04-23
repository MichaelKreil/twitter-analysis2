"use strict"

const emojiText = require('emoji-text');

module.exports = extractText;

var charList = [];
'abcdefghijklmnopqrstuvwxyzäöüß0123456789_@# '.split('').forEach(c => charList[c.charCodeAt(0)] = true);
'-./:!"$%&\'()*+,;=?[]^`{|}~§\n\t\r'.split('').forEach(c => charList[c.charCodeAt(0)] = false);

function extractText(text) {
	text = text.replace(/https:[a-z0-9\/\.]+/gi, ' ');
	text = emojiText.convert(text, { before:' _', after:'_ ' });
	text = text.toLowerCase();
	text = text.split('').map(checkChar).join('');
	text = text.replace(/\s+/g,' ').trim();
	return text;
}

function checkChar(char) {
	var code = char.charCodeAt(0);
	var result = charList[code];
	if (result === true) return char;
	if (result === false) return ' ';
	return ' ';
	//console.log(char, code);
}
