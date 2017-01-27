const program = require('commander')
const _ = require('lodash')

const path = require('path')

const Generator = require('./commands/build')
const { run } = require('./commands/server')
const { copy } = require('./commands/init')

program
	.version('0.0.1')

program
	.command('build [dir]')
	.action((dir, options) => {
		let generator = new Generator(fullPath(dir))
		generator.generate()
	})

program
	.command('server [dir]')
	.action((dir, options) => {
		run(fullPath(dir))
	})

program
	.command('init [dir]')
	.action((dir, options) => {
		copy(fullPath(dir))
	})

// Parse and fallback to help if no args
if(_.isEmpty(program.parse(process.argv).args) && process.argv.length === 2) {
    program.help();
}

function fullPath(dir) {
	return dir && path.resolve(process.cwd(), dir) || process.cwd()
}


