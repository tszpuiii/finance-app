const express = require('express');
const router = express.Router();
const auth = require('../middleware/authMiddleware');
const { listExpenses, createExpense, updateExpense, deleteExpense, convertAllExpenses } = require('../controllers/expenseController');

router.use(auth);
router.get('/', listExpenses);
router.post('/', createExpense);
router.put('/:id', updateExpense);
router.post('/convert', convertAllExpenses);
router.delete('/:id', deleteExpense);

module.exports = router;


