const express = require('express');
const router = express.Router();
const auth = require('../middleware/authMiddleware');
const { upsertBudget, getBudgets, getBudgetStatus } = require('../controllers/budgetController');

router.use(auth);
router.get('/', getBudgets);
router.post('/', upsertBudget);
router.get('/status', getBudgetStatus);

module.exports = router;


