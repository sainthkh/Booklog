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
const qs = require('querystring')

class Generator {
	constructor(rootDir) {
		this.rootDir = rootDir
		this.posts = {}
	}

	generate() {
		this.loadSiteOption()
		this.loadPlugin()
		console.log('compiling scss')
		this.compileSCSS()
		console.log('copying code.js')
		this.copyCode()
		console.log(`compiling contents`)
		this.loadShortcodes()
		this.build(this.rootDir)
		console.log('generating files')
		this.generateFiles(this.rootDir)
		this.orderPosts()
		this.generateSitemap()
		this.generateRSS()
		this.plugin.end(this)
	}

	loadSiteOption() {
		let optionPath = path.join(this.rootDir, 'site.json')
		this.site = JSON.parse(fs.readFileSync(optionPath))
	}

	loadPlugin() {
		let pluginPath = path.join(this.rootDir, '_layout/plugin/index.js')
		this.plugin = Object.assign({
			end: () => {},
		}, fs.existsSync(pluginPath) ? require(pluginPath) : {})
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
					let layoutFileName = post.layout || 'page.hbs';
					let layout = fs.readFileSync(
						path.join(this.rootDir, '_layout', layoutFileName)
					).toString()
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
		let tocDir = path.dirname(tocPath)
		let toc = JSON.parse(fs.readFileSync(tocPath).toString())

		let parser = toc => {
			return toc.map(entry => {
				entry = _.isObject(entry) ? entry : {
					file: entry,
					sub: [],
				}
				let fullPath = path.join(
					entry.file[0] == '/' ? this.rootDir : tocDir, 
					entry.file)
				let relPath = path.relative(this.rootDir, fullPath)

				return {
					file: fullPath,
					path: entry.path || `/${removeExt(relPath).replace(/\\/g, '/')}`,
					name: entry.name || this.posts[fullPath].title,
					sub: entry.sub ? parser(entry.sub) : []
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

	orderPosts() {
		this.orderedPosts = _.orderBy(
			Object.keys(this.posts).map(k => {
				return Object.assign(this.posts[k], {
					file: k,
					baseUrl: qs.escape(removeExt(path.basename(this.posts[k].file))),
				})
			}),
			"date",
			"desc"
		)
	}

	generateSitemap() {
		fs.writeFileSync(path.join(this.rootDir, '_book/sitemap.xml'), [
			`<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,
			this.orderedPosts.map(post => {
				let { protocol, host } = this.site
				return [
					`<url>`,
					`<loc>${protocol}${host}/${post.baseUrl}</loc>`,
					`<lastmod>${new Date(post.date).toISOString().split('T')[0]}</lastmod>`,
					`<changefreq>monthly</changefreq>`,
					`<priority>0.2</priority>`,
					`</url>`,
				].join('\n')
			}).join('\n'),
			`</urlset>`
		].join('\n'))
	}

	generateRSS() {
		let { name, protocol, host } = this.site
		let now = new Date().toISOString().split('T')[0]
		let posts = this.orderedPosts.slice(0, 20)
		fs.writeFileSync(path.join(this.rootDir, '_book/rss.xml'), [
			`<rss xmlns:atom="http://www.w3.org/2005/Atom" version="2.0">`,
			`<channel>`,
			`<title>${name}</title>`,
			`<atom:link href="${protocol}${host}/rss" rel="self"></atom:link>`,
			`<language>en-us</language>`,
			`<lastBuildDate>${now}</lastBuildDate>`,
			posts.map(post => {
				let baseUrl = qs.escape(removeExt(path.basename(post.file)))
				let url = `${protocol}${host}/${post.baseUrl}`
				return [
					`<item>`,
					`<title>${post.title}</title>`,
					`<link>${url}</link>`,
					`<description>${post.content}</description>`,
					`<guid>${url}</guid>`,
        			`</item>`,
				].join('\n')
			}).join('\n'),
			`</channel>`,
		].join('\n'))
	}
}

function removeExt(name) {
	return name.replace(/\.[^/.]+$/, "")
}

module.exports = Generator