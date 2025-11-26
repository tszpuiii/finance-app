const Budget = require('../models/Budget');
const Expense = require('../models/Expense');
const mongoose = require('mongoose');

async function upsertBudget(req, res) {
	try {
		const { category = 'ALL', limit, period = 'monthly' } = req.body;
		if (limit == null || isNaN(Number(limit))) {
			return res.status(400).json({ error: 'Invalid limit' });
		}
		// Convert userId to ObjectId if it's a string
		const userId = mongoose.Types.ObjectId.isValid(req.userId) 
			? new mongoose.Types.ObjectId(req.userId) 
			: req.userId;
		const doc = await Budget.findOneAndUpdate(
			{ userId: userId, category, period },
			{ $set: { limit: Number(limit) } },
			{ new: true, upsert: true }
		);
		return res.json({ budget: doc });
	} catch (err) {
		return res.status(500).json({ error: 'Server error' });
	}
}

async function getBudgets(req, res) {
	try {
		// Convert userId to ObjectId if it's a string
		const userId = mongoose.Types.ObjectId.isValid(req.userId) 
			? new mongoose.Types.ObjectId(req.userId) 
			: req.userId;
		const items = await Budget.find({ userId: userId, period: 'monthly' }).sort({ category: 1 });
		return res.json({ budgets: items });
	} catch (err) {
		return res.status(500).json({ error: 'Server error' });
	}
}

async function getBudgetStatus(req, res) {
	try {
		// Current month range - use UTC to avoid timezone issues
		const now = new Date();
		const year = now.getUTCFullYear();
		const month = now.getUTCMonth();
		
		// Start of current month in UTC
		const start = new Date(Date.UTC(year, month, 1, 0, 0, 0, 0));
		// Start of next month in UTC
		const end = new Date(Date.UTC(year, month + 1, 1, 0, 0, 0, 0));
		
		// Convert userId to ObjectId if it's a string
		const userId = mongoose.Types.ObjectId.isValid(req.userId) 
			? new mongoose.Types.ObjectId(req.userId) 
			: req.userId;

		console.log('Budget status query:', {
			reqUserId: String(req.userId),
			reqUserIdType: typeof req.userId,
			convertedUserId: String(userId),
			userIdType: userId.constructor.name,
			year,
			month: month + 1,
			start: start.toISOString(),
			end: end.toISOString(),
			now: now.toISOString()
		});

		const budgets = await Budget.find({ userId: userId, period: 'monthly' });
		console.log('Found budgets:', budgets.length, budgets.map(b => ({ category: b.category, limit: b.limit })));

		// Query all expenses in current month
		const allExpenses = await Expense.find({ 
			userId: userId, 
			date: { $gte: start, $lt: end } 
		}).sort({ date: -1 });
		
		console.log('Total expenses this month:', allExpenses.length);
		if (allExpenses.length > 0) {
			console.log('First 3 expenses:', allExpenses.slice(0, 3).map(e => ({
				category: e.category,
				amount: e.amount,
				date: e.date.toISOString(),
				dateLocal: e.date.toLocaleString()
			})));
		} else {
			// If no expenses found, check if there are any expenses at all
			const anyExpenses = await Expense.find({ userId: userId }).limit(5);
			console.log('No expenses found in date range. Checking all expenses for this user...');
			console.log('Query userId:', String(userId), 'Type:', userId.constructor.name);
			console.log('Sample expenses (any date):', anyExpenses.map(e => ({
				category: e.category,
				amount: e.amount,
				date: e.date.toISOString(),
				expenseUserId: String(e.userId),
				expenseUserIdType: e.userId.constructor.name,
				userIdMatch: String(e.userId) === String(userId)
			})));
			
			// Also try with string userId
			const stringUserId = String(req.userId);
			const expensesWithString = await Expense.find({ userId: stringUserId }).limit(5);
			console.log('Trying with string userId:', stringUserId);
			console.log('Found expenses with string userId:', expensesWithString.length);
		}

		// Aggregate expenses by category for current month
		const agg = await Expense.aggregate([
			{ $match: { userId: userId, date: { $gte: start, $lt: end } } },
			{ $group: { _id: '$category', total: { $sum: '$amount' }, count: { $sum: 1 } } },
		]);
		console.log('Expense aggregation:', agg);

		const totals = Object.fromEntries(agg.map((a) => [a._id, a.total]));
		const overall = Object.values(totals).reduce((a, b) => a + b, 0);
		console.log('Total spent:', overall, 'By category:', totals);

		// Only return budgets that exist, and ensure ALL is included if it exists
		const result = budgets.map((b) => {
			const spent = b.category === 'ALL' ? overall : (totals[b.category] || 0);
			const ratio = b.limit > 0 ? spent / b.limit : 0;
			return { category: b.category, limit: b.limit, spent, ratio };
		});
		
		// Sort to put ALL first
		result.sort((a, b) => {
			if (a.category === 'ALL') return -1;
			if (b.category === 'ALL') return 1;
			return 0;
		});
		
		console.log('Returning budget status:', result);
		return res.json({ status: result });
	} catch (err) {
		console.error('Budget status error:', err);
		return res.status(500).json({ error: 'Server error', details: err.message });
	}
}

async function deleteBudget(req, res) {
	try {
		const { category } = req.body;
		if (!category) {
			return res.status(400).json({ error: 'Category required' });
		}
		// Don't allow deleting ALL category
		if (category === 'ALL') {
			return res.status(400).json({ error: 'Cannot delete ALL category' });
		}
		// Convert userId to ObjectId if it's a string
		const userId = mongoose.Types.ObjectId.isValid(req.userId) 
			? new mongoose.Types.ObjectId(req.userId) 
			: req.userId;
		const doc = await Budget.findOneAndDelete({ userId: userId, category, period: 'monthly' });
		if (!doc) {
			return res.status(404).json({ error: 'Budget not found' });
		}
		return res.json({ ok: true });
	} catch (err) {
		return res.status(500).json({ error: 'Server error' });
	}
}

async function convertAllBudgets(req, res) {
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
		const userId = mongoose.Types.ObjectId.isValid(req.userId) 
			? new mongoose.Types.ObjectId(req.userId) 
			: req.userId;
		
		// Get all budgets for this user
		const budgets = await Budget.find({ userId: userId });
		
		if (budgets.length === 0) {
			return res.json({ message: 'No budgets to convert', updated: 0 });
		}
		
		// Update all budgets with converted limits
		const bulkOps = budgets.map(budget => ({
			updateOne: {
				filter: { _id: budget._id },
				update: { $set: { limit: parseFloat((budget.limit * rate).toFixed(2)) } }
			}
		}));
		
		const result = await Budget.bulkWrite(bulkOps);
		
		console.log(`Converted ${result.modifiedCount} budgets from ${fromCurrency} to ${toCurrency} at rate ${rate}`);
		
		return res.json({
			message: 'Budgets converted successfully',
			updated: result.modifiedCount,
			fromCurrency,
			toCurrency,
			exchangeRate: rate
		});
	} catch (err) {
		console.error('Convert budgets error:', err);
		return res.status(500).json({ error: 'Server error', details: err.message });
	}
}

module.exports = { upsertBudget, getBudgets, getBudgetStatus, deleteBudget, convertAllBudgets };


