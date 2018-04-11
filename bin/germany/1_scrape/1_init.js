
const level = require('level');

//var startId = '50503396';

var db1 = level('_todos', { keyEncoding: 'ascii', valueEncoding: 'ascii' });
db1.put('00000000', '50503396')

var db2 = level('_checked', { keyEncoding: 'ascii', valueEncoding: 'ascii' });
db1.put('50503396', '00000000');