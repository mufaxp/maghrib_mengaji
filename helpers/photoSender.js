import axios from 'axios';
import FormData from 'form-data';
import fs from 'fs';
import path from 'path';
import { TELEGRAM_API_BASE } from '../config/telegram.js';

/**
 * Mengirim foto ke chat Telegram dengan caption.
 * @param {number|string} chatId
 * @param {string} filePath - path absolut atau relatif ke file foto (misal: 'uploads/X_1_John_Doe_123456.webp')
 * @param {string} caption - keterangan foto
 */
export async function sendPhotoToTelegram(chatId, filePath, caption) {
  const url = `${TELEGRAM_API_BASE}/sendPhoto`;
  const form = new FormData();
  form.append('chat_id', chatId);
  form.append('photo', fs.createReadStream(filePath));
  form.append('caption', caption);
  // Headers diisi otomatis oleh form-data, tetapi perlu set content-type header
  try {
    await axios.post(url, form, {
      headers: form.getHeaders()
    });
  } catch (error) {
    console.error('Error sending photo:', error.response?.data || error.message);
    throw error; // rethrow untuk penanganan di controller
  }
}