# InstaMessage

Visit the website [here](http://instamessage.rf.gd).

InstaMessage is an instant message client that allows users to send messages to other individuals and globally to all users. 
The backend is built on Node.js and hosted on an AWS ec2 instance. It uses WebSockets via the Socket.io library to allow for low latency connections between clients and a server. The connections are persistent and bidirectional, avoiding the need for clients to constantly poll the server for updates. Websocket connections are matched with usernames so that clients can send individual messages to specific clients. User profiles and all their messages are stored in a MongoDB cluster, allowing users to seamlessly continue conversations 
upon logging onto the platform. Request authentication is handled with JSON Web Tokens that are stored through browser cookies. Login and other various requests are handled via a basic RESTful API (Post and Get requests).

The front end is built using HTML5, CSS and JavaScript, though is still in need of a dedicated mobile design.
