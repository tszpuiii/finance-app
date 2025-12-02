const mongoose = require('mongoose');

const expenseSchema = new mongoose.Schema(
	{
		userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
		amount: { type: Number, required: true, min: 0 },
		category: { type: String, required: true },
		date: { type: Date, default: () => new Date() },
		location: {
			lat: { type: Number },
			lng: { type: Number },
		},
		locationName: { type: String }, // Store location name/address
		note: { type: String },
		receiptImage: { type: String }, // Base64 encoded image or URL
	},
	{ timestamps: true }
);

module.exports = mongoose.model('Expense', expenseSchema);


