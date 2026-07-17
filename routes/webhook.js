const express = require('express');
const router = express.Router();
const { handleWebhook } = require('../controllers/webhookController');

// POST /telehook (akan dipanggil oleh Nginx dari /maghrib_mengaji/telehook)
router.post('/telehook', handleWebhook);

export default router;