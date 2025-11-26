const express = require('express');
const router = express.Router();
const auth = require('../middleware/authMiddleware');
const { listExpenses, createExpense, deleteExpense } = require('../controllers/expenseController');

router.use(auth);
router.get('/', listExpenses);
router.post('/', createExpense);
router.delete('/:id', deleteExpense);

module.exports = router;


