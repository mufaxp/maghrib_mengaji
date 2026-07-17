require('dotenv').config();
import { post } from 'axios';
import { TELEGRAM_API_BASE } from './config/telegram';

const WEBHOOK_URL = 'https://lab.mugalearning.web.id/maghrib_mengaji/telehook';

async function setWebhook() {
  try {
    const url = `${TELEGRAM_API_BASE}/setWebhook`;
    const response = await post(url, {
      url: WEBHOOK_URL
    });
    console.log('Webhook berhasil diatur:', response.data);
  } catch (error) {
    console.error('Gagal mengatur webhook:', error.response?.data || error.message);
  }
}

setWebhook();