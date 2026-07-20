import path from 'path';
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
import { getStudentsByClassId, getStudentById, getClassNameById } from '../models/studentModel.js';
import { getTeacherByTelegramId } from '../models/teacherModel.js';
import { createReport, getTodayReportsByClass } from '../models/reportModel.js';
import { processPhoto, processVoice } from '../helpers/mediaHelper.js';
import { getTodayReportDetailsByClass } from '../models/reportModel.js';
import { sendPhotoToTelegram } from '../helpers/photoSender.js';
import { sendVoiceToTelegram } from '../helpers/voiceSender.js';

// State sementara
const userStates = new Map();

async function sendMessage(chatId, text, replyMarkup) {
  const url = `${TELEGRAM_API_BASE}/sendMessage`;
  const body = { chat_id: chatId, text: text };
  if (replyMarkup) body.reply_markup = replyMarkup;
  try {
    await axios.post(url, body);
  } catch (error) {
    console.error('Error sending message:', error.response?.data || error.message);
  }
}

async function answerCallbackQuery(callbackQueryId, text) {
  const url = `${TELEGRAM_API_BASE}/answerCallbackQuery`;
  try {
    await axios.post(url, { callback_query_id: callbackQueryId, text: text });
  } catch (error) {
    console.error('Error answerCallbackQuery:', error.response?.data || error.message);
  }
}

export async function handleWebhook(req, res) {
  try {
    const update = req.body;

    // --- Pesan teks ---
    if (update.message && update.message.text) {
      const message = update.message;
      const chatId = message.chat.id;
      const text = message.text.trim();

      if (text === '/start') {
        const { text: replyText, reply_markup } = welcomeMessage();
        await sendMessage(chatId, replyText, reply_markup);
      }
      // Fitur guru: /pa
      else if (text === '/pa') {
        const teacher = await getTeacherByTelegramId(chatId);
        if (!teacher) {
          await sendMessage(chatId, 'Anda tidak terdaftar sebagai wali kelas.');
        } else {
          const panggilan = teacher.gender === 0 ? 'Bu' : 'Pak';
          const greetings = `Assalamu'alaikum ${panggilan} ${teacher.full_name},`;
          const siswaList = await getTodayReportsByClass(teacher.class_id);
          let reportText = '';
          if (siswaList.length > 0) {
            reportText = siswaList.map((name, idx) => `${idx+1}. ${name}`).join('\n');
          } else {
            reportText = 'Belum ada siswa yang mengirim laporan hari ini.';
          }
          const fullText = `${greetings} berikut ini laporan Maghrib Mengaji siswa kelas ${teacher.class_name} hari ini:\n${reportText}`;
          await sendMessage(chatId, fullText);
        }
      } else if (text === '/laporan') {
        try {
          const teacher = await getTeacherByTelegramId(chatId);
          if (!teacher) {
            await sendMessage(chatId, 'Anda tidak terdaftar sebagai wali kelas.');
          } else {
            const reports = await getTodayReportDetailsByClass(teacher.class_id);
            if (reports.length === 0) {
              await sendMessage(chatId, 'Belum ada laporan Maghrib Mengaji untuk kelas Anda hari ini.');
            } else {
              await sendMessage(chatId, `Mengirim ${reports.length} laporan Maghrib Mengaji kelas ${teacher.class_name} hari ini...`);
                            for (const report of reports) {
                const fullPath = path.join('uploads', report.file_path);
                const ext = path.extname(report.file_path).toLowerCase();
                try {
                  if (['.webp', '.jpg', '.jpeg', '.png'].includes(ext)) {
                    await sendPhotoToTelegram(chatId, fullPath, `${report.full_name}`);
                  } else if (['.ogg', '.oga', '.mp3', '.wav'].includes(ext)) {
                    await sendVoiceToTelegram(chatId, fullPath, `${report.full_name}`);
                  } else {
                    await sendMessage(chatId, `⚠️ Format file tidak didukung untuk ${report.full_name}.`);
                  }
                } catch (err) {
                  await sendMessage(chatId, `⚠️ Gagal mengirim file untuk ${report.full_name}.`);
                }
                await new Promise(resolve => setTimeout(resolve, 300));
              }
              await sendMessage(chatId, '✅ Semua foto telah dikirim.');
            }
          }
        } catch (error) {
          console.error('Error pada perintah /foto:', error);
          await sendMessage(chatId, '❌ Terjadi kesalahan saat mengambil laporan foto. Silakan coba lagi nanti.');
        }
      }
    }

    // --- Media masuk (foto atau voice) ---
    if (update.message && (update.message.photo || update.message.voice)) {
      const message = update.message;
      const chatId = message.chat.id;
      const state = userStates.get(chatId);
      if (state && state.step === 'awaiting_media') {
        const { student_id, className, studentName } = state;
        try {
          let fileName;
          if (message.photo) {
            fileName = await processPhoto(message.photo, className, studentName);
          } else if (message.voice) {
            fileName = await processVoice(message.voice, className, studentName);
          }
          await createReport(student_id, fileName);
          await sendMessage(chatId, `✅ Laporan berhasil dikirim. Terima kasih, ${studentName}.`);
        } catch (error) {
          console.error('Error processing media:', error);
          await sendMessage(chatId, 'Maaf, terjadi kesalahan saat memproses file. Silakan coba lagi.');
        }
        userStates.delete(chatId);
      } else {
        await sendMessage(chatId, 'Silakan pilih menu Laporan Maghrib Mengaji terlebih dahulu untuk mengirim laporan.');
      }
    }

    // --- Callback query ---
    if (update.callback_query) {
      const callbackQuery = update.callback_query;
      const chatId = callbackQuery.message.chat.id;
      const data = callbackQuery.data;
      const callbackId = callbackQuery.id;
      await answerCallbackQuery(callbackId);

      if (data === 'menu:laporan') {
        const { text: levelText, reply_markup: keyboard } = levelSelectionMessage();
        await sendMessage(chatId, levelText, keyboard);
      } else if (data.startsWith('level:')) {
        const level = data.split(':')[1];
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
        const student = await getStudentById(studentId);
        if (!student) {
          await sendMessage(chatId, 'Data siswa tidak ditemukan.');
        } else {
          // Dapatkan nama kelas untuk penamaan file nanti
          const classData = await getStudentsByClassId(student.class_id); 

          const className = await getClassNameById(student.class_id);
          
          // Simpan state untuk menunggu upload foto
          userStates.set(chatId, {
          student_id: student.id,
          class_id: student.class_id,
          className: className,
          studentName: student.full_name,
          step: 'awaiting_media'  // ganti dari 'awaiting_photo'
        });

        await sendMessage(chatId, `Silakan kirim foto atau voice note kegiatan Maghrib Mengaji Anda, ${student.full_name}.`);
        }
      }
    }

    res.sendStatus(200);
  } catch (error) {
    console.error('Error handling webhook:', error);
    res.sendStatus(500);
  }
}