// controllers/webhookController.js
import path from 'path';
import axios from 'axios';
import { TELEGRAM_API_BASE } from '../config/telegram.js';
import {
  welcomeMessage,
  levelSelectionMessage,
  classSelectionMessage,
  studentSelectionMessage,
} from '../views/messageView.js';
import { getClassesByLevel } from '../models/classModel.js';
import { getTeacherByUsername } from '../models/teacherModel.js';
import {
  createReport,
  getTodayReportsByClass,
  getTodayReportDetailsByClass,
  hasReportedToday,
  deleteTodayReport,
} from '../models/reportModel.js';
import { processPhoto, processVoice } from '../helpers/mediaHelper.js';
import { sendPhotoToTelegram } from '../helpers/photoSender.js';
import { sendVoiceToTelegram } from '../helpers/voiceSender.js';
import {
  getStudentsByClassId,
  getStudentById,
  getClassNameById,
  insertStudents,
} from '../models/studentModel.js';

// State sementara
const userStates = new Map();
// Menyimpan data siswa terakhir yang dipilih per chatId
const lastSelectedStudent = new Map();

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
    const username = getUsernameFromUpdate(update);

    // --- Pesan teks ---
    if (update.message && update.message.text) {
      const message = update.message;
      const chatId = message.chat.id;
      const text = message.text.trim();

      if (text === '/start') {
        const { text: replyText, reply_markup } = welcomeMessage();
        await sendMessage(chatId, replyText, reply_markup);
      }
      // Fitur guru: /list
      else if (text === '/list') {
        if (!username) {
          await sendMessage(chatId, 'Akun Telegram Anda tidak memiliki username. Silakan set username terlebih dahulu agar dapat menggunakan fitur guru.');
          return;
        }
        const teacher = await getTeacherByUsername(username);
        if (!teacher) {
          await sendMessage(chatId, 'Anda tidak terdaftar sebagai wali kelas.');
        } else {
          const allStudents = await getStudentsByClassId(teacher.class_id);
          const reportedNames = await getTodayReportsByClass(teacher.class_id);

          const reportedSet = new Set(reportedNames);
          const notReported = allStudents.filter(s => !reportedSet.has(s.full_name)).map(s => s.full_name);

          const panggilan = teacher.gender === 0 ? 'Bu' : 'Pak';
          let message = `Assalamu'alaikum ${panggilan} ${teacher.full_name},\n`;
          message += `berikut laporan Maghrib Mengaji siswa kelas ${teacher.class_name} hari ini:\n\n`;

          if (reportedNames.length > 0) {
            message += `✅ Sudah melapor (${reportedNames.length}):\n`;
            message += reportedNames.map((name, i) => `${i+1}. ${name}`).join('\n');
          } else {
            message += `✅ Sudah melapor: (belum ada)\n`;
          }

          message += `\n\n❌ Belum melapor (${notReported.length}):\n`;
          if (notReported.length > 0) {
            message += notReported.map((name, i) => `${i+1}. ${name}`).join('\n');
          } else {
            message += `(semua sudah melapor 🎉)`;
          }

          await sendMessage(chatId, message);
        }
      } else if (text === '/laporan') {
        try {
          if (!username) {
            await sendMessage(chatId, 'Akun Telegram Anda tidak memiliki username. Silakan set username terlebih dahulu agar dapat menggunakan fitur guru.');
            return;
          }
          const teacher = await getTeacherByUsername(username);
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
              await sendMessage(chatId, '✅ Semua data laporan telah dikirim.');
            }
          }
        } catch (error) {
          console.error('Error pada perintah /laporan:', error);
          await sendMessage(chatId, '❌ Terjadi kesalahan saat mengambil laporan. Silakan coba lagi nanti.');
        }
            } else if (text === '/tambah') {
        if (!username) {
          await sendMessage(chatId, 'Akun Telegram Anda tidak memiliki username. Silakan set username terlebih dahulu agar dapat menggunakan fitur guru.');
          return;
        }
        const teacher = await getTeacherByUsername(username);
        if (!teacher) {
          await sendMessage(chatId, '❌ Hanya wali kelas yang dapat menambahkan siswa.');
        } else {
          userStates.set(chatId, {
            step: 'awaiting_student_names',
            class_id: teacher.class_id,
          });
          await sendMessage(chatId, `📝 Silakan kirim daftar nama siswa kelas ${teacher.class_name} yang ingin ditambahkan.\nTulis satu nama per baris.`);
        }
      } else if (text === '/hapus') {
        const lastData = lastSelectedStudent.get(chatId);
        if (lastData) {
          const deleted = await deleteTodayReport(lastData.student_id);
          if (deleted) {
            userStates.set(chatId, {
              student_id: lastData.student_id,
              class_id: lastData.class_id,
              className: lastData.className,
              studentName: lastData.studentName,
              step: 'awaiting_media',
            });
            lastSelectedStudent.set(chatId, { ...lastData });
            await sendMessage(chatId, `🗑️ Laporan hari ini untuk ${lastData.studentName} telah dihapus. Silakan kirimkan ulang laporannya!`);
          } else {
            await sendMessage(chatId, `ℹ️ ${lastData.studentName} belum memiliki laporan hari ini.`);
          }
        } else {
          const { text: levelText, reply_markup: keyboard } = levelSelectionMessage();
          await sendMessage(chatId, levelText, keyboard);
          userStates.set(chatId, { step: 'deleting_report' });
        }
      } else {
        const state = userStates.get(chatId);
        if (state && state.step === 'awaiting_student_names') {
          const classId = state.class_id;
          const names = text.split('\n').map(n => n.trim()).filter(n => n.length > 0);
          if (names.length === 0) {
            await sendMessage(chatId, '⚠️ Tidak ada nama yang valid. Kirim ulang dengan satu nama per baris.');
            return;
          }
          try {
            await insertStudents(classId, names);
            await sendMessage(chatId, `✅ Berhasil menambahkan ${names.length} siswa ke dalam kelas.`);
            userStates.delete(chatId);
          } catch (error) {
            console.error('Error menambahkan siswa:', error);
            await sendMessage(chatId, '❌ Gagal menambahkan siswa. Pastikan format benar dan tidak ada duplikasi.');
          }
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
        const alreadyReported = await hasReportedToday(student_id);
        if (alreadyReported) {
          await sendMessage(chatId, `⚠️ Anda sudah mengirim laporan hari ini. Jika ingin mengganti, kirim /hapus terlebih dahulu.`);
          userStates.delete(chatId);
          res.sendStatus(200);
          return;
        }
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

      if (data === 'menu:siswa') {
        const { text: levelText, reply_markup: keyboard } = levelSelectionMessage();
        await sendMessage(chatId, levelText, keyboard);
      } else if (data === 'menu:guru') {
        await sendMessage(chatId,
          'Anda masuk sebagai Guru. Berikut perintah yang tersedia:\n\n' +
          '/laporan - Melihat foto & voice note laporan siswa hari ini\n' +
          '/list - Daftar siswa yang sudah & belum melapor\n' +
          '/tambah - Menambahkan siswa ke kelas Anda'
        );
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
          const className = await getClassNameById(student.class_id);
          const state = userStates.get(chatId);

          if (state && state.step === 'deleting_report') {
            const deleted = await deleteTodayReport(studentId);
            if (deleted) {
              userStates.set(chatId, {
                student_id: student.id,
                class_id: student.class_id,
                className: className,
                studentName: student.full_name,
                step: 'awaiting_media',
              });
              lastSelectedStudent.set(chatId, {
                student_id: student.id,
                class_id: student.class_id,
                className: className,
                studentName: student.full_name,
              });
              await sendMessage(chatId, `🗑️ Laporan hari ini untuk ${student.full_name} telah dihapus. Silakan kirimkan ulang laporannya!`);
            } else {
              await sendMessage(chatId, `ℹ️ ${student.full_name} belum memiliki laporan hari ini.`);
              userStates.delete(chatId);
            }
          } else {
            userStates.set(chatId, {
              student_id: student.id,
              class_id: student.class_id,
              className: className,
              studentName: student.full_name,
              step: 'awaiting_media',
            });
            lastSelectedStudent.set(chatId, {
              student_id: student.id,
              class_id: student.class_id,
              className: className,
              studentName: student.full_name,
            });
            await sendMessage(chatId, `Silakan kirim foto atau voice note kegiatan Maghrib Mengaji Anda, ${student.full_name}.`);
          }
        }
      }
    }

    res.sendStatus(200);
  } catch (error) {
    console.error('Error handling webhook:', error);
    res.sendStatus(500);
  }
}

function getUsernameFromUpdate(update) {
  if (update.message) return update.message.from?.username;
  if (update.callback_query) return update.callback_query.from?.username;
  return null;
}