const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const User = require('../models/User');

async function register(req, res) {
	try {
		// Check database connection
		if (mongoose.connection.readyState !== 1) {
			console.error('MongoDB not connected. ReadyState:', mongoose.connection.readyState);
			return res.status(503).json({ error: 'Database not available' });
		}

		const { email, password } = req.body;
		if (!email || !password) {
			return res.status(400).json({ error: 'Email and password required' });
		}

		// Validate email format
		const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
		if (!emailRegex.test(email)) {
			return res.status(400).json({ error: 'Invalid email format' });
		}

		// Validate password length
		if (password.length < 6) {
			return res.status(400).json({ error: 'Password must be at least 6 characters' });
		}

		const existing = await User.findOne({ email });
		if (existing) {
			return res.status(409).json({ error: 'Email already registered' });
		}

		const passwordHash = await bcrypt.hash(password, 10);
		const user = await User.create({ email, passwordHash });
		return res.status(201).json({ id: user._id, email: user.email });
	} catch (err) {
		// 記錄錯誤詳情
		console.error('Registration error:', err);
		
		// 處理 MongoDB 重複鍵錯誤
		if (err.code === 11000 || err.name === 'MongoServerError') {
			return res.status(409).json({ error: 'Email already registered' });
		}
		
		// 處理驗證錯誤
		if (err.name === 'ValidationError') {
			return res.status(400).json({ error: err.message });
		}

		// 其他錯誤
		const errorMessage = process.env.NODE_ENV === 'development' ? err.message : 'Server error';
		return res.status(500).json({ error: errorMessage });
	}
}

async function login(req, res) {
	try {
		// 檢查數據庫連接
		if (mongoose.connection.readyState !== 1) {
			console.error('MongoDB not connected. ReadyState:', mongoose.connection.readyState);
			return res.status(503).json({ error: 'Database not available' });
		}

		const { email, password } = req.body;
		if (!email || !password) {
			return res.status(400).json({ error: 'Email and password required' });
		}

		const user = await User.findOne({ email });
		if (!user) {
			return res.status(401).json({ error: 'Invalid credentials' });
		}

		const ok = await bcrypt.compare(password, user.passwordHash);
		if (!ok) {
			return res.status(401).json({ error: 'Invalid credentials' });
		}

		if (!process.env.JWT_SECRET) {
			console.error('JWT_SECRET not set');
			return res.status(500).json({ error: 'Server configuration error' });
		}

		const token = jwt.sign({}, process.env.JWT_SECRET, {
			subject: String(user._id),
			expiresIn: '7d',
		});
		return res.json({ token, user: { id: user._id, email: user.email } });
	} catch (err) {
		console.error('Login error:', err);
		const errorMessage = process.env.NODE_ENV === 'development' ? err.message : 'Server error';
		return res.status(500).json({ error: errorMessage });
	}
}

async function getMe(req, res) {
	try {
		const user = await User.findById(req.userId).select('email createdAt');
		if (!user) {
			return res.status(404).json({ error: 'User not found' });
		}
		return res.json({ 
			id: user._id, 
			_id: user._id,
			email: user.email,
			createdAt: user.createdAt 
		});
	} catch (err) {
		console.error('Get user error:', err);
		return res.status(500).json({ error: 'Server error' });
	}
}

module.exports = { register, login, getMe };


