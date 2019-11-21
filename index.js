/******************************MAIN SETUP******************************/
const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const cors = require('cors');

const app = express();
app.use(cors({credentials: true, origin: 'http://instamessage.rf.gd'}));
const http = require('http').Server(app);
app.use(bodyParser.urlencoded({ extended: false}));
app.use(bodyParser.json());

const cookieParser = require('cookie-parser');
app.use(cookieParser());

http.listen(3000);
 
const auth = require('./auth');

app.get('/logout', auth, async (req, res) => {
	res.clearCookie('token');
	res.sendStatus('200');
})

app.get('/status', auth, async (req, res) => {
	res.sendStatus(200);
})

/******************************MONGO DB SETUP******************************/
const MongoClient = require('mongodb').MongoClient;
const Server = require('mongodb').Server;
const ObjectId = require('mongodb').ObjectId;
let db1 = undefined;
let profileConnection = undefined;
const mongoURL = "mongodb+srv://atuljalan22:Thevillas1@cluster0-yyezm.mongodb.net/test?retryWrites=true&w=majority";
MongoClient.connect(mongoURL, function (err, database) {
    if(err) throw err;
    db1 = database.db('InstaMessage');
    profileConnection = db1.collection('Profiles');
});

/******************************POST FUNCTIONS - SIGNUP******************************/
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');
dotenv.config();

app.post('/signup', async (req,res) => {
	const _name = req.body.name;
	const _user = req.body.user;
	const _pass = req.body.pass;

	const user = await profileConnection.findOne({user: _user});

	if (user) {
		return res.send({taken: true});
	} else {
		const salt = await bcrypt.genSalt(10);
		const hashPass = await bcrypt.hash(_pass, salt);

		profileConnection.insertOne({name: _name, user: _user, pass: hashPass, chats: ['globalchat']}, async (err, result) => { 
			if (err) {
				console.error(err); 
				return;
			}
			const _token = await jwt.sign({_id: result.insertedId}, process.env.TOKEN_SECRET);
			return res
					.cookie("token", _token)
					.send({taken: false})
		})
	}
})

app.post('/login', async (req,res) => {
	const _user = req.body.user;
	const _pass = req.body.pass;

	const user = await profileConnection.findOne({user: _user});

	if (!user) {
		return res.send({user: false, pass: undefined});
	} else {
		const validPass = await bcrypt.compare(_pass, user.pass);

		if (!validPass) {
			return res.send({user: true, pass: false});
		} else {
			const _token = await jwt.sign({_id: user._id}, process.env.TOKEN_SECRET);
			return res
					.cookie("token", _token)
			 		.send({user: true, pass: true})
		}
	}
})

/******************************POST FUNCTIONS - HOMEPAGE******************************/

app.post('/getInfo', auth, async (req, res) => {
	const _user = await profileConnection.findOne({_id: ObjectId(req.user._id)});
	const chatNames = _user.chats;
	let returnMap = [];
	let nameList = [];
	for(let i = 0; i < chatNames.length; i++){
		values = [];
		const result = await db1.collection(chatNames[i]).find({}).toArray();
		for (let j = 0; j < result.length; j++){
			values.push([result[j].from, result[j].content, result[j].date]);
		}
		usernames = chatNames[i].split("-");
		if (usernames[0] == 'globalchat'){
			returnMap.push([usernames[0], values]);
			nameList.push([usernames[0], 'Global Chat']);
		} else if(usernames[0] != _user.user){
			returnMap.push([usernames[0], values]);
			const findUser = await profileConnection.findOne({user: usernames[0]});
			nameList.push([usernames[0], findUser.name]);
		} else {
			returnMap.push([usernames[1], values]);
			const findUser = await profileConnection.findOne({user: usernames[1]});
			nameList.push([usernames[1], findUser.name]);
		}
	}
	return res.send({name: _user.name, user: _user.user, chats: returnMap, names: nameList});
})

app.post('/newChat', auth, async (req, res) => {
	const _user = await profileConnection.findOne({_id: ObjectId(req.user._id)});
	const _otherUser = await profileConnection.findOne({user: req.body.otherUser});

	if (_otherUser) {
		let filename = createFileName(_user.user, _otherUser.user);
		db1.createCollection(filename, function(err, res){if (err){throw err}});

		let newChatUser = _user.chats;
		newChatUser.push(filename);
		profileConnection.updateOne({user: _user.user}, {$set: {chats: newChatUser}});

		let newChatOtherUser = _otherUser.chats;
		newChatOtherUser.push(filename);
		profileConnection.updateOne({user: _otherUser.user}, {$set: {chats: newChatOtherUser}});

		return res.send({success: true, exists: true, name: _otherUser.name});
	} else {
		return res.send({success: false, exists: false});
	}
})

app.post('/getName', auth, async (req, res) => {
	const _user = await profileConnection.findOne({user: req.body.user});

	if(_user){
		return res.send({success: true, name: _user.name});
	} else {
		return res.send({success: false});
	}
})
const createFileName = (usernameA, usernameB) => {
	usernameA = usernameA.toLowerCase();
	usernameB = usernameB.toLowerCase();

	fileName = "";

	if (usernameA < usernameB){
		fileName = usernameA + "-" + usernameB;
	} else {
		fileName = usernameB + "-" + usernameA;
	}

	return fileName;
}


/******************************SOCKET.IO******************************/
const io = require('socket.io')(http);
let connectedClients = new Map();
let reversedClients = new Map();
io.on('connection', async function (socket) {

	socket.on('disconnect', function(){
		const user = reversedClients.get(socket.id);
		if (user != undefined){
			reversedClients.delete(socket.id);
			connectedClients.delete(user);
		}
	})

	socket.on('username', function(user){
		connectedClients.set(user, socket.id);
		reversedClients.set(socket.id, user);
	})

	socket.on('private', function(msg){
		filename = createFileName(msg.from, msg.to);
		privateConnection = db1.collection(filename, function(err, collection){
			if (err) {
				throw err;
			} else {
				collection.insertOne({from: msg.from, content: msg.content, date: Date.now()});
			}
		})

		const _id = connectedClients.get(msg.to);
		if(_id != undefined){
			socket.broadcast.to(_id).emit('private', msg);
		}
	})

	socket.on('global', function(msg){
		privateConnection = db1.collection('globalchat', function(err, collection){
			if (err) {
				throw err;
			} else {
				collection.insertOne({from: msg.from, content: msg.content, date: Date.now()});
			}
		})
		socket.broadcast.emit('global', msg);
	})
})
