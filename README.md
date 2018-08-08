# crawl neko
这是一个实际上是为了自用而诞生的轻量级爬虫框架，其理念在于：  
帮你完成繁杂的规划，剩下的事情自己来做

首次尝试写这种东西，肯定十分 naive

## 适用情况
1. 爬取较为少量的重点内容
2. 需要高定制度的爬取
3. 需要按层级爬取，并且在同一层级中需要做的事情基本相同  
   例如一个小说站，你需要依次爬取 分类列表->小说列表->章节列表->正文


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
	- 函数得到的第一个参数为`request`事件的函数队列的最终返回值
	- 如果你使用`next()`为当前爬虫指定了后继爬虫，则该`data`函数队列的最终返回值会作为后继爬虫的爬取目标
- final
	- 对`data`事件执行完毕得到的结果进行收尾处理，你可以在这里自由发挥
	- 如果`data`事件的函数队列最终返回了一个数组，则每次依次取其中一个元素作为`final`事件的参数来执行（与`request`那块同理）
	- 该函数队列不需要最终返回一个值
- error
	- 特殊的事件，只有在出现异常错误时才会触发
	- 函数的第一个参数为被抛出的`Error`对象
	- 该函数队列不需要最终返回一个值


### 参数的传递
![参数的传递](https://i.loli.net/2018/08/08/5b6a95b87a6ab.png)

首参数的传递在上面实际上已经讲过，此处仅仅是放个图示意一下

对于自定义参数，实质上就是创造一个在函数内部可以使用的“全局”变量空间

## 安装
```bash
npm i crawl-neko
```

## 使用
### on(eve, func)
向事件添加函数到函数队列中，事件`eve`可取以下字符串
- request
- data
- final
- error

函数`func`的第一个参数用于接收函数队列中上一函数的返回值；第二个参数为自定义参数，通常为一个对象，你可以向里面存放任意你想放的东西，并且这个自定义参数会被全程传递（相当于在函数内可使用的全局变量）

### addRequestTargets(targets)
向一个爬虫实例添加爬取目标(URL)，可以是`string`或者`Array<string>`

当然，如果你自定义了`request`事件的函数，则不必再限定为`string`，但若要传递多个目标仍需要使用`Array`

### setRequestTargets(targets)
基本作用同上，只不过相当于先清除原先添加的再去添加

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

### async start(customArgu = {})
开始爬行，参数为自定义参数

## 一个例子
在`test/index.js`，你可以直接执行`npm test`来运行查看效果

```javascript
const CrawlNeko = require('crawl-neko');

let catalog = new CrawlNeko();
let detail = new CrawlNeko();


// Get the detail link of nhentai comics (5 only for test)
catalog.on('data', ($, customArgu) => {
	customArgu.tip2 = "This argument will be passed to every event.";

	let hrefs = [];
	let $cover = $('.cover');
	for (let i = 0; i < $cover.length; i++) {
		hrefs.push('https://nhentai.net' + $($cover[i]).attr('href'));
	}
	return hrefs.slice(0, 5);
});
// And out put them
catalog.on('final', (href, customArgu) => {
	customArgu.tip3 = "EVERY!";

	console.log(href);
});


// Get the detail infomation from a link
detail.on('data', ($, customArgu) => {
	customArgu.tip4 = "Even the next crawler.";

	return {
		tittle1: $('#info h1').html(),
		tittle2: $('#info h2').html(),
		pages: $('#thumbnail-container .thumb-container').length,
		imgID: parseInt((/\/([0-9]+)\//g.exec($($('#thumbnail-container .thumb-container img')[0]).attr('data-src')))[0].replace(/\//g, ''))
	};
});
// And out put them
detail.on('final', (result, customArgu) => {
	customArgu.tip5 = "Done!";

	console.log("\n" + result.tittle1 + "\n" + result.tittle2 + "\nPages: " + result.pages + "\nImgID: " + result.imgID);
});


// Set 'detail' as the next crawl of 'catalog'
catalog.next(detail);

catalog.addRequestTargets('https://nhentai.net/language/chinese/');

let myArgu = {
	tip1: "This is a custom argument. If you do not fill in the argument, we will give an empty object '{}'."
}
catalog.start(myArgu).then(() => {
	console.log("\n" + JSON.stringify(myArgu));
});
```

## TODO
 - [ ] 增加对数据库操作的封装
 - [ ] 增加对文件下载操作的封装
