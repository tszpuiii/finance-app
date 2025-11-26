const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('./models/User');
const Expense = require('./models/Expense');
const Budget = require('./models/Budget');

dotenv.config();

async function viewData() {
	try {
		const mongoUri = process.env.MONGODB_URI;
		if (!mongoUri) {
			console.error('MONGODB_URI not set in .env file');
			process.exit(1);
		}

		await mongoose.connect(mongoUri);
		console.log('✓ Connected to MongoDB\n');

		// View Users
		console.log('=== USERS ===');
		const users = await User.find({}).select('email createdAt').lean();
		console.log(`Total users: ${users.length}`);
		users.forEach((u, i) => {
			console.log(`${i + 1}. Email: ${u.email}, Created: ${u.createdAt}`);
		});
		console.log('');

		// View Expenses
		console.log('=== EXPENSES ===');
		const expenses = await Expense.find({})
			.sort({ date: -1 })
			.limit(20)
			.lean();
		console.log(`Total expenses: ${await Expense.countDocuments({})}`);
		console.log(`Showing last 20 expenses:\n`);
		expenses.forEach((e, i) => {
			const date = new Date(e.date).toLocaleDateString('en-US');
			console.log(
				`${i + 1}. ${e.category} - $${e.amount.toFixed(2)} - ${date} (User: ${e.userId})`
			);
		});
		console.log('');

		// View Budgets
		console.log('=== BUDGETS ===');
		const budgets = await Budget.find({}).lean();
		console.log(`Total budgets: ${budgets.length}`);
		budgets.forEach((b, i) => {
			console.log(
				`${i + 1}. Category: ${b.category}, Limit: $${b.limit}, Period: ${b.period} (User: ${b.userId})`
			);
		});
		console.log('');

		// Summary by user
		console.log('=== SUMMARY BY USER ===');
		const userIds = await User.find({}).select('_id email').lean();
		for (const user of userIds) {
			const userExpenses = await Expense.find({ userId: user._id });
			const totalSpent = userExpenses.reduce((sum, e) => sum + e.amount, 0);
			const userBudgets = await Budget.find({ userId: user._id });
			console.log(
				`User: ${user.email}\n  Expenses: ${userExpenses.length}, Total: $${totalSpent.toFixed(2)}\n  Budgets: ${userBudgets.length}`
			);
		}

		await mongoose.disconnect();
		console.log('\n✓ Disconnected from MongoDB');
	} catch (err) {
		console.error('Error:', err);
		process.exit(1);
	}
}

viewData();

