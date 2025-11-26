const Budget = require('../models/Budget');
const Expense = require('../models/Expense');

async function upsertBudget(req, res) {
	try {
		const { category = 'ALL', limit, period = 'monthly' } = req.body;
		if (limit == null || isNaN(Number(limit))) {
			return res.status(400).json({ error: 'Invalid limit' });
		}
		const doc = await Budget.findOneAndUpdate(
			{ userId: req.userId, category, period },
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
		const items = await Budget.find({ userId: req.userId, period: 'monthly' }).sort({ category: 1 });
		return res.json({ budgets: items });
	} catch (err) {
		return res.status(500).json({ error: 'Server error' });
	}
}

async function getBudgetStatus(req, res) {
	try {
		// 當月期間
		const now = new Date();
		const start = new Date(now.getFullYear(), now.getMonth(), 1);
		const end = new Date(now.getFullYear(), now.getMonth() + 1, 1);
		const budgets = await Budget.find({ userId: req.userId, period: 'monthly' });
		const agg = await Expense.aggregate([
			{ $match: { userId: req.userId, date: { $gte: start, $lt: end } } },
			{ $group: { _id: '$category', total: { $sum: '$amount' } } },
		]);
		const totals = Object.fromEntries(agg.map((a) => [a._id, a.total]));
		const overall = Object.values(totals).reduce((a, b) => a + b, 0);
		const result = budgets.map((b) => {
			const spent = b.category === 'ALL' ? overall : (totals[b.category] || 0);
			const ratio = b.limit > 0 ? spent / b.limit : 0;
			return { category: b.category, limit: b.limit, spent, ratio };
		});
		return res.json({ status: result });
	} catch (err) {
		return res.status(500).json({ error: 'Server error' });
	}
}

module.exports = { upsertBudget, getBudgets, getBudgetStatus };


