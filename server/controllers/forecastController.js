const Expense = require('../models/Expense');

// 粗略預測：本月平均每日支出 * 本月天數
async function forecastMonthly(req, res) {
	try {
		const now = new Date();
		const start = new Date(now.getFullYear(), now.getMonth(), 1);
		const end = new Date(now.getFullYear(), now.getMonth() + 1, 1);
		const daysInMonth = Math.floor((end - start) / (24 * 3600 * 1000));
		const daysPassed = Math.max(1, Math.ceil((now - start) / (24 * 3600 * 1000)));

		const agg = await Expense.aggregate([
			{ $match: { userId: req.userId, date: { $gte: start, $lt: end } } },
			{ $group: { _id: null, total: { $sum: '$amount' } } },
		]);
		const spent = agg.length ? agg[0].total : 0;
		const avgPerDay = spent / daysPassed;
		const forecast = avgPerDay * daysInMonth;
		return res.json({ month: now.getMonth() + 1, spent, avgPerDay, forecast });
	} catch (err) {
		return res.status(500).json({ error: 'Server error' });
	}
}

module.exports = { forecastMonthly };


