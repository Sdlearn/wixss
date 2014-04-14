/**
 * long cache sniffer
 *   author: EtherDream
 *   update: 2014/3/20
 */
'use strict';

var UA = [
	// PC
	'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/33.0.1750.154 Safari/537.36'
	,
	// Mobile
	'Mozilla/5.0 (iPhone; CPU iPhone OS 6_0 like Mac OS X) AppleWebKit/536.26 (KHTML, like Gecko) Version/6.0 Mobile/10A5376e Safari/8536.25'
];


var MIN_STABLE_DAY = 2,
	MIN_CACHE_DAY = 3,
	MAX_ITEM = 10,

	MAX_THREAD = 5,
	RES_TIMEOUT = 1000 * 5,
	PAGE_TIMEOUT = 1000 * 30,
	PATH_LIST = 'url.txt',
	PATH_SAVE = '../asset/poisoning/list.json',

	system = require('system'),
	webpage = require('webpage'),
	fs = require('fs'),

	site_res = {},
	used = {},
	totalNum = 0,
	MIME = {
		'text/html': 1,
		'application/x-javascript': 1,
		'text/javascript': 1
	};




function loadList(path) {
	var text;
	try {
		text = fs.read(path).toString();
	} catch(e) {
		console.error('fail read ' + path);
		return;
	}

	var list = [];
	text.split('\n').forEach(function(line) {

		line = line.trim();
		if (!line || line.substr(0, 1) == '#') {
			return;
		}
		if (/^https:\/\//i.test(line)) {
			console.warn('https is not support:', line);
			return;
		}
		list.push(line);
	});
	return list;
}


function saveList(path) {
	//
	// 按站点广度优先合并列表
	//
	var loop, merge = {};

	do {
		loop = false;

		for(var k in site_res) {
			var arr = site_res[k];
			var res = arr.pop();
			if (res) {
				var url = res.url.split('//')[1];
				merge[url] = {
					etag: res.etag
				};
				loop = true;
			}
		}
	} while(loop);

	try {
		fs.write(path, JSON.stringify(merge, null, 4) );
	}
	catch(e) {
		console.error('fail write ' + path);
	}
}



function ms2day(tick) {
	return Math.round(tick / (24 * 3600 * 1000));
}


function go_page(result, url, ua, cb) {
	var page = webpage.create();

	page.settings.userAgent = ua;
	page.settings.resourceTimeout = RES_TIMEOUT;

	page.onError = function() {};

	page.onResourceReceived = function(response) {
		if (response.url in used)
			return;
		used[response.url] = true;


		var last, now, exp;
		var etag = '';

		var ret = response.headers.every(function(header) {

			switch(header.name.toLowerCase()) {
			case 'date':
				now = +new Date(header.value);
				break;
			case 'expires':
				exp = +new Date(header.value);
				break;
			case 'last-modified':
				last = +new Date(header.value);
				break;
			case 'content-type':
				if ( !(header.value.toLowerCase() in MIME) )
					return false;
				break;
			case 'etag':
				etag = header.value;
				break;
			}
			return true;
		});

		if (!ret) return;
		if (!exp || !last) return;
		if (!now) now = Date.now();

		var dayStable = ms2day(now - last);
		var dayCached = ms2day(exp - now);

		//
		// 放弃缓存时间短或者经常修改的资源
		//
		if (dayStable < MIN_STABLE_DAY || dayCached < MIN_CACHE_DAY) {
			return;
		}

		result.push({
			url: response.url,
			cache: dayCached,
			stable: dayStable,
			etag: etag
		});
	};

	page.open(url, function() {
		clearTimeout(tid);
		done();
	});

	var tid = setTimeout(done, PAGE_TIMEOUT);

	function done() {
		cb();
		page.close();
	}
}


function go_site(url, cb) {

	var result = site_res[url] || (site_res[url] = []);
	var n = 0;

	function onPageDone() {
		//
		// 按稳定程度排序，取最前的MAX_ITEM条记录
		//
		result.sort(function(a, b){return b.stable - a.stable});

		if (result.length > MAX_ITEM) {
			result.length = MAX_ITEM;
		}

		console.log('==', url, '====================');

		if (result.length == 0) {
			console.log('   no result');
		}
		else {
			totalNum += result.length;
			result.forEach(function(res) {
				console.log('   -' + res.stable + '\t/ +' + res.cache + '\t\t' + res.url);
			});
		}

		console.log('');

		// site done callback
		cb();
	}

	UA.forEach(function(ua) {
		go_page(result, url, ua, function() {
			if (++n == UA.length)
				onPageDone();
		});
	});
}


function usage() {
	console.log(
		'sniffer [options]\n' +
		'    -u, --url\n' +
		'    -i, --input\n' +
		'    -o, --output\n'
	);
}


function exit() {
	phantom.exit(0);
}


function main() {
	var input, output;
	var url;

	var args = system.args;
	for (var i = 1; i < args.length; i++) {

		switch(args[i]) {
		case '-i':
		case '--input':
			input = args[i + 1];
			break;

		case '-o':
		case '--output':
			output = args[i + 1];
			break;

		case '-u':
		case '--url':
			var url = args[i + 1];
			if (!url) {
				console.error('invaild url');
				exit();
			}
			break;

		case '-h':
		case '--help':
			usage();
			exit();
		}
	}

	// make url list
	var list = [];
	if (url) {
		list.push(url);
	}
	else if(input) {
		list = loadList(input);
		if (!list) {
			exit();
		}
	}
	else {
		usage();
		exit();
	}

	// launch
	var time = Date.now();

	for (var i = 0; i < MAX_THREAD; i++) {
		setTimeout(next, i * 2000);
	}

	function next() {
		var site = list.shift();
		if (!site) {
			if (output) {
				saveList(output);
			}
			var sec = Math.round( (Date.now() - time) / 1000 );
			console.log('DONE! Found ' + totalNum + ' results in ' + sec + ' sec');
			exit();
		}

		go_site(site, next);
	}
}

main();
