const express = require('express');
const router = express.Router();
const auth = require('../middleware/authMiddleware');
const { forecastMonthly } = require('../controllers/forecastController');

router.use(auth);
router.get('/', forecastMonthly);

module.exports = router;


