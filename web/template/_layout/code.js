function showTOC() {
	var body = document.getElementById('body')
	body.classList.toggle('hide-toc')

	localStorage.setItem("hideTOC", body.classList.contains('hide-toc'))
}

function toggleMode() {
	var body = document.getElementById('body')
	body.classList.toggle('night-mode')

	localStorage.setItem("nightMode", body.classList.contains('night-mode'))
}

function showFontSizeMenu() {
	document.getElementById("font-sizes").classList.toggle("show");
}

window.onclick = function(event) {
	if(!event.target.parentNode.matches('.font-btn')) {
		var dropdowns = document.getElementsByClassName("dropdown-content");
		var i;
		for (i = 0; i < dropdowns.length; i++) {
			var openDropdown = dropdowns[i];
			if (openDropdown.classList.contains('show')) {
				openDropdown.classList.remove('show');
			}
		}
	}
}

function changeFontSize(n) {
	var rootSize = window.getComputedStyle(document.body).getPropertyValue('font-size')
	rootSize = parseInt(rootSize)
	document.getElementById("main").style.fontSize = "" + rootSize * n + "px"
	
	localStorage.setItem('fontSize', n)
}

function submitSubscriber(e) {
	e.preventDefault()

	var form = document.forms["signup"]
	var name = form.firstName
	var email = form.email

	var xhttp = new XMLHttpRequest()
	xhttp.open("POST", "subscribe", true);
	xhttp.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
	xhttp.send('firstName='+name+'&email='+email);

	document.getElementById("cube").classList.add("done")
}

window.onload = function() {
	var hideTOC = localStorage.getItem('hideTOC')
	if(hideTOC == "true") {
		document.getElementById('body').classList.add('hide-toc')
	}

	var nightMode = localStorage.getItem('nightMode')
	if(nightMode == 'true') {
		document.getElementById('body').classList.add('night-mode')
	}

	var fontSize = localStorage.getItem('fontSize')
	if(fontSize) {
		changeFontSize(parseFloat(fontSize))
	}
}