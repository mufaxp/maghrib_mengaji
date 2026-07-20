// controllers/webhookController.js
import axios from 'axios';
import { TELEGRAM_API_BASE } from '../config/telegram.js';
import {
  welcomeMessage,
  levelSelectionMessage,
  classSelectionMessage,
  studentSelectionMessage,
  studentSelectedMessage
} from '../views/messageView.js';
import { getLevels, getClassesByLevel } from '../models/classModel.js';
import { getStudentsByClassId } from '../models/studentModel.js';

/**
 * Mengirim pesan teks (tanpa keyboard) atau dengan keyboard.
 * @param {number|string} chatId
 * @param {string} text
 * @param {object} [replyMarkup] - keyboard markup opsional
 */
async function sendMessage(chatId, text, replyMarkup = null) {
  const url = `${TELEGRAM_API_BASE}/sendMessage`;
  try {
    await axios.post(url, {
      chat_id: chatId,
      text: text,
      reply_markup: replyMarkup
    });
  } catch (error) {
    console.error('Error sending message:', error.response?.data || error.message);
  }
}

/**
 * Menjawab callback query agar spinner di tombol berhenti.
 * @param {string} callbackQueryId
 * @param {string} [text] - notifikasi opsional (tidak muncul ke user)
 */
async function answerCallbackQuery(callbackQueryId, text) {
  const url = `${TELEGRAM_API_BASE}/answerCallbackQuery`;
  try {
    await axios.post(url, {
      callback_query_id: callbackQueryId,
      text: text
    });
  } catch (error) {
    console.error('Error answerCallbackQuery:', error.response?.data || error.message);
  }
}

/**
 * Menangani update yang diterima dari webhook.
 */
export async function handleWebhook(req, res) {
  try {
    const update = req.body;

    // Tangani pesan biasa
    if (update.message && update.message.text) {
      const message = update.message;
      const chatId = message.chat.id;
      const text = message.text.trim();

      if (text === '/start') {
        const { text: replyText, reply_markup } = welcomeMessage();
        await sendMessage(chatId, replyText, reply_markup);
      }
      // else: abaikan perintah lain
    }

    // Tangani callback query dari inline keyboard
    if (update.callback_query) {
      const callbackQuery = update.callback_query;
      const chatId = callbackQuery.message.chat.id;
      const data = callbackQuery.data;
      const callbackId = callbackQuery.id;

      // Jawab dulu agar spinner hilang
      await answerCallbackQuery(callbackId);

      if (data === 'menu:laporan') {
        const { text: levelText, reply_markup: keyboard } = levelSelectionMessage();
        await sendMessage(chatId, levelText, keyboard);
      } else if (data.startsWith('level:')) {
        const level = data.split(':')[1]; // X, XI, XII
        const classes = await getClassesByLevel(level);
        if (classes.length === 0) {
          await sendMessage(chatId, 'Tidak ada kelas tersedia untuk jenjang ini.');
        } else {
          const { text: classText, reply_markup: keyboard } = classSelectionMessage(classes);
          await sendMessage(chatId, classText, keyboard);
        }
      } else if (data.startsWith('class:')) {
        const classId = parseInt(data.split(':')[1], 10);
        const students = await getStudentsByClassId(classId);
        if (students.length === 0) {
          await sendMessage(chatId, 'Belum ada siswa terdaftar di kelas ini.');
        } else {
          const { text: studentText, reply_markup: keyboard } = studentSelectionMessage(students);
          await sendMessage(chatId, studentText, keyboard);
        }
      } else if (data.startsWith('student:')) {
        const studentId = parseInt(data.split(':')[1], 10);
        
        // Dapatkan nama siswa dari database untuk menampilkan pesan konfirmasi
        const { getStudentById } = await import('../models/studentModel.js');
        const student = await getStudentById(studentId);
        if (student) {
          await sendMessage(chatId, studentSelectedMessage(student.full_name));
        } else {
          await sendMessage(chatId, 'Data siswa tidak ditemukan.');
        }
      }
    }

    res.sendStatus(200);
  } catch (error) {
    console.error('Error handling webhook:', error);
    res.sendStatus(500);
  }
}