import axios from 'axios';
import { TELEGRAM_API_BASE } from '../config/telegram.js';
import { welcomeMessage } from '../views/messageView.js';

async function sendMessage(chatId, text) {
  const url = `${TELEGRAM_API_BASE}/sendMessage`;
  try {
    await axios.post(url, {
      chat_id: chatId,
      text: text
    });
  } catch (error) {
    console.error('Error sending message:', error.response?.data || error.message);
  }
}

export async function handleWebhook(req, res) {
  try {
    const update = req.body;

    if (update.message && update.message.text) {
      const message = update.message;
      const chatId = message.chat.id;
      const text = message.text.trim();

      if (text === '/start') {
        const reply = welcomeMessage();
        await sendMessage(chatId, reply);
      }
    }

    res.sendStatus(200);
  } catch (error) {
    console.error('Error handling webhook:', error);
    res.sendStatus(500);
  }
}