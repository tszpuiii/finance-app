const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (_req, res) => {
	res.json({ status: 'ok' });
});

// Database connection (optional during early dev if MONGODB_URI not set)
const mongoUri = process.env.MONGODB_URI;
if (mongoUri && mongoUri.trim().length > 0) {
	mongoose
		.connect(mongoUri)
		.then(() => {
			console.log('✓ Connected to MongoDB');
		})
		.catch((err) => {
			console.error('✗ MongoDB connection error:', err.message);
			console.error('  Please check your MONGODB_URI in .env file');
			// 不阻止服務器啟動，但會在 API 調用時返回 503
		});

	// 監聽連接事件
	mongoose.connection.on('error', (err) => {
		console.error('MongoDB connection error:', err);
	});

	mongoose.connection.on('disconnected', () => {
		console.warn('MongoDB disconnected');
	});
} else {
	console.warn('⚠ MONGODB_URI not set. Skipping MongoDB connection.');
	console.warn('  API endpoints will return 503 (Database not available)');
}

// Routes
const authRoutes = require('./routes/auth');
const expenseRoutes = require('./routes/expenses');
const budgetRoutes = require('./routes/budgets');
const forecastRoutes = require('./routes/forecast');
const currencyRoutes = require('./routes/currency');
app.use('/api/auth', authRoutes);
app.use('/api/expenses', expenseRoutes);
app.use('/api/budgets', budgetRoutes);
app.use('/api/forecast', forecastRoutes);
app.use('/api/currency', currencyRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
	console.log(`Server running on port ${PORT}`);
});


