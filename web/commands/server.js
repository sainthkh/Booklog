const static = require('node-static');

const fs = require('fs')
const path = require('path')

function run(dir) {
	let dest = path.join(dir, '_book')
	if(fs.existsSync(dest)) {
		const file = new static.Server(dest);
		require('http').createServer(function (request, response) {
			request.addListener('end', function () {
				file.serve(request, response);
			}).resume();
		}).listen(8080);
		console.log('Server started at http://localhost:8080')
		console.log(`This command is for test only. Don't use it for your product.`)
	} else {
		console.log('Directory is not compiled. Compile it first by "booklog build"')
	}
}

module.exports = {
	run
}