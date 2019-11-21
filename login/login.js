const processLogin = e => {
	e.preventDefault();
	const _user = document.getElementById('userLogin').value;
	const _pass = document.getElementById('passLogin').value;

	if (_user == "" || _pass == ""){
		alert("Error: One or more fields is blank. Please try again.");
		return;
	}

	fetch("http://3.15.197.74:3000/login", {
		method : "POST",
		headers: {
	      'Accept': 'application/json',
	      'Content-Type': 'application/json'
   		},
   		credentials: 'include',
		body: JSON.stringify({
			user: _user,
			pass: _pass
		})
	})
	.then(response => response.json())
	.then(response => {
		if(response.user == false){
			document.getElementById('userLogin').classList.add('wrongInput');
		} else if (response.user == true && response.pass == false){
			document.getElementById('passLogin').classList.add('wrongInput');
		} else if (response.user == true && response.pass == true){
			window.location.href = "../home/homepage.html";
		}
	});
}

const processSignUp = e => {
	e.preventDefault();
	const _name = document.getElementById('nameSignUp').value;
	const _user = document.getElementById('userSignUp').value;
	const _pass = document.getElementById('passSignUp').value;

	if (_name == "" || _user == "" || _pass == ""){
		alert("Error: One or more fields is blank. Please try again.");
		return;
	}

	fetch("http://3.15.197.74:3000/signup", {
		method : "POST",
		headers: {
	      'Accept': 'application/json',
	      'Content-Type': 'application/json'
   		},
   		credentials: 'include',
		body: JSON.stringify({
			name: _name,
			user: _user,
			pass: _pass
		})
	})
	.then(response => response.json())
	.then(response => {
		if (response.taken == true){
			document.getElementById('userSignUp').classList.add('wrongInput');
			document.getElementById('userSignUp').value = _user + " is taken. Please try again.";
		} else if (response.taken == false){
			window.location.href = "../home/homepage.html";
		}
	});
}