var util = require('./util'),
	htmlcodec = require('./htmlcodec'),
	config = require('./config.json');


// 注入网页里的HTML代码
var injectHtml = '<script src="http://$EXT_URL"></script>';
// 外部脚本URL
var externUrl = '';
// 外部脚本内容
var externCode = '';

var externCodeParts = {};




function htmlInjectHandler(html) {
	return html.replace(/<head>|$/i, '$&' + injectHtml);
}



exports.updateExternJs = function(name, code) {
	
	if (externCodeParts[name] == code) {
		return;
	}
	externCodeParts[name] = code;

	// 合并多个外部脚本
	externCode = '';
	for(var k in externCodeParts) {
		externCode += externCodeParts[k];
	}
	externCode = new Buffer(externCode);

	
	// 外部脚本URL带内容的MD5，避免缓存
	var hash = 'v=' + util.md5(externCode).substr(0, 4);
	externUrl = config['extern_js'];

	if (externUrl.indexOf('?') == -1) {
		externUrl += ('?' + hash);
	}
	else {
		externUrl += ('&' + hash);
	}

	externUrl = externUrl.replace(/^http:\/\//i, '');

	injectHtml = injectHtml.replace(/\$EXT_URL/g, externUrl);
};


exports.request = function(req) {
	var url = req.headers['host'] + req.url;
	if (url != externUrl) {
		return;
	}

	var sec = 365 * 24 * 3600,
		exp = new Date(Date.now() + sec).toGMTString(),
		now = new Date().toGMTString(),
		hdr = {
			'Content-Type'	: 'text/javascript; charset=utf-8',
			'Content-Length': externCode.length,
			'Cache-Control'	: 'max-age=' + sec,
			'Expires'		: exp,
			'Date'			: now,
			'Last-Modified'	: now
		};

	return {
		status: 200,
		header: hdr,
		data: externCode
	};
};


exports.init = function() {
	htmlcodec.addListener(htmlInjectHandler);
	return true;
};
