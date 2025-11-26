const mongoose = require('mongoose');

const budgetSchema = new mongoose.Schema(
	{
		userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
		category: { type: String, required: true }, // 可用 'ALL' 表示總預算
		limit: { type: Number, required: true, min: 0 },
		period: { type: String, enum: ['monthly'], default: 'monthly' },
	},
	{ timestamps: true }
);
budgetSchema.index({ userId: 1, category: 1, period: 1 }, { unique: true });

module.exports = mongoose.model('Budget', budgetSchema);


