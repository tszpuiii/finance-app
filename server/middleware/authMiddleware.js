const jwt = require('jsonwebtoken');

function authMiddleware(req, res, next) {
	const authHeader = req.headers.authorization || '';
	const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
	if (!token) {
		return res.status(401).json({ error: 'Missing token' });
	}
	try {
		const decoded = jwt.verify(token, process.env.JWT_SECRET);
		req.userId = decoded.sub;
		return next();
	} catch (err) {
		return res.status(401).json({ error: 'Invalid token' });
	}
}

module.exports = authMiddleware;


