# crawl neko
这是一个实际上是为了自用而诞生的轻量级爬虫框架，其理念在于：  
帮你完成繁杂的规划，剩下的事情自己来做

首次尝试写这种东西，肯定十分 naive

## 适用情况
1. 爬取较为少量的重点内容
2. 需要高定制度的爬取
3. 需要按层级爬取，并且在同一层级中需要做的事情基本相同  
   例如一个小说站，你需要依次爬取 分类列表->小说列表->章节列表->正文


## 安装
```bash
npm i crawl-neko
```

## 工作流程
### 事件及函数队列
![事件及函数队列](https://i.loli.net/2018/08/08/5b6a8b4d87a17.png)

一共具有以下四个事件
- request
	- 对“爬取目标”进行网络请求
	- 函数得到的第一个参数为爬取目标
	- 如果你向该爬虫添加了多个爬取目标，则爬虫会触发多次`request`事件，每次只使用一个爬取目标作为首参数
	- 如果不向该事件添加函数，则默认使用`axios`的`get`方法进行请求；如果得到的内容是 JSON，则会被`axios`自动转换为对象；如果得到的内容是字符串，则交由`cheerio`解析并返回一个`cheerio`实例
	- 如果向该事件添加函数，即相当于自定义你的请求方法，则必须返回自行进行网络请求后得到的内容
- data
	- 对`request`事件执行完毕后得到的结果进行处理，提取重点内容
	- 函数得到的第一个参数为`request`事件的函数队列的最终返回值，第二个参数为`request`的目标URL
	- 如果你使用`next()`为当前爬虫指定了后继爬虫，则该`data`函数队列的最终返回值会作为后继爬虫的爬取目标
- final
	- 对`data`事件执行完毕得到的结果进行收尾处理，你可以在这里自由发挥
	- 如果`data`事件的函数队列最终返回了一个数组，则每次依次取其中一个元素作为`final`事件的参数来执行（与`request`那块同理）
	- 该函数队列最终可以不返回值
	- 该函数队列可以最终返回一个具有固定结构的对象（或对象的数组）来作为该框架封装了的部分爬虫工具的参数（详见[工具](#工具)）
- error
	- 特殊的事件，只有在出现异常错误时才会触发
	- 函数的第一个参数为被抛出的`Error`对象
	- 该函数队列不需要最终返回一个值


### 工具
在`final`事件函数队列中，如最终返回具有固定结构的对象则可以使用以下功能

#### download
使用`axios`下载文件，例如以下返回对象示例会指使工具下载该 URL 的图片文件至项目目录下的`dltest/test`
```javascript
{
	type: "download",
	dir: "dltest",
	file: "test.png",
	url: "https://i.pximg.net/img-original/img/2015/05/25/12/40/22/50554350_p0.png",
	option: {
		headers: {
			referer: "https://www.pixiv.net/"
		}
	},
	callback: (opt) => {
		console.log("Download " + opt.url + " to " + opt.dir + " success!");
	}
}
```
- `type`: 固定为`download`
- `dir`: 欲下载到的目录路径，可以为绝对或相对
- `file`: 欲下载文件的保存名
- `url`: 下载网址
- `option`: axios 参数，请参照[此处](https://github.com/axios/axios#request-config)
- `callback`: 下载完成后的回调函数，第一个参数即为该对象


## 使用
### on(eve, func)
向事件添加函数到函数队列中，事件`eve`可取以下字符串
- request
- data
- final
- error

函数`func`可以是普通函数或是一个`Promise`，参数在[事件及函数队列](#事件及函数队列)中有说明

### setCheerioParameter(parameter)
当未设定`request`事件的响应函数时，默认会使用`axios`进行请求，并且如果取得的内容为 HTML，则会自动使用`cheerio`进行解析

此函数用于设置`cheerio`的解析参数，当不设置时，默认参数为
```javascript
this.cheerioParameter = {
	decodeEntities: false
}
```

### next(crawl, inheritRequest = false)
设置该爬虫的后继爬虫

第一个参数为后继爬虫的对象，第二个参数为后继爬虫是否继承该爬虫的`request`事件

该继承包括`request`事件函数队列以及`cheerio`参数

### async start(requestTargets)
开始爬行

`requestTargets`为爬取目标(URL)，可以是`string`或者`Array<string>`  
当然，如果你自定义了`request`事件的函数，则不必再限定为`string`，但若要传递多个目标仍需要使用`Array`

### static isCrawlNeko(obj)
判断对象是不是 CrawlNeko 的 friends

### static getTools()
取得工具集，以便于进行定制度更高的开发，其可用函数详见`src/tools.js`

## 一个例子
在`test/index.js`，你可以克隆源码后执行`npm test`来运行查看效果

```javascript
const CrawlNeko = require('crawl-neko');
const Path = require('path');

let catalog = new CrawlNeko();
let detail = new CrawlNeko();


// Get the detail link of nhentai comics (3 only for test)
catalog.on('data', $ => {
	let hrefs = [];
	let $cover = $('.cover');
	for (let i = 0; i < $cover.length; i++) {
		hrefs.push('https://nhentai.net' + $($cover[i]).attr('href'));
	}
	return hrefs.slice(0, 3);
});

// And out put them
catalog.on('final', href => {
	console.log(href);
});


// Get the detail infomation from a link
detail.on('data', ($, url) => {
	return {
		gid: (/[0-9]+/.exec(url))[0],
		tittle1: $('#info h1').html(),
		tittle2: $('#info h2').html(),
		pages: $('#thumbnail-container .thumb-container').length,
		iid: parseInt((/\/([0-9]+)\//g.exec($($('#thumbnail-container .thumb-container img')[0]).attr('data-src')))[0].replace(/\//g, ''))
	};
});

// And output and download them (CAUTION: Adult content)
detail.on('final', result => {
	console.log("\ngid: " + result.gid + "\n" + result.tittle1 + "\n" + result.tittle2 + "\nPages: " + result.pages + "\niid: " + result.iid);

	let downloads = [];

	for (let i = 1; i <= result.pages; i++) {
		downloads.push({
			type: 'download',
			dir: 'dltest' + Path.sep + result.gid,
			file: i + ".jpg",
			url: 'https://i.nhentai.net/galleries/' + result.iid + '/' + i + '.jpg',
			callback: (opt) => {
				console.log("Download " + opt.url + " success!");
			}
		});
	}

	return downloads;
});


// Set 'detail' as the next crawl of 'catalog'
catalog.next(detail);

catalog.start('https://nhentai.net/language/chinese/');
```

## TODO
 - [ ] 增加对数据库操作的封装
 - [-] 增加对文件下载操作的封装
