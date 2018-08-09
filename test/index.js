/*
 * @Author: Jindai Kirin 
 * @Date: 2018-08-08 08:58:29 
 * @Last Modified by: Jindai Kirin
 * @Last Modified time: 2018-08-09 09:15:26
 */

const CrawlNeko = require('..');

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

let myArgu = {
	tip1: "This is a custom argument. If you do not fill in the argument, we will give an empty object '{}'."
};

catalog.start('https://nhentai.net/language/chinese/', myArgu).then(() => {
	console.log("\n" + JSON.stringify(myArgu));
});
