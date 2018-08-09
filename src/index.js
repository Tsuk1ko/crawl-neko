/*
 * @Author: Jindai Kirin 
 * @Date: 2018-08-06 15:00:19 
 * @Last Modified by: Jindai Kirin
 * @Last Modified time: 2018-08-09 09:12:39
 */

const Cheerio = require('cheerio');
const Axios = require('axios');
const FuncQueue = require('./funcQueue');

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
	 * @param {*} [customArgu={}] Custom argument
	 * @memberof CrawlNeko
	 */
	async start(requestTargets, customArgu = {}) {
		if (!requestTargets) throw new Error("No targets can be handle");

		try {
			for (let argu of (Array.isArray(requestTargets) ? requestTargets : [requestTargets])) {
				//request事件，如没指定则默认使用axios
				if (this.eventQueue.request.isEmpty()) {
					await Axios.get(argu).then(response => {
						let data = response.data;
						//如果返回内容为html则使用cheerio
						argu = (typeof (data) == "string") ? Cheerio.load(data, this.cheerioParameter) : data;
					});
				} else {
					await this.eventQueue.request.run(argu, customArgu).then(ret => {
						argu = ret;
					});
				}

				//data事件
				await this.eventQueue.data.run(argu, customArgu).then(ret => {
					argu = ret;
					//下一步处理的参数
					this.nextArgu = ret;
				});

				//final事件
				if (!Array.isArray(argu)) argu = [argu];
				for (let a of argu) {
					await this.eventQueue.final.run(a, customArgu).catch(e => {
						console.error(e);
						this.eventQueue.error.run(e, customArgu);
					});
				}
			}
		} catch (error) {
			console.error(error);
			this.eventQueue.error.run(error, customArgu);
		}

		//移交至下一爬虫
		if (this.nextNeko) {
			await this.nextNeko.start(this.nextArgu, customArgu);
		}
	}
}

module.exports = CrawlNeko;
