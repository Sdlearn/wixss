'use strict';

var util = require('./util'),
	mime = require('mime'),
    fs = require('fs');


var rootDefault;
var host_path = {};



exports.add = function(host, localPath) {
	host_path[host] = localPath;
};


exports.request = function(req, res) {

	var host = req.headers['host'];

	// virtual site
	var root = host_path[host];
	if (!root) {
		root = rootDefault + host;
	}


	var path = req.url;
	if (path == '/') {
		path += 'index.html';
	}

	// cgi...


	// static file
	path = root + path;
	path = path.replace(/\.\./g, '');


	var ret = {};
	try {
		ret.data = fs.readFileSync(path);
	}
	catch(e) {
		ret.status = 404;
		return ret;
	}

	ret.status = 200;
	ret.header = {
		'content-type': mime.lookup(path)
	};
	return ret;
}


exports.init = function() {
	rootDefault = './asset/static/';
	return true;
};
