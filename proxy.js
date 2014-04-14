'use strict';

var program = require('commander'),
	colors = require('colors'),
	http = require('http'),
	https = require('https'),
	zlib = require('zlib'),
	util = require('./util'),
	htmlcodec = require('./htmlcodec'),
	sslclear = require('./sslclear');




function proxyErr(clientReq, clientRes, err) {

	if (!program.quiet) {
		util.err('[WEB]', err);
	}
	clientRes.writeHead(404);
	clientRes.end();
}


/**
 * 代理返回
 */
function proxyResponse(clientReq, clientRes, status, header, data) {

	header = header || {};

	if (!data || data.length == 0) {
		flush();
	}

	//
	// 返回注入后的网页（尽可能压缩）
	//
	var usrEnc = clientReq.headers['accept-encoding'];
	var fnEnc;

	if (usrEnc) {
		if (/gzip/i.test(usrEnc)) {
			fnEnc = zlib.gzip;
			header['content-encoding'] = 'gzip';
		}
		else if (/deflate/i.test(usrEnc)) {
			fnEnc = zlib.deflate;
			header['content-encoding'] = 'deflate';
		}
		else {
			delete header['content-encoding'];
		}
	}

	if (fnEnc) {
		fnEnc(data, function(err, buf) {
			if (err) {
				proxyErr(clientReq, clientRes, err);
			} else {
				flush(buf);
			}
		});
	}
	else {
		flush(data);
	}

	function flush(buf) {
		if (buf && buf.length > 0) {
			header['content-length'] = buf.length;
		}
		clientRes.writeHead(status, header);
		clientRes.end(buf);
	}
}


/**
 * 代理处理
 */
function proxyProcess(clientReq, clientRes, clientData, serverRes) {

	var resHeader = serverRes.headers;

	if (program.sslclear) {
		//
		// 302 https
		//   client <-http-> MidMan <-https-> internet
		//
		if (sslclear.checkRedir(serverRes)) {
			proxyRequest(clientRes, clientRes, clientData, true);
			return;
		}

		// clear https symbols
		sslclear.checkRes(serverRes);
	}

	//
	// 不是html文件直接管道转发。
	//
	//   很多网站使用gzip+chunk传输网页，并且使用gbk编码，
	//   因此必须全部接收完才能注入。
	//
	var mime = resHeader['content-type'] || '';
	if (! /html/i.test(mime)) {
		clientRes.writeHead(serverRes.statusCode, resHeader);
		serverRes.pipe(clientRes);
		return;
	}

	//
	// gzip 数据解压
	//
	var svrEnc = resHeader['content-encoding'];
	var stream = serverRes;

	if (svrEnc) {
		if (/gzip/i.test(svrEnc)) {
			stream = serverRes.pipe( zlib.createGunzip() );
		}
		else if (/deflate/i.test(svrEnc)) {
			stream = serverRes.pipe( zlib.createInflateRaw() );
		}
	}

	//
	// 接收数据块到缓冲区
	//
	var data = new Buffer(0);

	stream.on('data', function(chunk) {
		data = Buffer.concat([data, chunk]);
	});

	stream.on('end', function() {

		if (data.length > 0) {
			//
			// 整个网页接收完成，注入！
			//
			var charset = mime.match(/charset=(.+)/i);
			if (charset) {
				charset = charset[1];
			}
			data = htmlcodec.parse(data, charset);
		}

		// output
		proxyResponse(clientReq, clientRes,
			serverRes.statusCode, serverRes.headers, data);
	});

	stream.on('error', function(err) {
		proxyErr(clientReq, clientRes, err);
	});
}


/**
 * 代理发起
 */
function proxyRequest(clientReq, clientRes, clientData, ssl) {

	var host = clientReq.headers['host'];
	var domain, port;

	//
	// HOST: domain:port
	//
	var pos = host.indexOf(':');
	if (pos != -1) {
		domain = host.substr(0, pos);
		port = +host.substr(pos + 1) || 80;
	}
	else {
		domain = host;
		port = 80;
	}

	// access log
	if (!program.quiet) {

		var fullUrl = (ssl? 'https://' : 'http://') + host + clientReq.url;
		var addr = util.strPad(clientReq.connection.remoteAddress, 15);
		var met = util.strPad(clientReq.method, 4);

		util.log('[WEB]', addr, met.bold, util.formatUrl(fullUrl));

		if (program.dump) {
			util.dumpRequest(clientReq);
		}
	}


	// 代理请求参数
	var request = ssl ? https.request : http.request;
	var options = {
		host: host,
		port: port,
		method: clientReq.method,
		path: clientReq.url,
		headers: clientReq.headers
	};

	// ..
	var proxy = request(options, function(serverRes) {
		proxyProcess(clientReq, clientRes, clientData, serverRes);
	});

	proxy.on('error', function(err) {
		proxyErr(clientReq, clientRes, err);
	});

	proxy.end(clientData);
}


/**
 * 客户端HTTP请求
 */
function onHttpRequest(req, res) {

	var ssl;

	//
	// GET http(s)://domain/path
	//
	var pos = req.url.indexOf('://');
	if (pos != -1 && pos <= 5) {
		if (/^https/i.test(req.url)) {
			ssl = true;
		}

		// slash before path
		pos = req.url.indexOf('/', pos + 3);
		if (pos == -1) {
			proxyErr(req, res, 'BAD URL');
			return;
		}

		// path
		req.url = req.url.substr(pos);
	}

	// wait for all data
	var buf = new Buffer(0);

	req.on('data', function(chunk) {
		buf = Buffer.concat([buf, chunk]);
	});

	req.on('end', function() {
		if (extraHttpSvc(req, res, buf)) {
			return;
		}
		proxyRequest(req, res, buf, ssl);
	});
}


var svcList = [];

function extraHttpSvc(req, res, data) {
	// ...
	for(var i = 0, n = svcList.length; i < n; i++) {

		var r = svcList[i].request(req, data);
		if (r) {
			if (r.err) {
				proxyErr(req, res, r.err);
			}
			else {
				proxyResponse(req, res,
					r.status, r.header, r.data);
			}
			return true;
		}
	}
}

exports.setExtraSvc = function(list) {
	svcList = list;
};


/**
 * 启动代理服务
 */
exports.start = function() {
    var svrHttp = http.createServer(onHttpRequest);

    svrHttp.listen(80, function() {
        util.log('[WEB] running');
    });

    svrHttp.on('error', function() {
        util.err('[WEB] fail bind TCP:80');
    });
};
