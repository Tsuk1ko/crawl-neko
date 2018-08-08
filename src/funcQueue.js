/*
 * @Author: Jindai Kirin 
 * @Date: 2018-08-07 11:02:25 
 * @Last Modified by: Jindai Kirin
 * @Last Modified time: 2018-08-08 08:40:59
 */

/**
 * 函数队列
 *
 * @class FuncQueue
 */
class FuncQueue {
	constructor() {
		this.funcs = [];
	}

	/**
	 * 添加函数
	 *
	 * @param {Function} func 欲加入函数队列的函数
	 * @memberof FuncQueue
	 */
	add(func) {
		if (typeof (func) != "function") throw new Error("This is not a function!");
		this.funcs = this.funcs.concat(func);
	}

	/**
	 * 队列是否为空
	 *
	 * @returns 是或否
	 * @memberof FuncQueue
	 */
	isEmpty() {
		return this.funcs.length === 0;
	}

	/**
	 * 执行函数队列
	 *
	 * @param {*} mainArgu 参数
	 * @param {*} subArgu 附加参数
	 * @returns
	 * @memberof FuncQueue
	 */
	async run(mainArgu, subArgu) {
		let argu = mainArgu;
		for (let func of this.funcs) {
			let ret = func(argu, subArgu);
			//如果是Promise则await
			if (Promise.prototype.isPrototypeOf(ret)) {
				await ret.then(result => {
					argu = result;
				})
			} else if (ret) argu = ret;
		}
		return argu;
	}
}

module.exports = FuncQueue;
