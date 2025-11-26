const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('./models/User');
const Expense = require('./models/Expense');
const Budget = require('./models/Budget');

dotenv.config();

async function debugBudgetStatus() {
	try {
		const mongoUri = process.env.MONGODB_URI;
		await mongoose.connect(mongoUri);
		console.log('✓ Connected to MongoDB\n');

		// Get user with expenses (test@t.com)
		const user = await User.findOne({ email: 'test@t.com' }) || await User.findOne({});
		if (!user) {
			console.log('No users found');
			process.exit(0);
		}

		console.log(`Testing with user: ${user.email} (${user._id})\n`);

		// Current month range - use UTC to match budget controller
		const now = new Date();
		const year = now.getUTCFullYear();
		const month = now.getUTCMonth();
		const start = new Date(Date.UTC(year, month, 1, 0, 0, 0, 0));
		const end = new Date(Date.UTC(year, month + 1, 1, 0, 0, 0, 0));

		console.log('=== DATE RANGE ===');
		console.log('Current date:', now.toISOString());
		console.log('Month start:', start.toISOString());
		console.log('Month end:', end.toISOString());
		console.log('');

		// Get all budgets
		console.log('=== BUDGETS ===');
		const budgets = await Budget.find({ userId: user._id, period: 'monthly' });
		console.log(`Found ${budgets.length} budgets:`);
		budgets.forEach((b) => {
			console.log(`  - Category: ${b.category}, Limit: $${b.limit}`);
		});
		console.log('');

		// Get all expenses (any date)
		console.log('=== ALL EXPENSES ===');
		const allExpenses = await Expense.find({ userId: user._id }).sort({ date: -1 });
		console.log(`Total expenses: ${allExpenses.length}`);
		allExpenses.forEach((e) => {
			const dateStr = e.date.toISOString();
			const dateLocal = e.date.toLocaleString();
			const inRange = e.date >= start && e.date < end;
			console.log(
				`  - ${e.category}: $${e.amount} | Date: ${dateStr} (${dateLocal}) | In range: ${inRange}`
			);
		});
		console.log('');

		// Get expenses in current month
		console.log('=== EXPENSES IN CURRENT MONTH ===');
		const monthExpenses = await Expense.find({
			userId: user._id,
			date: { $gte: start, $lt: end }
		});
		console.log(`Found ${monthExpenses.length} expenses in current month:`);
		monthExpenses.forEach((e) => {
			console.log(`  - ${e.category}: $${e.amount} | Date: ${e.date.toISOString()}`);
		});
		console.log('');

		// Aggregate expenses by category
		console.log('=== EXPENSE AGGREGATION ===');
		const agg = await Expense.aggregate([
			{ $match: { userId: user._id, date: { $gte: start, $lt: end } } },
			{ $group: { _id: '$category', total: { $sum: '$amount' }, count: { $sum: 1 } } }
		]);
		console.log('Aggregation result:');
		agg.forEach((a) => {
			console.log(`  - ${a._id}: $${a.total} (${a.count} expenses)`);
		});
		console.log('');

		// Calculate totals
		const totals = Object.fromEntries(agg.map((a) => [a._id, a.total]));
		const overall = Object.values(totals).reduce((a, b) => a + b, 0);
		console.log('=== CALCULATED TOTALS ===');
		console.log('By category:', totals);
		console.log('Overall total:', overall);
		console.log('');

		// Calculate budget status
		console.log('=== BUDGET STATUS CALCULATION ===');
		const result = budgets.map((b) => {
			const spent = b.category === 'ALL' ? overall : totals[b.category] || 0;
			const ratio = b.limit > 0 ? spent / b.limit : 0;
			console.log(
				`Budget: ${b.category} | Limit: $${b.limit} | Spent: $${spent} | Ratio: ${(ratio * 100).toFixed(2)}%`
			);
			return { category: b.category, limit: b.limit, spent, ratio };
		});
		console.log('');

		// Check date issues
		console.log('=== DATE COMPARISON ===');
		if (allExpenses.length > 0) {
			const firstExpense = allExpenses[0];
			console.log('First expense date:', firstExpense.date.toISOString());
			console.log('Month start:', start.toISOString());
			console.log('Month end:', end.toISOString());
			console.log('Is >= start?', firstExpense.date >= start);
			console.log('Is < end?', firstExpense.date < end);
			console.log('Date type:', typeof firstExpense.date);
			console.log('Start type:', typeof start);
		}

		await mongoose.disconnect();
		console.log('\n✓ Disconnected from MongoDB');
	} catch (err) {
		console.error('Error:', err);
		process.exit(1);
	}
}

debugBudgetStatus();

