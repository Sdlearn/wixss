'use strict';

var crypto = require('crypto'),
	colors = require('colors'),
	fs = require('fs');


var LOG_URL_MAXLEN = 50;



function getFormatTime() {
	var dt = new Date();
	return (
		('0'  + dt.getHours()).slice(-2)   + ':' +
		('0'  + dt.getMinutes()).slice(-2) + ':' +
		('0'  + dt.getSeconds()).slice(-2) + '.' +
		('00' + dt.getMilliseconds()).slice(-3)
	);
}


function display(color, arg) {
	var arr = [];
	arr[0] = getFormatTime()[color];

	for(var i = 0, n = arg.length; i < n; i++) {
		arr[i + 1] = arg[i];
	}
	console.log.apply(null, arr);
}

exports.log = function() {
	display('green', arguments);
}

exports.warn = function() {
	display('yellow', arguments);
}

exports.err = function() {
	display('red', arguments);
}

exports.readText = function(path) {
	try {
		return fs.readFileSync(path).toString();
	}
	catch(e) {}
}

exports.formatUrl = function(url) {
	if (url.length < LOG_URL_MAXLEN)
		return url;

	return url.substr(0, LOG_URL_MAXLEN - 10) + '...'.yellow + url.slice(-7);
}

exports.md5 = function(data) {
    var md5sum = crypto.createHash('md5');
    md5sum.update(data);
    return md5sum.digest('hex');
}



















// for debug


/**
 * 通配符转正则
 *   * 匹配若干字符
 *   ? 匹配单个字符
 */
exports.wild2reg = function(str) {

	return new RegExp(str
		.replace(/\./g, '\\.')
		.replace(/\+/g, '\\+')
		.replace(/\|/g, '\\|')
		.replace(/\$/g, '\\$')
		.replace(/\^/g, '\\^')
		.replace(/\[/g, '\\[')
		.replace(/\]/g, '\\]')
		.replace(/\(/g, '\\(')
		.replace(/\)/g, '\\)')
		.replace(/\(/g, '\\(')

		.replace(/\*+/g, '.*')
		.replace(/\?/g, '.')
	, 'i');
}



/**
 * 显示cookie
 */
function dumpQuery(url) {
	if (!url)
		return;

	var pos_query = url.indexOf('?');
	if (pos_query == -1)
		return;

	var query = url.substr(pos_query + 1);
	query = query.split('&');

	// 标题
	var title = 'QUERY (' + query.length + ')';
	console.log(title.bold);

	// 内容
	query.forEach(function(item) {
		var arg = item.split('=');
		console.log(
			'    ' +
			arg[0].red +
			': '.bold +
			unescape(arg[1]).yellow
		);
	});
}

exports.dumpQuery = dumpQuery;


/**
 * 显示cookie
 */
function dumpCookie(cookie) {
	if (!cookie)
		return;
	cookie = cookie.split('; ');

	// 标题
	var title = 'COOKIE (' + cookie.length + ')';
	console.log(title.bold);

	// 内容
	cookie.forEach(function(item) {
		var arr = item.split('=');
		console.log(
			'    ' +
			arr[0].red +
			': ' +
			unescape(arr[1]).yellow
		);
	});
}

exports.dumpCookie = dumpCookie;


/**
 * 显示http头部
 */
function dumpHeader(header) {
	if (!header) {
		return;
	}

	var keys = Object.keys(header);

	// 打印headers
	var title = 'HEADER (' + keys.length + ')';
	console.log(title.bold);

	keys.forEach(function(k) {
		console.log(
			'    ' +
			k.red +
			': ' +
			header[k].yellow
		);

		// dump cookie
		if (/^COOKIE$/i.test(k)) {
			dumpCookie(header[k]);
			return;
		}
	});
}

exports.dumpHeader = dumpHeader;


/**
 * 显示完整请求
 */
function dumpRequest(request) {
	
	console.log(
		request.method.bold,
		request.url
	);
	dumpQuery(request.url);
	dumpHeader(request.headers);
}

exports.dumpRequest = dumpRequest;



/**
 * 字符空白填充
 */
var SPACE_CACHE = {};

function strPad(str, totalLen) {
	var space = SPACE_CACHE[totalLen];
	if (!space) {
		space = SPACE_CACHE[totalLen] = Array(totalLen).join(' ');
	}
	return (str + space).substr(0, totalLen);
}

exports.strPad = strPad;



/**
 * 画分割线
 */
var ARR_WIDE = Array(process.stdout.columns);
var LINE_CACHE = {};


function drawLine(color, char) {
	if (!char) char = '*';

	var line = LINE_CACHE[char];
	if (!line) {
		line = LINE_CACHE[char] = ARR_WIDE.join(char);
	}

	console.log(line[color]);
}

exports.drawLine = drawLine;