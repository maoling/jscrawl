//页面加载完毕再执行
$(function(){
	var settings = {
	maxCommentPage:50,
	sleepTime:2000,
	//如果获取不到元素，尝试的次数
	tryCount:2,
	//用于判断是否是所要抓取的域名
	crawlDomain:["taobao","tmall"],
	loginDomain:"login.taobao.com"
}
	function tryAgain(f){
		for(var i=0;i<settings.tryCount;i++){
			//setTimeout(f,settings.sleepTime);
			sleepFor(settings.sleepTime);
			if((f()!=null && !(f() instanceof Array)) || (f() instanceof Array && f().length!=0)){
				break;
			}
		}
	}

	//获取当前要抓取的网址
	var crawlUrl = window.location.href;
	var isCrawlDomain = false;
	for(var i=0;i<settings.crawlDomain.length;i++){
		if(crawlUrl.indexOf(settings.crawlDomain[i])!=-1){
			isCrawlDomain = true;
			break;
		}
	}

	if(!isCrawlDomain){
		return;
	}
	//判断是否需要重新登录
	if(crawlUrl.indexOf(settings.loginDomain)!=-1){
		document.getElementById("TPL_username_1").value = "13716183704";
		document.getElementById("TPL_password_1").value = "cdf12020cdf12020";
		document.getElementById("J_SubmitStatic").click();
	}

	/*document.body.scrollTop = document.body.scrollHeight/2;
	document.body.scrollTop = document.body.scrollHeight/2;*/
	//保证页面所有ajax内容加载完毕
	while(document.querySelector(".footer")==null){
		//do nothing
	}
	var footerDom = document.querySelector(".footer");
	footerDom.scrollIntoView();
	footerDom.scrollIntoView();
	footerDom.scrollIntoView();

	//检查当前链接是否正常抓取，如果没有，则保存到服务器
	var isException = false;

	//根据url地址解析内容或根据模式匹配解析内容
	if((crawlUrl.indexOf("s.taobao.com/search")!=-1 && crawlUrl.indexOf("search_type")!=-1)
		|| (crawlUrl.indexOf("s.taobao.com/list")!=-1 && crawlUrl.indexOf("app=vproduct")!=-1)
	){
		//搜索页
		var allUrl = document.querySelectorAll("div.title-row > a");
		//获取不到可能是网页没有加载出来，sleep一下
		if(allUrl.length==0){
			var f = function(){
				return document.querySelectorAll("div.title-row > a");
			}
			tryAgain(f);
		}
		allUrl = document.querySelectorAll("div.title-row > a");
		var urlList = [];
		for(var i=0;i<allUrl.length;i++){
			urlList.push(allUrl[i].href);
		}
		//scrollIntoView以便于截图
		if(allUrl.length!=0){
			allUrl[0].scrollIntoView();
		}
		if(urlList.length!=0){
			chrome.extension.sendMessage({messageType:"post_url","post_urlList":urlList});
		}
		else{
			isException = true;
			chrome.extension.sendMessage({messageType:"errorUrl","errorUrl":crawlUrl});
		}
	}else if((crawlUrl.indexOf("s.taobao.com/search")!=-1 && crawlUrl.indexOf("spu_title")!=-1)
	||(crawlUrl.indexOf("s.taobao.com/list")!=-1 && crawlUrl.indexOf("app=detailproduct")!=-1)
	){
		//搜索结果页
		var allUrl = document.querySelectorAll("div.col.col-2 > p > a");
		//获取不到可能是网页没有加载出来，sleep一下
		if(allUrl.length==0){
			var f = function(){
				return document.querySelectorAll("div.col.col-2 > p > a");
			}
			tryAgain(f);
		}
		allUrl = document.querySelectorAll("div.col.col-2 > p > a");
		var urlList = [];
		for(var i=0;i<allUrl.length;i++){
			urlList.push(allUrl[i].href);
		}
		//scrollIntoView以便于截图
		if(allUrl.length!=0){
			allUrl[0].scrollIntoView();
		}
		if(urlList.length!=0){
			chrome.extension.sendMessage({messageType:"post_url","post_urlList":urlList});
		}
		else{
			isException = true;
			chrome.extension.sendMessage({messageType:"errorUrl","errorUrl":crawlUrl});
		}
	}else if((crawlUrl.indexOf("detail.tmall.com/item.htm")!=-1)
			|| (crawlUrl.indexOf("taobao.com/item")!=-1)
	){
		//详情页（包含评论）
		//获取不到可能是网页没有加载出来，sleep一下
		if(document.querySelector("#J_Title > h3")==null){
			var f = function(){
				return document.querySelector("#J_Title > h3");
			}
			tryAgain(f);
		}
		//获取产品名称
		var productName = null;
		if(document.querySelector("#J_Title > h3")!=null){
			productName = document.querySelector("#J_Title > h3").innerText;
		}
		//获取评论(最多抓取50页)
		var comment_click = document.evaluate("//a[contains(text(),'累计评论')]",document,null,XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,null).snapshotItem(0);
		if(comment_click!=null){
			comment_click.click();
		}
		//ajax分页
		var pageCount = 0;
		var commentCount = 1;
		var sumCommentCount = parseInt(comment_click.querySelector("em").innerText);
		if(sumCommentCount!=0){
			var f = function(){
				//获取第一页的所有评论数
				var tmpCommentPath = document.evaluate("//span[contains(text(),'有用')]/../../../../div[1]/text()",document,null,XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,null);
				var length = tmpCommentPath.snapshotLength;
				var postData = [];
				for(var i=0;i<length;i++){
					postData.push(tmpCommentPath.snapshotItem(i).textContent);
				}
				if(postData.length==0){
					isException = true;
					chrome.extension.sendMessage({messageType:"errorUrl","errorUrl":crawlUrl});
				}else{
					//提交评论数据
					chrome.extension.sendMessage({messageType:"post_detail_data","post_detail_data":postData});
				}
			}

			//定时检测页面内容是否加载完毕，如果加载完毕则发送自定义事件pageLoad
			var f1 = function () {
				if(document.evaluate("//span[contains(text(),'有用')]",document,null,XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,null).snapshotItem(0)!=null){
					clearInterval(m);
					var event = document.createEvent('HTMLEvents');
					event.initEvent('pageLoad', true, false);
					event.eventType = 'comment';
					document.dispatchEvent(event);
				}
			};
			var m = setInterval(f1, 1000);

			document.addEventListener('pageLoad', function (event) {
				if(event.eventType=="comment"){
					f();
					//下一页
					var nextPage = document.evaluate("//li[contains(text(),'下一页')]",document,null,XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,null).snapshotItem(0);
					if(nextPage==null || nextPage.className.indexOf("disabled")!=-1){
						//所有页数已经抓取完毕
						chrome.extension.sendMessage({messageType:"closeTab"});
						return;
					}else{
						nextPage.click();
						m = setInterval(f1, 1000);
					}
				}
			}, false);
		}
	}

	/*if(isException){
		chrome.extension.sendMessage({messageType:"errorUrl","errorUrl":crawlUrl});
	}*/
	function sleepFor(sleepDuration){
	    var now = new Date().getTime();
	    while(new Date().getTime() < now + sleepDuration){ /* do nothing */ } 
	}

});

function getImageSrc(){
	return document.getElementById("imgFixForLong").src;
}












