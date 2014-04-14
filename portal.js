'use strict';

var program = require('commander'),
    site = require('./site'),
    config = require('./config.json');

var visted = {};



var urlWithoutProt;


exports.request = function(req) {

    var url = req.headers['host'] + req.url;
    if (url == urlWithoutProt) {
        return;
    }

    // 准入模式，直接重定向到portal页面

	var ip = req.connection.remoteAddress;

	if (ip in visted) {
		return;
	}

    return {
        status: 302,
        header: {
            'location': config['portal_url']
        }
    };
};


exports.init = function() {
    urlWithoutProt = config['portal_url'].replace(/^http:\/\//i, '');

    var host = urlWithoutProt.split('/')[0];
    site.add(host, './asset/portal/');
    return true;
};

