/**
 *@description: 扩展类插件
 *@author: Xianxu
 *@date: 2024-02-02
 *@version: 3.0
 *@Copyright: Xianxu
 *@LastEditors: Xianxu
 *@LastEditTime: 2024-02-02
 */
import {
	EVENT_TYPE
} from '../../tools/types.js'

import {
	uuid
} from '../../tools/tools.js'


let scripts = uni.getStorageSync('scripts') || []


function getMatedata(text) {

	const reg = new RegExp('// ==UserScript==');
	const reg2 = new RegExp('// ==/UserScript==');
	let a = text.split(reg)[1];
	let b = a.split(reg2)[0];

	if (!a || !b) {
		return {}
	}
	let matedata = {
		name: '', //脚本名称
		icon: '', //脚本icon
		include: '', //匹配的网址
		description: '',
		require: [],
		run: '',
		author: '',
		version: '',
		namespace: '',
		grant: [],
		match: [], //正则匹配的网址
		downloadURL: '',
		homepageURL: '',
		resource: []
	}
	let arr = b.split('\n')

	const getD = (arr, name) => {
		const reg = new RegExp(`(@${name})\\s`)
		let nameArr = arr.split(reg)
		// console.log(reg)
		nameArr.forEach((i, index) => {
			if (!i) {
				nameArr.splice(index, 1)
			}

		})
		if (nameArr.length > 1) {
			return nameArr[2].replace(/(^\s*)|(\s*$)/g, '');
		}
		return null
	}

	// 分离matedata数据块
	for (let i = 0; i < arr.length; i++) {
		if (arr[i]) {
			try {
				Object.keys(matedata).forEach(key => {
					let name = getD(arr[i], key);

					if (name && key == 'resource') {
						matedata['resource'].push(name.split(/\s/))
					}
					if (name && key != 'resource') {
						if (Object.prototype.toString.call(matedata[key]) === '[object Array]') {
							matedata[key].push(name)
						}
						if (Object.prototype.toString.call(matedata[key]) === '[object String]') {
							matedata[key] = name
						}
					}

				})
			} catch (e) {
				//TODO handle the exception
				console.warn(e)
			}

		}
	}

	return matedata;
}

function wrapper(file, url) {
	console.log(file)
	const matedata = file.matedata;
	let code = ''
	if (!matedata) {
		let matchs = file.match.split('@@');
		code = `!(function(){
			let code = \`${file.codeText}\`;
			let matchs = ${JSON.stringify(matchs)};
			
			matchs.map(m => {
				let reg = new RegExp(m.replace('*','.*'), 'i');
				return reg;
			}).forEach(match => {
				
				if (match.test(window.location.href||'${url}')) {
					let inject = new Function(code);
					inject();
				}
			});
		})()`;
	} else {
		code =`!(function() {
			let matedata = ${JSON.stringify(matedata)};
			if(!matedata.match){
				matedata.match = [];
			}
			let code = \`${file.codeText}\`;
			let namespace = function() {
				matedata.match.push(matedata.include);
				matedata.match.forEach(function(str) {
					let reg = new RegExp(str.replace('*','.*'), 'i');
					if (matedata.name && window[matedata.name]) {return;}
					if (reg.test(window.location.href|| '${url}')) {
						let injectCode = new Function(code);
						injectCode();
						matedata.name && (window[matedata.name] = true);
					}
				});
				
			};
			
			window[matedata.namespace] = new namespace();
		})()`
		console.log(code)
	}
	return code;
}


/**
 * 注入代码
 * @param {Object} code 注入的代码字符串
 */
const injectCodeText = function(codeText, matchs, url) {
	let code = `!(function(){
		let code = \`${codeText}\`
		let matchs = ${JSON.stringify(matchs)}
		
		matchs.map(m => {
			let reg = new RegExp(m.replace('*','.*'), 'i')
			return reg;
		}).forEach(match => {
			
			if (match.test(window.Location.href||'${url}')) {
				let inject = new Function(code)
				inject()
			}
		})
	})()`;


	return code;
}

const injectFiles = async (filePath, matchs, url) => {

	let len = 0
	let arr = []
	const pathRecursion = (file) => {
		return new Promise((resolve, reject) => {
			plus.io.resolveLocalFileSystemURL(file.path, function(entry) {
				// 可通过entry对象操作test.html文件 
				let obj = {
					codeText: '',
					filename: '',
					size: 0,
					matedata: {}
				}

				entry.file(function(file) {
					try {
						obj.filename = file.name;
						obj.size = file.size;
						var fileReader = new plus.io.FileReader();

						fileReader.readAsText(file, 'utf-8');
						fileReader.onloadend = function(evt) {
							let result = evt.target.result;
							obj.codeText = result;
							let matedata = getMatedata(result)

							obj.matedata = matedata;

							arr.push(obj);
							len++;
							resolve(arr)
							if (filePath[len]) {
								pathRecursion(filePath[len])
							}
						}
					} catch (e) {
						//TODO handle the exception
						console.log(e)
					}

				});


			}, function(e) {
				console.log("Resolve file URL failed: " + e.message);
			});
		})


	}
	const list = await pathRecursion(filePath[len]).catch(err => {
		console.log(err)
	})



	return list;
}

class ScriptExtension {
	constructor(wv) {
		this.wv = wv
		wv.state.setData({
			scripts,
		})
		this.wv.state.getData('activeWebview', (activeWebview) => {
			if (!activeWebview) return;
			activeWebview.addEventListener()
		})

		this.wv.on(EVENT_TYPE['CREATE-WEBVIEW'], (wv) => {
			wv.appendJsFile('_www/static/sdk/api.js');
		})

		const appendJS = (item, wvitem) => {
			let matchs = item.match.split('@@');
			let code = injectCodeText(item.codeText, matchs, wvitem.getURL())
			injectFiles(item.scriptPath, matchs, wvitem.getURL()).then(jsfile => {
				
				jsfile.forEach(matedata => {
					const code = wrapper(matedata, wvitem.getURL())
					
					wvitem.evalJS(code);
				})
			})

			wvitem.evalJS(code);
		}

		this.wv.on(EVENT_TYPE['rendering'], wvitem => {
			let $script = wv.state.data.scripts;
			$script.forEach(item => {
				if ((item.execution === this.execution.loading) && item.enable) {
					appendJS(item, wvitem)
				}
			})
		})
		this.wv.on(EVENT_TYPE['loading'], wvitem => {
			let $script = wv.state.data.scripts;
			$script.forEach(item => {
				if ((item.execution === this.execution.early) && item.enable) {
					console.log('尽早')
					appendJS(item, wvitem)
				}
			})
		})
		let url = ''
		this.wv.on(EVENT_TYPE['loaded'], wvitem => {
			let $url = wvitem.getURL()
			if (url === $url) return;
			url = $url;
			let $script = wv.state.data.scripts;
			$script.forEach(item => {
				if ((item.execution === this.execution.loaded) && item.enable) {

					appendJS(item, wvitem)
				}
			})
		})

		this.wv.state.watch('scripts', (val) => {
			uni.setStorage({
				data: val,
				key: 'scripts'
			})
		})
	}

	/**
	 * 脚本加载时机
	 * @type {enum}
	 */
	execution = {
		early: 0, //尽量早
		loading: 1, //加载的时候
		loaded: 2, //加载完成
	}

	/**
	 * @typedef scriptObj
	 * @type {Object}
	 * @property {String} name 脚本名
	 * @property {String} match 脚本匹配地址
	 * @property {String} description 描述	
	 * @property {Boolean} enable 是否启用
	 * @property {Array} scriptPath 脚本地址
	 * @property {String} codeText 脚本信息
	 * @property {Number}  execution 执行时机
	 */
	/**
	 * @param {scriptObj} scriptObj
	 */
	add(scriptObj) {
		let $scripts = this.wv.state.data.scripts;
		$scripts.push(scriptObj);
		this.wv.state.data.scripts = $scripts;
	}

	get scripts() {
		return this.wv.state.data.scripts;
	}

	set scripts(val) {
		if (!val || typeof val !== 'object') return;
		if (!val.execution) {
			val.execution = this.execution.loaded
		}
		val.id = uuid()
		if (typeof val.match === 'undefined') {
			val.match = ''
		}
		if (typeof val.scriptPath === 'undefined') {
			val.scriptPath = []
		}

		this.add(val)
	}

	update(obj) {
		if (!obj.id || !obj || typeof obj !== 'object' && !obj.codeText) return;
		let $scripts = this.wv.state.data.scripts;
		$scripts.forEach(item => {
			if (item.id == obj.id) {
				item.codeText = obj.codeText;
				item.name = obj.name;
				item.description = obj.description;
				item.match = obj.match;
				item.execution = obj.execution;
				item.scriptPath = obj.scriptPath;
			}
		})

		this.wv.state.data.scripts = $scripts;
		return $scripts;
	}

	clear() {
		this.wv.state.data.scripts = []
		return []
	}

	del(id) {
		/**
		 * @type {Array}
		 */
		let $script = this.wv.state.data.scripts
		$script.forEach((item, index) => {
			if (item.id == id) {
				$script.splice(index, 1)
			}
		})
		this.wv.state.data.scripts = $script;
		return $script
	}

	async addScriptOnline(obj) {
		let res = await this.loadNetFile(obj.url)
	}

	loadNetFile(url) {
		return new Promise((resolve, reject) => {
			uni.request({
				url: url,
				responseType: 'text',
				success(res) {
					let data = res.data;
					resolve(data)
				},
				fail(err) {
					reject(err)
				}
			})
		})
	}
}

export default function install(wv) {

	wv.ScriptExtension = new ScriptExtension(wv)

}