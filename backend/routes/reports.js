const express = require('express');
const router = express.Router();
const { generatePDF, generateExcel, getAnalytics } = require('../controllers/reportController');
const { authenticate, authorizeAdmin } = require('../middleware/auth');

// Both admin and college users can generate reports for their scope
router.get('/pdf', authenticate, generatePDF);
router.get('/excel', authenticate, generateExcel);

// Analytics only for admin
router.get('/analytics', authenticate, authorizeAdmin, getAnalytics);

module.exports = router;
