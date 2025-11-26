const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('./models/User');
const Expense = require('./models/Expense');

dotenv.config();

async function checkExpenseDates() {
	try {
		const mongoUri = process.env.MONGODB_URI;
		await mongoose.connect(mongoUri);
		console.log('✓ Connected to MongoDB\n');

		// Get user with expenses
		const user = await User.findOne({ email: 'test@t.com' });
		if (!user) {
			console.log('User not found');
			process.exit(0);
		}

		console.log(`User: ${user.email} (${user._id})\n`);

		// Get all expenses
		const allExpenses = await Expense.find({ userId: user._id }).sort({ date: -1 });
		console.log('=== ALL EXPENSES ===');
		allExpenses.forEach((e) => {
			console.log(`Category: ${e.category}, Amount: $${e.amount}`);
			console.log(`  Date (ISO): ${e.date.toISOString()}`);
			console.log(`  Date (Local): ${e.date.toLocaleString()}`);
			console.log(`  Date (UTC): ${e.date.toUTCString()}`);
			console.log(`  Timestamp: ${e.date.getTime()}`);
			console.log('');
		});

		// Check current month range (as used in controller)
		const now = new Date();
		const year = now.getUTCFullYear();
		const month = now.getUTCMonth();
		const start = new Date(Date.UTC(year, month, 1, 0, 0, 0, 0));
		const end = new Date(Date.UTC(year, month + 1, 1, 0, 0, 0, 0));

		console.log('=== QUERY RANGE (as in controller) ===');
		console.log(`Start: ${start.toISOString()} (${start.getTime()})`);
		console.log(`End: ${end.toISOString()} (${end.getTime()})`);
		console.log('');

		// Check each expense
		console.log('=== DATE COMPARISON ===');
		allExpenses.forEach((e) => {
			const inRange = e.date >= start && e.date < end;
			console.log(`Expense: ${e.category} - $${e.amount}`);
			console.log(`  Expense date: ${e.date.getTime()}`);
			console.log(`  Start: ${start.getTime()}, End: ${end.getTime()}`);
			console.log(`  >= start? ${e.date >= start}`);
			console.log(`  < end? ${e.date < end}`);
			console.log(`  In range? ${inRange}`);
			console.log('');
		});

		// Try MongoDB query
		console.log('=== MONGODB QUERY TEST ===');
		const queryResult = await Expense.find({
			userId: user._id,
			date: { $gte: start, $lt: end }
		});
		console.log(`Found ${queryResult.length} expenses with query`);
		queryResult.forEach((e) => {
			console.log(`  - ${e.category}: $${e.amount} (${e.date.toISOString()})`);
		});

		// Try aggregation
		console.log('\n=== AGGREGATION TEST ===');
		const agg = await Expense.aggregate([
			{ $match: { userId: user._id, date: { $gte: start, $lt: end } } },
			{ $group: { _id: '$category', total: { $sum: '$amount' }, count: { $sum: 1 } } }
		]);
		console.log('Aggregation result:', JSON.stringify(agg, null, 2));

		await mongoose.disconnect();
		console.log('\n✓ Disconnected from MongoDB');
	} catch (err) {
		console.error('Error:', err);
		process.exit(1);
	}
}

checkExpenseDates();

