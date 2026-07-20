import axios from 'axios';
import FormData from 'form-data';
import fs from 'fs';
import { TELEGRAM_API_BASE } from '../config/telegram.js';

export async function sendVoiceToTelegram(chatId, filePath, caption) {
  const url = `${TELEGRAM_API_BASE}/sendVoice`;
  const form = new FormData();
  form.append('chat_id', chatId);
  form.append('voice', fs.createReadStream(filePath));
  if (caption) form.append('caption', caption);
  try {
    await axios.post(url, form, { headers: form.getHeaders() });
  } catch (error) {
    console.error('Error sending voice:', error.response?.data || error.message);
    throw error;
  }
}