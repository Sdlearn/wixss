 'use strict';

var program = require('commander'),
	os = require('os'),
	fs = require('fs'),
	dns = require('./dns.js'),
	proxy = require('./proxy.js'),
	util = require('./util'),
	sslclear = require('./sslclear'),
	config = require('./config.json');



var extra_svc = [
	require('./site'),
	require('./injector'),
	require('./poisoning')
];


function main(argv) {

	program
		.version('1.0.1')
		.usage('[options]')
		.option('-p, --portal', 'portal mode (popup a page when wifi connented)')
		.option('-s, --ssl', 'https MITM proxy')
		.option('-d, --debug', 'enable debug (no obfuscate)')
		.option('-u, --dump', 'dump http headers')
		.option('-q, --quiet', 'no message output')
		.parse(argv);



	if (program.debug) {
		util.warn('[SYS]', 'DEBUG MODE'.bold, 'enabled');
	}
    if (program.portal) {
    	util.warn('[SYS]', 'PORTAL MODE'.bold, 'enabled');

    	extra_svc.unshift( require('./portal') );
    }
	if (program.ssl) {
		util.warn('[SYS]', 'SSL-MITM'.bold, 'enabled');
		sslclear.init();
	}

	dns.start();
	dns.setMyPubIp('4.4.4.4');

	var ok = extra_svc.every(function(svc) {
		return svc.init();
	});

	if (!ok) {
		return;
	}
	proxy.setExtraSvc(extra_svc);
	proxy.start();
}


main(process.argv);
