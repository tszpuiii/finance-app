const express = require('express');
const router = express.Router();
const auth = require('../middleware/authMiddleware');
const { upsertBudget, getBudgets, getBudgetStatus, deleteBudget, convertAllBudgets } = require('../controllers/budgetController');

router.use(auth);
router.get('/', getBudgets);
router.post('/', upsertBudget);
router.post('/convert', convertAllBudgets);
router.delete('/', deleteBudget);
router.get('/status', getBudgetStatus);

module.exports = router;


