const fs = require('fs-extra')
const path = require('path')

function copy(dir) {
	fs.copySync(path.join(__dirname, '..', 'template'), dir)
}

module.exports = {
	copy
}