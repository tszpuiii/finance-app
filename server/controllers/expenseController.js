const Expense = require('../models/Expense');
const Budget = require('../models/Budget');

async function listExpenses(req, res) {
	try {
		const expenses = await Expense.find({ userId: req.userId }).sort({ date: -1, createdAt: -1 }).limit(200);
		return res.json({ expenses });
	} catch (err) {
		return res.status(500).json({ error: 'Server error' });
	}
}

async function createExpense(req, res) {
	try {
		const { amount, category, date, location, locationName, note } = req.body;
		if (amount == null || isNaN(Number(amount)) || !category) {
			return res.status(400).json({ error: 'Invalid amount or category' });
		}
		// Ensure date is set correctly - if not provided, use current date
		// Store date in UTC to match budget status queries
		let expenseDate;
		if (date) {
			expenseDate = new Date(date);
		} else {
			// Use current date, but normalize to UTC start of day
			const now = new Date();
			expenseDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0));
		}
		
		const expense = await Expense.create({
			userId: req.userId,
			amount: Number(amount),
			category,
			date: expenseDate,
			location: location || undefined,
			locationName: locationName || undefined,
			note: note || undefined,
		});
		
		console.log('Created expense:', {
			id: expense._id,
			category: expense.category,
			amount: expense.amount,
			date: expense.date.toISOString()
		});
		// 簡易預算檢查（當月）
		let alert = null;
		const now = new Date();
		const start = new Date(now.getFullYear(), now.getMonth(), 1);
		const end = new Date(now.getFullYear(), now.getMonth() + 1, 1);
		const budgets = await Budget.find({ userId: req.userId, period: 'monthly', category: { $in: ['ALL', category] } });
		if (budgets.length > 0) {
			const sums = await Expense.aggregate([
				{ $match: { userId: req.userId, date: { $gte: start, $lt: end } } },
				{ $group: { _id: '$category', total: { $sum: '$amount' } } },
			]);
			const totals = Object.fromEntries(sums.map((s) => [s._id, s.total]));
			const overall = Object.values(totals).reduce((a, b) => a + b, 0);
			for (const b of budgets) {
				const spent = b.category === 'ALL' ? overall : (totals[b.category] || 0);
				if (b.limit > 0) {
					const ratio = spent / b.limit;
					if (ratio >= 1) {
						alert = { type: 'budget_exceeded', category: b.category, percent: 100, spent, limit: b.limit };
						break;
					} else if (ratio >= 0.8 && !alert) {
						alert = { type: 'budget_warning', category: b.category, percent: Math.round(ratio * 100), spent, limit: b.limit };
					}
				}
			}
		}
		return res.status(201).json({ expense, alert });
	} catch (err) {
		return res.status(500).json({ error: 'Server error' });
	}
}

async function deleteExpense(req, res) {
	try {
		const id = req.params.id;
		const doc = await Expense.findOneAndDelete({ _id: id, userId: req.userId });
		if (!doc) return res.status(404).json({ error: 'Not found' });
		return res.json({ ok: true });
	} catch (err) {
		return res.status(500).json({ error: 'Server error' });
	}
}

async function convertAllExpenses(req, res) {
	try {
		const { fromCurrency, toCurrency, exchangeRate } = req.body;
		
		if (!fromCurrency || !toCurrency || !exchangeRate) {
			return res.status(400).json({ error: 'Missing required parameters: fromCurrency, toCurrency, exchangeRate' });
		}
		
		if (fromCurrency === toCurrency) {
			return res.json({ message: 'Same currency, no conversion needed', updated: 0 });
		}
		
		const rate = parseFloat(exchangeRate);
		if (isNaN(rate) || rate <= 0) {
			return res.status(400).json({ error: 'Invalid exchange rate' });
		}
		
		// Convert userId to ObjectId if needed
		const mongoose = require('mongoose');
		const userId = mongoose.Types.ObjectId.isValid(req.userId) 
			? new mongoose.Types.ObjectId(req.userId) 
			: req.userId;
		
		// Get all expenses for this user
		const expenses = await Expense.find({ userId: userId });
		
		if (expenses.length === 0) {
			return res.json({ message: 'No expenses to convert', updated: 0 });
		}
		
		// Update all expenses with converted amounts
		const bulkOps = expenses.map(expense => ({
			updateOne: {
				filter: { _id: expense._id },
				update: { $set: { amount: parseFloat((expense.amount * rate).toFixed(2)) } }
			}
		}));
		
		const result = await Expense.bulkWrite(bulkOps);
		
		console.log(`Converted ${result.modifiedCount} expenses from ${fromCurrency} to ${toCurrency} at rate ${rate}`);
		
		return res.json({
			message: 'Expenses converted successfully',
			updated: result.modifiedCount,
			fromCurrency,
			toCurrency,
			exchangeRate: rate
		});
	} catch (err) {
		console.error('Convert expenses error:', err);
		return res.status(500).json({ error: 'Server error', details: err.message });
	}
}

module.exports = { listExpenses, createExpense, deleteExpense, convertAllExpenses };


