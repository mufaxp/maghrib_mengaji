import { post } from 'axios';
import { TELEGRAM_API_BASE } from '../config/telegram';
import { welcomeMessage } from '../views/messageView';

/**
 * Mengirim pesan teks ke chat tertentu melalui Telegram Bot API
 * @param {number|string} chatId
 * @param {string} text
 */
async function sendMessage(chatId, text) {
  const url = `${TELEGRAM_API_BASE}/sendMessage`;
  try {
    await post(url, {
      chat_id: chatId,
      text: text
    });
  } catch (error) {
    console.error('Error sending message:', error.response?.data || error.message);
  }
}

/**
 * Menangani update yang diterima dari webhook
 * @param {object} req - Objek request Express
 * @param {object} res - Objek response Express
 */
async function handleWebhook(req, res) {
  try {
    const update = req.body;

    // Cek apakah update berisi pesan dan teks pesan
    if (update.message && update.message.text) {
      const message = update.message;
      const chatId = message.chat.id;
      const text = message.text.trim();

      // Perintah /start
      if (text === '/start') {
        const reply = welcomeMessage();
        await sendMessage(chatId, reply);
      }
      // Di sini nanti bisa ditambah perintah lain
    }

    // Selalu kirim status 200 ke Telegram supaya tidak kirim ulang
    res.sendStatus(200);
  } catch (error) {
    console.error('Error handling webhook:', error);
    res.sendStatus(500);
  }
}

export default {
  handleWebhook
};