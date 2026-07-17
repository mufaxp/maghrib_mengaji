// setWebhook.js
import dotenv from 'dotenv';
dotenv.config();

import axios from 'axios';
import { TELEGRAM_API_BASE } from './config/telegram.js';

const WEBHOOK_URL = 'https://lab.mugalearning.web.id/maghrib_mengaji/telehook';

async function setWebhook() {
  try {
    const url = `${TELEGRAM_API_BASE}/setWebhook`;
    const response = await axios.post(url, { url: WEBHOOK_URL });
    console.log('Webhook berhasil diatur:', response.data);
  } catch (error) {
    console.error('Gagal mengatur webhook:', error.response?.data || error.message);
  }
}

setWebhook();