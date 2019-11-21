const jwt = require('jsonwebtoken');

const auth = (req, res, next) => {
	const token = req.cookies.token;
	if (!token){
		res.status(403).send({error: 'unverified'});
	} else {
		const verified = jwt.verify(token, process.env.TOKEN_SECRET);
		req.user = verified;
		next();
	}
}

module.exports = auth;