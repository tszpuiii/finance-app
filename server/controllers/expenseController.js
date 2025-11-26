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
		const { amount, category, date, location, note } = req.body;
		if (amount == null || isNaN(Number(amount)) || !category) {
			return res.status(400).json({ error: 'Invalid amount or category' });
		}
		const expense = await Expense.create({
			userId: req.userId,
			amount: Number(amount),
			category,
			date: date ? new Date(date) : new Date(),
			location: location || undefined,
			note: note || undefined,
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

module.exports = { listExpenses, createExpense, deleteExpense };


