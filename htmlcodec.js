var iconv = require('iconv-lite');


var queue = [];



exports.parse = function(data, charset) {

	var text = data.toString();

	//
	// 正常的html起始元素
	//
	if (! /^\s*(<!|<html|<script|<img|<font)/i.test(text) ) {
		return data;
	}

	//
	// 优先使用<meta>标签里的charset标记：
	//   <meta charset="utf-8" />
	//   <META HTTP-EQUIV="Content-Type" CONTENT="text/html; CHARSET=GBK">
	//
	var val = text.match(/<meta\s+[^>]*charset=['"]?([\w\-]*)/i);
	if (val) {
		charset = val[1];
	}

	// 将html二进制数据转为 utf-8字符
	charset = charset ? charset.toLowerCase() : 'utf-8';

	if (charset != 'utf-8') {
		text = iconv.decode(data, charset);
	}

	// callbacks
	queue.forEach(function(cb) {
		text = cb(text);
	});
	
	// 转回二进制数据
	return (charset == 'utf-8')
		? new Buffer(text)
		: iconv.encode(text, charset);
};


exports.addListener = function(lisn) {
	queue.push(lisn);
};
