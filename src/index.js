/*
 * @Author: Jindai Kirin 
 * @Date: 2018-08-06 15:00:19 
 * @Last Modified by: Jindai Kirin
 * @Last Modified time: 2018-08-10 16:54:25
 */

const Cheerio = require('cheerio');
const Axios = require('axios');
const FuncQueue = require('./funcQueue');
const Tools = require('./tools');

/**
 * Crawl neko~
 *
 * @class CrawlNeko
 */
class CrawlNeko {
	constructor() {
		//事件队列
		this.eventQueue = {
			request: new FuncQueue(),
			data: new FuncQueue(),
			final: new FuncQueue(),
			error: new FuncQueue()
		};
		//下一爬虫
		this.nextNeko = null;
		//参数传递
		this.nextArgu = null;
		//cheerio参数
		this.cheerioParameter = {
			decodeEntities: false
		}
		//类型标识
		this.class = "CrawlNeko";
	}

	/**
	 * Type detection
	 *
	 * @static
	 * @returns True if this is a CrawlNeko
	 * @memberof CrawlNeko
	 */
	static isCrawlNeko(obj) {
		if (obj.class && obj.class == "CrawlNeko") return true;
		return false;
	}

	/**
	 * Set cheerio parameter
	 *
	 * @param {*} parameter Parameter for cheerio
	 * @memberof CrawlNeko
	 */
	setCheerioParameter(parameter) {
		this.cheerioParameter = parameter;
	}

	/**
	 * Add function to event queue
	 *
	 * @param {string} eve Event
	 * @param {Function} func Function
	 * @memberof CrawlNeko
	 */
	on(eve, func) {
		//检测事件名
		if (!this.eventQueue[eve]) throw new Error("No event named " + eve);
		//将函数加入事件队列
		this.eventQueue[eve].add(func);
	}

	/**
	 * Set next crawl
	 *
	 * @param {CrawlNeko} crawl The next crawl
	 * @param {boolean} [inheritRequest=false] Inherit the request menthods or not
	 * @memberof CrawlNeko
	 */
	next(crawl, inheritRequest = false) {
		//类型检测
		if (!CrawlNeko.isCrawlNeko(crawl)) throw new Error("Argument must be a CrawlNeko");
		this.nextNeko = crawl;
		//继承爬虫的请求参数与方法
		if (inheritRequest) {
			this.nextNeko.eventQueue.request = this.eventQueue.request;
			this.nextNeko.cheerioParameter = this.cheerioParameter;
		}
	}

	/**
	 * Start crawling
	 *
	 * @param {*} requestTargets Request targets
	 * @memberof CrawlNeko
	 */
	async start(requestTargets) {
		if (!requestTargets) throw new Error("No targets can be handle");

		try {
			for (let argu of (Array.isArray(requestTargets) ? requestTargets : [requestTargets])) {
				let url = argu;
				//request事件，如没指定则默认使用axios
				if (this.eventQueue.request.isEmpty()) {
					await Axios.get(argu).then(response => {
						let data = response.data;
						//如果返回内容为html则使用cheerio
						argu = (typeof (data) == "string") ? Cheerio.load(data, this.cheerioParameter) : data;
					});
				} else {
					await this.eventQueue.request.run(argu).then(ret => {
						argu = ret;
					});
				}

				//data事件
				await this.eventQueue.data.run(argu, url).then(ret => {
					argu = ret;
					//下一步处理的参数
					this.nextArgu = ret;
				});

				//final事件
				if (!Array.isArray(argu)) argu = [argu];
				for (let a of argu) {
					await this.eventQueue.final.run(a).then(async ret => {
						//附加功能
						if (ret) {
							for (let toolArgu of (Array.isArray(ret) ? ret : [ret])) {
								await runTools(toolArgu);
							}
						}
					});
				}
			}
		} catch (error) {
			console.error(error);
			this.eventQueue.error.run(error);
		}

		//移交至下一爬虫
		if (this.nextNeko) {
			await this.nextNeko.start(this.nextArgu);
		}
	}

	/**
	 * Get toolset
	 *
	 * @static
	 * @returns Tools
	 * @memberof CrawlNeko
	 */
	static getTools() {
		return Tools;
	}
}


/**
 * Perform additional functions
 *
 * @param {*} argu Argument
 */
async function runTools(argu) {
	function callback() {
		if (argu.callback && typeof (argu.callback) == "function")
			argu.callback(argu);
	}

	//参数检测
	if (argu && argu.type) {
		//下载
		if (argu.type == 'download') {
			//参数检测
			if (argu.dir && argu.file && argu.url) {
				await Tools.download(argu.dir, argu.file, argu.url, argu.option || {});
				callback();
			} else {
				throw new Error("Missing parameter");
			}
		} else {
			throw new Error("Type not defind");
		}
	}
}


module.exports = CrawlNeko;
