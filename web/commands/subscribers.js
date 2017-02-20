const fs = require('fs-extra')
const path = require('path')

function subs(dir, file, listName) {
	const config = JSON.parse(fs.readFileSync(path.join(dir, "email.json")).toString())
	const mailgun = require('mailgun-js')({
		apiKey: config.apiKey,
		domain: config.domain, 
	})
	
	const subscribers = JSON.parse(fs.readFileSync(path.join(dir, file)).toString())
	const list = mailgun.lists(listName)

	subscribers.forEach(v => {
		list.members().create({
			subscribed: true,
			address: v.email,
			name: v.first_name,
		}, (err, data) => { console.log(data) })
	})
}

module.exports = {
	subs
}