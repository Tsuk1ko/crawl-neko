/*
 * @Author: Jindai Kirin 
 * @Date: 2018-08-10 11:35:22 
 * @Last Modified by: Jindai Kirin
 * @Last Modified time: 2018-08-10 17:24:40
 */

const Axios = require('axios');
const Fs = require('fs');
const Path = require('path');

/**
 * Download file via axios, will make directories automatically
 *
 * @param {string} dirpath Directory path
 * @param {string} filename Filename
 * @param {string} url URL
 * @param {*} axiosOption Option for axios
 * @returns Axios promise
 */
async function download(dirpath, filename, url, axiosOption) {
	if(!Fs.existsSync(dirpath)) mkdirsSync(dirpath);
	let response;
	axiosOption.responseType = 'stream';
	await Axios.get(url, axiosOption).then(res => {
		response = res;
	});
	return new Promise((reslove, reject) => {
		response.data.pipe(Fs.createWriteStream(Path.join(dirpath, filename)));
		response.data.on('end', () => {
			reslove();
		});
		response.data.on('error', e => {
			reject(e);
		});
	})
}


/**
 * Recursively create directories
 *
 * @param {string} dirpath Directory path
 */
function mkdirsSync(dirpath) {
	let parentDir = Path.dirname(dirpath);
	//如果目标文件夹不存在但是上级文件夹存在
	if (!Fs.existsSync(dirpath) && Fs.existsSync(parentDir)) {
		Fs.mkdirSync(dirpath);
	} else {
		mkdirsSync(parentDir);
		Fs.mkdirSync(dirpath);
	}
}


module.exports = {
	download,
	mkdirsSync
}
