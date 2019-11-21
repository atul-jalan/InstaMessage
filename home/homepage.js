/******************************
ACCOUNT CHANGE FUNCTIONS
******************************/

const processLogout = async e => {
	e.preventDefault();
	await fetch("http://3.15.197.74:3000/logout", {
		method : "GET",
		credentials: 'include'
	})
	.catch(() => {
		window.location.href = "../login/login.html"
	})	
	window.location.href = "../login/login.html";
}
const processDeleteAccount = e => {
	e.preventDefault();
	document.location ="/deleteAccount"
}

/******************************
GLOBAL VARIABLES
******************************/

let myName = undefined;
let myUsername = undefined;
let chats = new Map();
let namesList = [];
const socket = io.connect('http://3.15.197.74:3000');

/******************************
WINDOW ONLOAD
******************************/

window.onload = async function(){

	await fetch("http://3.15.197.74:3000/status", {
		method : "GET",
		credentials: 'include'
	})
	.catch(() => {
		window.location.href = "../login/login.html"
	})

	cssStuff();

	let tempChats = [];

	await fetch("http://3.15.197.74:3000/getInfo", {
		method : "POST",
		credentials: 'include'
	})
	.then(response => response.json())
	.then( response => {
		myName = response.name;
		myUsername = response.user;
		tempChats = response.chats; //array of [username, [chats]] objects
		namesList = response.names;
	})
	.catch(() => {
		window.location.href = "../login/login.html"
	});

	for (let i = 0; i < namesList.length; i++){
		chats.set(tempChats[i][0], tempChats[i][1]);
		let chat = tempChats[i][1];
		if (chat.length > 0){
			drawContact(namesList[i][0], namesList[i][1], chat[chat.length-1][2], getShortenedMessage(chat[chat.length-1][0], chat[chat.length-1][1]));
		} else {
			drawContact(namesList[i][0], namesList[i][1], Date.now(), 'Send a message!');
		}
	}

	newSelectedContact('globalchat');
	scrollToBottom();

	socket.emit('username', myUsername);
}
const cssStuff = () => {
	pageWidth = document.getElementById('mainContent').clientWidth;
	contactsWidth = document.getElementById('contacts').clientWidth;
	chatsWidth = pageWidth - contactsWidth -1;
	document.getElementById('chat').style.width = chatsWidth + "px";

	const newChat = document.getElementById('createNewChat');
	const buttonHeight = document.getElementById('newChatButton').clientHeight;
	const divHeight = (document.getElementsByClassName('subHeader'))[0].clientHeight;
	const divWidth = (document.getElementsByClassName('subHeader'))[0].clientWidth;
	newChat.style.marginTop = (divHeight-buttonHeight)/2 + "px";
	newChat.style.marginLeft = divWidth + "px";
}

/******************************
CREATE NEW CHAT
******************************/

const processChatVisibility = e => {
	const newChat = document.getElementById('createNewChat');

	if (newChat.style.visibility != 'visible'){
		newChat.style.visibility = 'visible';
	} else {
		newChat.style.visibility = 'hidden';
	}
}
const processNewChat = async e => {
	e.preventDefault();

	enteredUser = document.getElementById('createNewChatInput').value;
	if (enteredUser == ''){
		alert('Error: Blank username');
	} else if (enteredUser == myUsername){
		alert("Error: You don't need us to talk to yourself.");
	} else if (chats.has(enteredUser)){
		newSelectedContact(enteredUser);
	} else {
		await fetch("http://3.15.197.74:3000/newChat", {
		method : "POST",
		headers: {
	      'Accept': 'application/json',
	      'Content-Type': 'application/json'
   		},
   		credentials: 'include',
		body: JSON.stringify({
			otherUser: enteredUser,
		})
		})
		.then(response => response.json())
		.then(async response => {
			if (response.success == false && response.exists == false){
				alert('Error: Entered username does not exist.')
			} else if (response.success == true){
				chats.set(enteredUser, []);
				namesList.push(enteredUser, response.name);
				await drawContact(enteredUser, response.name, Date.now(), "Send " + enteredUser + " a message!");
				newSelectedContact(enteredUser);
			}
		})
		.catch(() => {
			window.location.href = "../login/login.html"
		});
	}
	document.getElementById('createNewChatInput').value = '';
	document.getElementById('createNewChat').style.visibility = 'hidden';
}

/******************************
DRAW CONTACT
******************************/
const drawContact = (username, name, date, last) => {
	let button = "";
	button += "<button id='" + username + "' class='allForms singleContact' onclick='contactClick(event, this.id)'>";
		button += "<div id='initialsWrapper'>";
			button += "<h2 id='" + username + "initials' class='nFont initials'>" + createInitials(name) + "</h2>";
		button += "</div>";
		button += "<div id='singleContactInfo'>";
			button += "<div id='topRow'>";
				button += "<h2 id='" + username + "name' class='nFont contactName'>" + name + "</h2>";
				button += "<h3 id='" + username + "date' class='nFont darkBlue lastDate'>" + getDate(date) + "</h3>";
			button += "</div>";
			button += "<h3 id='" + username + "last' class='nFont lastChat'>" + last + "</h3>";
		button += "</div>";
	button += "</button>";

	document.getElementById('contactsList').innerHTML += button;
}
const createInitials = name => {
	let initials = "";
	nameArray = name.split(' ');
	for(let i = 0; i < nameArray.length; i++){
		initials += nameArray[i][0]
	}
	return initials;
}

/******************************
NEW SELECTED CONTACT
******************************/
selectedContact = undefined;
lastUserToSend = undefined;
lastDate = 0;
const contactClick = (e, id) => {

	newSelectedContact(id);
}
const newSelectedContact = username => {
	if (username == selectedContact){return}

	if (selectedContact != undefined){
		document.getElementById(selectedContact).classList.remove('selectedContact');
	}
	selectedContact = username;

	document.getElementById(selectedContact).classList.add('selectedContact');

	updateChatHeader(username);

	tempChats = chats.get(username);
	lastUserToSend = undefined;
	lastDate = 0;
	document.getElementById('textBox').innerHTML = "";
	for (let i = 0; i < tempChats.length; i++){
		drawMessage(tempChats[i][0], tempChats[i][1], tempChats[i][2]);
	}
	scrollToBottom();
}
const updateChatHeader = username => {
	nameID = username + "name";
	name = document.getElementById(nameID).innerHTML
	document.getElementById('selectedName').innerHTML = name;

	initialsID = username + "initials";
	initials = document.getElementById(initialsID).innerHTML
	document.getElementById('selectedInitials').innerHTML = initials;
}

/******************************
NEW MESSAGE
******************************/
const processNewMessage = e => {
	e.preventDefault();

	const text = document.getElementById('submittedText').value;
	if(text == ""){
		return;
	} else {
		drawMessage(myUsername, text, Date.now());
		scrollToBottom();
		updateContact(selectedContact, myUsername, text, Date.now());

		let chatsList = chats.get(selectedContact);
		chatsList.push([myUsername, text, Date.now()])
		chats.set(selectedContact, chatsList);

		if (selectedContact == 'globalchat'){
			socket.emit('global', {from: myUsername, content: text});
		} else {
			socket.emit('private', {from: myUsername, to: selectedContact, content: text});
		}
	}
	document.getElementById('submittedText').value = '';
}
socket.on('global', function(msg){
	let chatsList = chats.get('globalchat');
	chatsList.push([msg.from, msg.content, Date.now()])
	chats.set('globalchat', chatsList);
	if (selectedContact == 'globalchat'){
		drawMessage(msg.from, msg.content, Date.now());
		scrollToBottom();
	}
	updateContact('globalchat', msg.from, msg.content, Date.now());
})
socket.on('private', async function(msg){
	let chatsList = chats.get(msg.from);

	if (chatsList == undefined){
		chats.set(msg.from, [[msg.from, msg.content, Date.now()]]);

		await fetch("http://3.15.197.74:3000/getName", {
			method : "POST",
			headers: {
		      'Accept': 'application/json',
		      'Content-Type': 'application/json'
	   		},
	   		credentials: 'include',
			body: JSON.stringify({
				user: msg.from,
			})
			})
			.then(response => response.json())
			.then(response => {
				if (response.success == true){
					namesList.push(msg.from, response.name);
					drawContact(msg.from, response.name, Date.now(), getShortenedMessage(msg.from, msg.content));
				} else if (response.success == false){
				}
			})		
			.catch(() => {
				window.location.href = "../login/login.html"
			});

	} else {
		chatsList.push([msg.from, msg.content, Date.now()])
		chats.set(msg.from, chatsList);
		if (selectedContact == msg.from){
			drawMessage(msg.from, msg.content, Date.now());
			scrollToBottom();
		}
		updateContact(msg.from, msg.from, msg.content, Date.now());
	}
})

const drawMessage = (username, content, date) => {

	let direction = 'left';
	if (username == myUsername){direction = 'right'}

	message = "";
	message += "<div class='" + direction + " singleText'>";

	if (username != lastUserToSend || Math.floor((date-lastDate)/1000) > 120){
		message += "<p class='singleTextInfo " + direction + "Info nFont'>";

		if (direction == "left"){
			message += username + " &#xB7 " + getDate(date) + "</p>";
		} else {
			message += getDate(date) + " &#xB7 " + username + "</p>";
		}
		lastUserToSend = username;
	}
	lastDate = date;

	message += "<p class='singleTextContent " + direction + "Content nFont'>" + content + "</p>";
	message += "</div>"

	document.getElementById('textBox').innerHTML += message;
}
const drawContentOnlyMessage = (username, content) => {

	let direction = 'left';
	if (username == myUsername){direction = 'right'}

	message = "";
	message += "<div class='" + direction + " singleText'>";
	message += "<p class='singleTextContent " + direction + "Content nFont'>" + content + "</p>";
	message += "</div>"

	document.getElementById('textBox').innerHTML += message;
}
const scrollToBottom = () => {
	scrollBox = document.getElementById('textBox');
	scrollBox.scrollTop = scrollBox.scrollHeight;
}

/******************************
UPDATING CONTACTS
******************************/
const updateContact = (id, user, message, date) => {
	const idLast = id + "last";
	document.getElementById(idLast).innerHTML = getShortenedMessage(user, message);

	idDate = id + "date";
	document.getElementById(idDate).innerHTML = getDate(date);
}
const getShortenedMessage = (user, message) => {
	message = user + ": " + message;
	if (message.length > 32){
		message = message.substring(0, 32) + "...";
	}
	return message;
}

/******************************
OTHER
******************************/
const getDate = date => {
	let distance = Math.floor((Date.now()-date)/1000);
	if (distance < 30){
		return "now";
	} else if (distance < 60){
		return distance + " sec. ago";
	} else if (distance < 3600){
		distance = Math.round(distance / 60);
		return distance + " min. ago";
	} else if (distance < 86400){
		distance = Math.round(distance / 3600);
		return distance + " hours ago";
	} else if (distance < 604800){
		distance = Math.round(distance / 86400);
		return distance + " days ago";
	} else {
		distance = Math.round(distance / 604800);
		return distance + " weeks ago";
	}
}