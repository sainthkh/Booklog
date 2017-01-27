const _ = require('lodash')
const yamlFront = require('yaml-front-matter')
const shortcode = require('shortcode-parser')
const marked = require('marked')
marked.setOptions({
	breaks: true,
})
const hbs = require('handlebars')
const sass = require('node-sass')

const fs = require('fs-extra')
const path = require('path')

class Generator {
	constructor(rootDir) {
		this.rootDir = rootDir
		this.posts = {}
	}

	generate() {
		console.log('compiling scss')
		this.compileSCSS()
		console.log('copying code.js')
		this.copyCode()
		console.log(`compiling contents`)
		this.loadShortcodes()
		this.build(this.rootDir)
		console.log('generating files')
		this.generateFiles(this.rootDir)
	}

	compileSCSS() {
		let result = sass.renderSync({
			file: path.join(this.rootDir, "_layout/style.scss"),
			outputStyle: 'compressed',
		})
		let cssPath = path.join(this.rootDir, "_book/style.css")
		fs.ensureFileSync(cssPath)
		fs.writeFileSync(cssPath, result.css)
	}

	copyCode() {
		var from = path.join(this.rootDir, "_layout/code.js")
		var to = path.join(this.rootDir, "_book/code.js")
		fs.copySync(from, to)
	}

	loadShortcodes() {
		let codePath = path.join(this.rootDir, '_layout', 'shortcodes.js')
		if(fs.existsSync(codePath)) {
			let codes = require(codePath)
			Object.keys(codes).forEach(name => {
				shortcode.add(name, codes[name])
			})
		}
	}

	build(dir) {
		fs.readdirSync(dir).forEach(name => {
			let fullPath = path.join(dir, name)
			let stat = fs.statSync(fullPath)
			if(stat.isDirectory()) {
				this.build(fullPath)
			} else {
				if(path.extname(name) == '.md') {
					let post = fs.readFileSync(fullPath)
					this.posts[fullPath] = this.compile(post)
				}
			}
		})
	}

	compile(post) {
		post = yamlFront.parse(post)
		post.content = marked(shortcode.parse(post.__content))
		return post
	}

	generateFiles(dir) {
		if(path.basename(dir)[0] == '_') return

		let toc = this.buildTOC(dir)
		this.setNextPost(toc)
		fs.readdirSync(dir).forEach(name => {
			let fullPath = path.join(dir, name)
			let stat = fs.statSync(fullPath)
			if(stat.isDirectory()) {
				this.generateFiles(fullPath)
			} else {
				if(path.extname(name) == '.md') {
					let post = this.posts[fullPath]
					let layout = fs.readFileSync(post.layout || 
						path.join(this.rootDir, '_layout/page.hbs'))
						.toString()
					let html = hbs.compile(layout)(Object.assign(post, {
						toc: this.tocHTML(toc, fullPath),
					}))
					let resultPath = this.resultPath(fullPath)
					fs.ensureFileSync(resultPath)
					fs.writeFileSync(resultPath, html)
				}
			}
		})
	}

	tocHTML(toc, fullPath) {
		let generator = (toc, level) => {
			let items = toc.map(entry => {
				return [
					`<li>`,
					`<a class="${fullPath == entry.file ? "current":"normal"}" href="${entry.path}">${entry.name}</a>`,
					!_.isEmpty(entry.sub) && generator(entry.sub, level + 1) || '',
					`</li>`
				].join('\n')
			}).join('\n')
			return [
				`<ul class="toc level-${level}">`,
				items,
				`</ul>`,
			].join('\n')
		}
		return generator(toc, 0)
	}

	resultPath(fullPath) {
		let fileName = path.basename(fullPath, '.md') + '.html'
		let relDir = path.relative(this.rootDir, path.dirname(fullPath))
		return path.join(this.rootDir, '_book', relDir, fileName)
	}

	buildTOC(dir) {
		let tocPath = this.findTOCPath(dir)
		let toc = JSON.parse(fs.readFileSync(tocPath).toString())

		let parser = toc => {
			return toc.map(entry => {
				let fullPath = path.join(dir, entry)
				let relPath = path.relative(this.rootDir, fullPath)
				entry = _.isObject(entry) ? entry : {
					file: entry,
					name: this.posts[fullPath].title,
					sub: []
				}

				return {
					file: fullPath,
					path: entry.path || `/${relPath.replace(/\.[^/.]+$/, "")}`,
					name: entry.name,
					sub: parser(entry.sub)
				}
			})
		}

		return parser(toc)
	}

	findTOCPath(dir) {
		while(true) {
			let tocPath = path.join(dir, 'toc.json')
			if(fs.existsSync(tocPath)) {
				return tocPath			
			}

			dir = path.join(dir, '..')
		}
	}

	setNextPost(toc) {
		toc.forEach((entry, i) => {
			if(_.isEmpty(entry.sub)) {
				if (i + 1 < toc.length) {
					this.posts[entry.file].next = toc[i+1]
				}
			} else {
				this.posts[entry.file].next = entry.sub[0]
				this.setNextPost(entry.sub)
			}
		})
	}
}

module.exports = Generator