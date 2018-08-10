/*
 * @Author: Jindai Kirin 
 * @Date: 2018-08-08 08:58:29 
 * @Last Modified by: Jindai Kirin
 * @Last Modified time: 2018-08-10 17:04:57
 */

const CrawlNeko = require('..');
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
