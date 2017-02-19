const fs = require('fs-extra')
const path = require('path')
const yamlFront = require('yaml-front-matter')
const marked = require('marked')
marked.setOptions({
	breaks: true
})
var renderer = new marked.Renderer()
renderer.paragraph = text => {
	return `<p style="margin-bottom:15px;">${text}</p>`
}

function sendMail(dir, to, content) {
	const config = JSON.parse(fs.readFileSync(path.join(dir, "email.json")).toString())
	const mailgun = require('mailgun-js')({
		apiKey: config.apiKey,
		domain: config.domain, 
	})

	const mail = yamlFront.parse(fs.readFileSync(path.join(dir, "_email", content + ".md")).toString())
	mail.raw = mail.__content
	mail.content = buildEmail(mail.raw, config.fromEmail, config.postalAddress)

	var data = {
		from: config.from,
		to: to,
		subject: mail.subject,
		text: mail.raw,
		html: mail.content, 
		"h:reply-To": config.reply,
	}

	mailgun.messages().send(data, (error, body) => {
		if(error) {
			console.log(error)
			throw error
		}
	})
}

function buildEmail(content, from, address) {
	return [
		`<div style="color:#222222;font-family:'Helvetica','Arial',sans-serif;font-size:14px;line-height:1.4;padding:25px;width:550px">`,
		marked(content, {renderer: renderer}),
		`</div>`,
		`<div style="border-top-color:#ddd;border-top-style:solid;border-top-width:1px;color:#888;font-family:'Helvetica','Arial',sans-serif;font-size:12px;line-height:1.4;padding:25px;width:550px">`,
		`To make sure you keep getting these emails, please add ${from} to your address book or whitelist us.<br>`,
		`Want out of the this email list? <a href="%mailing_list_unsubscribe_url%">Click here.</a><br>`,
		`Postal Address: ${address}`,
		`</div>`
	].join(``)
}


module.exports = {
	sendMail
}