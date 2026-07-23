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
import {
  getTeacherByUsername,
  getTeacherByClassId,
  updateTeacherByClassId,
  moveTeacher,
} from '../models/teacherModel.js';
import {
  createReport,
  getTodayReportsByClass,
  getTodayReportDetailsByClass,
  hasReportedToday,
  deleteTodayReport,
  getTodayReportFilePath,
} from '../models/reportModel.js';
import { processPhoto, processVoice, deleteLocalFile } from '../helpers/mediaHelper.js';
import { sendPhotoToTelegram } from '../helpers/photoSender.js';
import { sendVoiceToTelegram } from '../helpers/voiceSender.js';
import {
  getStudentsByClassId,
  getStudentById,
  getClassNameById,
  insertStudents,
} from '../models/studentModel.js';

State 
const userStates = new Map();
const STATE_TTL = 60 * 60 * 1000; // 60 menit

function setUserState(chatId, data) {
  clearUserState(chatId);
  const timeoutId = setTimeout(() => {
    userStates.delete(chatId);
    console.log(`State untuk chatId ${chatId} dihapus karena TTL.`);
  }, STATE_TTL);
  userStates.set(chatId, { ...data, timeoutId });
}

function clearUserState(chatId) {
  const state = userStates.get(chatId);
  if (state && state.timeoutId) {
    clearTimeout(state.timeoutId);
  }
  userStates.delete(chatId);
}

// Utilitas 
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

function getUsernameFromUpdate(update) {
  if (update.message) return update.message.from?.username;
  if (update.callback_query) return update.callback_query.from?.username;
  return null;
}

// Background task 
async function sendReportsInBackground(chatId, reports) {
  for (const report of reports) {
    const fullPath = path.join('uploads', report.file_path);
    const ext = path.extname(report.file_path).toLowerCase();
    try {
      if (['.jpg', '.jpeg', '.png'].includes(ext)) {
        await sendPhotoToTelegram(chatId, fullPath, `${report.full_name}`);
      } else if (['.ogg', '.oga', '.mp3', '.wav'].includes(ext)) {
        await sendVoiceToTelegram(chatId, fullPath, `${report.full_name}`);
      } else {
        await sendMessage(chatId, `⚠️ Format file tidak didukung untuk ${report.full_name}.`).catch(() => {});
      }
    } catch (err) {
      await sendMessage(chatId, `⚠️ Gagal mengirim file untuk ${report.full_name}.`).catch(() => {});
    }
    await new Promise(resolve => setTimeout(resolve, 350));
  }
  await sendMessage(chatId, '✅ Semua data laporan telah dikirim.').catch(() => {});
}

// Proses Update 
async function processUpdate(update) {
  const username = getUsernameFromUpdate(update);
  const adminUsernames = process.env.ADMIN_USERNAMES
    ? process.env.ADMIN_USERNAMES.split(',').map(u => u.trim())
    : [];

  // Pesan teks 
  if (update.message && update.message.text) {
    const message = update.message;
    const chatId = message.chat.id;
    const text = message.text.trim();

    if (text === '/start') {
      const { text: replyText, reply_markup } = welcomeMessage();
      await sendMessage(chatId, replyText, reply_markup);
    }
    else if (text === '/list') {
      if (!username) {
        await sendMessage(chatId, 'Akun Telegram Anda tidak memiliki username. Silakan set username terlebih dahulu agar dapat menggunakan fitur guru.');
        return;
      }
      const teacher = await getTeacherByUsername(username);
      if (!teacher) {
        await sendMessage(chatId, 'Anda tidak terdaftar sebagai wali kelas.');
        return;
      }
      const allStudents = await getStudentsByClassId(teacher.class_id);
      const reportedNames = await getTodayReportsByClass(teacher.class_id);
      const reportedSet = new Set(reportedNames);
      const notReported = allStudents.filter(s => !reportedSet.has(s.full_name)).map(s => s.full_name);

      const panggilan = teacher.gender === 0 ? 'Bu' : 'Pak';
      let messageText = `Assalamu'alaikum ${panggilan} ${teacher.full_name},\n`;
      messageText += `berikut laporan Maghrib Mengaji siswa kelas ${teacher.class_name} hari ini:\n\n`;

      if (reportedNames.length > 0) {
        messageText += `✅ Sudah melapor (${reportedNames.length}):\n`;
        messageText += reportedNames.map((name, i) => `${i+1}. ${name}`).join('\n');
      } else {
        messageText += `✅ Sudah melapor: (belum ada)\n`;
      }

      messageText += `\n\n❌ Belum melapor (${notReported.length}):\n`;
      if (notReported.length > 0) {
        messageText += notReported.map((name, i) => `${i+1}. ${name}`).join('\n');
      } else {
        messageText += `(semua sudah melapor 🎉)`;
      }

      await sendMessage(chatId, messageText);
    }
    else if (text === '/laporan') {
      if (!username) {
        await sendMessage(chatId, 'Akun Telegram Anda tidak memiliki username. Silakan set username terlebih dahulu agar dapat menggunakan fitur guru.');
        return;
      }
      const teacher = await getTeacherByUsername(username);
      if (!teacher) {
        await sendMessage(chatId, 'Anda tidak terdaftar sebagai wali kelas.');
        return;
      }
      const reports = await getTodayReportDetailsByClass(teacher.class_id);
      if (reports.length === 0) {
        await sendMessage(chatId, 'Belum ada laporan Maghrib Mengaji untuk kelas Anda hari ini.');
      } else {
        await sendMessage(chatId, `Mengirim ${reports.length} laporan Maghrib Mengaji kelas ${teacher.class_name} hari ini...`);
        sendReportsInBackground(chatId, reports);
      }
    }
    else if (text === '/tambah') {
      if (!username) {
        await sendMessage(chatId, 'Akun Telegram Anda tidak memiliki username. Silakan set username terlebih dahulu agar dapat menggunakan fitur guru.');
        return;
      }
      const teacher = await getTeacherByUsername(username);
      if (!teacher) {
        await sendMessage(chatId, '❌ Hanya wali kelas yang dapat menambahkan siswa.');
        return;
      }
      setUserState(chatId, {
        step: 'awaiting_student_names',
        class_id: teacher.class_id,
      });
      await sendMessage(chatId, `📝 Silakan kirim daftar nama siswa kelas ${teacher.class_name} yang ingin ditambahkan.\nTulis satu nama per baris.`);
    }
    else if (text === '/hapus') {
      const currentState = userStates.get(chatId);
      const lastData = currentState?.lastStudent;
      if (lastData) {
        const filePath = await getTodayReportFilePath(lastData.student_id);
        if (filePath) {
          await deleteLocalFile(filePath);
        }
        const deleted = await deleteTodayReport(lastData.student_id);
        if (deleted) {
          setUserState(chatId, {
            student_id: lastData.student_id,
            class_id: lastData.class_id,
            className: lastData.className,
            studentName: lastData.studentName,
            step: 'awaiting_media',
            lastStudent: lastData,
          });
          await sendMessage(chatId, `Laporan hari ini untuk ${lastData.studentName} telah dihapus. Silakan kirimkan ulang laporannya!`);
        } else {
          await sendMessage(chatId, `${lastData.studentName} belum memiliki laporan hari ini.`);
          clearUserState(chatId);
        }
      } else {
        const { text: levelText, reply_markup: keyboard } = levelSelectionMessage();
        await sendMessage(chatId, levelText, keyboard);
        setUserState(chatId, { step: 'deleting_report' });
      }
    }
    else if (text === '/gantiwalas') {
      if (!username || !adminUsernames.includes(username)) {
        await sendMessage(chatId, '❌ Anda tidak memiliki akses admin.');
        return;
      }
      const { text: levelText, reply_markup: keyboard } = levelSelectionMessage();
      await sendMessage(chatId, levelText, keyboard);
      setUserState(chatId, { step: 'ganti_walas_select_level' });
    }
    else if (text === '/pindahwalas') {
      if (!username || !adminUsernames.includes(username)) {
        await sendMessage(chatId, '❌ Anda tidak memiliki akses admin.');
        return;
      }
      await sendMessage(chatId, 'Masukkan username guru yang akan dipindahkan (tanpa @).');
      setUserState(chatId, { step: 'pindah_walas_get_username' });
    }
    else {
      // Cek state lainnya
      const state = userStates.get(chatId);
      if (!state) return;

      if (state.step === 'awaiting_student_names') {
        const classId = state.class_id;
        const names = text.split('\n').map(n => n.trim()).filter(n => n.length > 0);
        if (names.length === 0) {
          await sendMessage(chatId, '⚠️ Tidak ada nama yang valid. Kirim ulang dengan satu nama per baris.');
          return;
        }
        try {
          await insertStudents(classId, names);
          await sendMessage(chatId, `✅ Berhasil menambahkan ${names.length} siswa ke dalam kelas.`);
        } catch (error) {
          console.error('Error menambahkan siswa:', error);
          await sendMessage(chatId, '❌ Gagal menambahkan siswa. Pastikan format benar dan tidak ada duplikasi.');
        }
        clearUserState(chatId);
      }
      else if (state.step === 'awaiting_new_teacher_name') {
        const name = text.trim();
        if (!name) {
          await sendMessage(chatId, 'Nama tidak valid. Silakan ketik nama guru pengganti.');
          return;
        }
        setUserState(chatId, { ...state, step: 'awaiting_new_teacher_gender', newTeacherName: name });
        await sendMessage(chatId, 'Tulis jenis kelaminnya (L/P)');
      }
      else if (state.step === 'awaiting_new_teacher_gender') {
        const genderInput = text.trim().toUpperCase();
        if (genderInput !== 'L' && genderInput !== 'P') {
          await sendMessage(chatId, 'Jenis kelamin tidak valid. Ketik L (Laki-laki) atau P (Perempuan).');
          return;
        }
        const gender = genderInput === 'L' ? 1 : 0;
        setUserState(chatId, { ...state, step: 'awaiting_new_teacher_username', newTeacherGender: gender });
        await sendMessage(chatId, 'Tulis username Telegram guru tersebut (tanpa @).');
      }
      else if (state.step === 'awaiting_new_teacher_username') {
        const newUsername = text.trim().replace('@', '');
        if (!newUsername) {
          await sendMessage(chatId, 'Username tidak valid. Silakan ketik username Telegram guru tanpa @.');
          return;
        }
        try {
          await updateTeacherByClassId(state.class_id, state.newTeacherName, state.newTeacherGender, newUsername);
          const className = await getClassNameById(state.class_id);
          const panggilan = state.newTeacherGender === 0 ? 'Bu' : 'Pak';
          await sendMessage(chatId, `✅ Wali kelas ${className} berhasil diperbarui menjadi ${panggilan} ${state.newTeacherName} (@${newUsername}).`);
        } catch (error) {
          console.error('Error update teacher:', error);
          await sendMessage(chatId, '❌ Gagal memperbarui wali kelas. Pastikan username valid dan belum terdaftar untuk guru lain.');
        }
        clearUserState(chatId);
      }
      else if (state.step === 'pindah_walas_get_username') {
        const targetUsername = text.trim().replace('@', '');
        const guru = await getTeacherByUsername(targetUsername);
        if (!guru) {
          await sendMessage(chatId, '❌ Guru dengan username tersebut tidak ditemukan.');
          clearUserState(chatId);
          return;
        }
        // Simpan data guru pindahan
        setUserState(chatId, {
          step: 'pindah_walas_select_level',
          movedUsername: targetUsername,
          movedFullName: guru.full_name,
          movedGender: guru.gender,
        });
        const { text: levelText, reply_markup: keyboard } = levelSelectionMessage();
        await sendMessage(chatId, levelText, keyboard);
      }
    }
  }

  // Media masuk
  if (update.message && (update.message.photo || update.message.voice)) {
    const message = update.message;
    const chatId = message.chat.id;
    const state = userStates.get(chatId);
    if (state && state.step === 'awaiting_media') {
      const { student_id, className, studentName } = state;
      const alreadyReported = await hasReportedToday(student_id);
      if (alreadyReported) {
        await sendMessage(chatId, `⚠️ Anda sudah mengirim laporan hari ini. Jika ingin mengganti, kirim /hapus terlebih dahulu.`);
        clearUserState(chatId);
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
      clearUserState(chatId);
    } else {
      await sendMessage(chatId, 'Silakan pilih menu Laporan Maghrib Mengaji terlebih dahulu untuk mengirim laporan.');
    }
  }

  // Callback query
  if (update.callback_query) {
    const callbackQuery = update.callback_query;
    const chatId = callbackQuery.message.chat.id;
    const data = callbackQuery.data;
    const callbackId = callbackQuery.id;
    await answerCallbackQuery(callbackId);

    const state = userStates.get(chatId);

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
      // Mode pindah walas: pilih jenjang setelah username didapat
      if (state && state.step === 'pindah_walas_select_level') {
        const classes = await getClassesByLevel(level);
        if (classes.length === 0) {
          await sendMessage(chatId, 'Tidak ada kelas di jenjang ini.');
        } else {
          const { text: classText, reply_markup: keyboard } = classSelectionMessage(classes);
          await sendMessage(chatId, classText, keyboard);
          setUserState(chatId, { ...state, step: 'pindah_walas_select_class' });
        }
        return;
      }
      // Mode ganti walas
      if (state && state.step === 'ganti_walas_select_level') {
        const classes = await getClassesByLevel(level);
        if (classes.length === 0) {
          await sendMessage(chatId, 'Tidak ada kelas di jenjang ini.');
        } else {
          const { text: classText, reply_markup: keyboard } = classSelectionMessage(classes);
          await sendMessage(chatId, classText, keyboard);
          setUserState(chatId, { step: 'ganti_walas_select_class' });
        }
        return;
      }
      // Mode normal
      const classes = await getClassesByLevel(level);
      if (classes.length === 0) {
        await sendMessage(chatId, 'Tidak ada kelas tersedia untuk jenjang ini.');
      } else {
        const { text: classText, reply_markup: keyboard } = classSelectionMessage(classes);
        await sendMessage(chatId, classText, keyboard);
      }
    } else if (data.startsWith('class:')) {
      const classId = parseInt(data.split(':')[1], 10);
      // Mode pindah walas
      if (state && state.step === 'pindah_walas_select_class') {
        try {
          const result = await moveTeacher(state.movedUsername, classId);
          const movedGender = result.movedTeacher.gender === 0 ? 'Bu' : 'Pak';
          let oldInfo = '';
          if (result.oldTarget) {
            const oldGender = result.oldTarget.gender === 0 ? 'Bu' : 'Pak';
            oldInfo = `dari ${oldGender} ${result.oldTarget.full_name}`;
          } else {
            oldInfo = `dari (tidak ada)`;
          }
          await sendMessage(chatId, `✅ Wali kelas ${result.className} telah dirubah ${oldInfo} menjadi ${movedGender} ${result.movedTeacher.full_name}.`);
        } catch (error) {
          console.error('Error pindah walas:', error);
          await sendMessage(chatId, '❌ Gagal memindahkan wali kelas.');
        }
        clearUserState(chatId);
        return;
      }
      // Mode ganti walas
      if (state && state.step === 'ganti_walas_select_class') {
        const teacher = await getTeacherByClassId(classId);
        const className = await getClassNameById(classId);
        if (teacher) {
          const panggilan = teacher.gender === 0 ? 'Bu' : 'Pak';
          await sendMessage(chatId, `Wali kelas ${className} adalah ${panggilan} ${teacher.full_name}. Ketik nama guru penggantinya.`);
        } else {
          await sendMessage(chatId, `Kelas ${className} belum memiliki wali kelas. Ketik nama guru penggantinya.`);
        }
        setUserState(chatId, { step: 'awaiting_new_teacher_name', class_id: classId });
        return;
      }
      // Mode normal
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
        return;
      }
      const className = await getClassNameById(student.class_id);

      if (state && state.step === 'deleting_report') {
        const filePath = await getTodayReportFilePath(studentId);
        if (filePath) {
          await deleteLocalFile(filePath);
        }
        const deleted = await deleteTodayReport(studentId);
        if (deleted) {
          const lastStudentInfo = {
            student_id: student.id,
            class_id: student.class_id,
            className: className,
            studentName: student.full_name,
          };
          setUserState(chatId, {
            student_id: student.id,
            class_id: student.class_id,
            className: className,
            studentName: student.full_name,
            step: 'awaiting_media',
            lastStudent: lastStudentInfo,
          });
          await sendMessage(chatId, `Laporan hari ini untuk ${student.full_name} telah dihapus. Silakan kirimkan ulang laporannya!`);
        } else {
          await sendMessage(chatId, `${student.full_name} belum memiliki laporan hari ini.`);
          clearUserState(chatId);
        }
      } else {
        const lastStudentInfo = {
          student_id: student.id,
          class_id: student.class_id,
          className: className,
          studentName: student.full_name,
        };
        setUserState(chatId, {
          student_id: student.id,
          class_id: student.class_id,
          className: className,
          studentName: student.full_name,
          step: 'awaiting_media',
          lastStudent: lastStudentInfo,
        });
        await sendMessage(chatId, `Silakan kirim foto atau voice note kegiatan Maghrib Mengaji Anda, ${student.full_name}.`);
      }
    }
  }
}

// Handler Webhook
export async function handleWebhook(req, res) {
  res.sendStatus(200);
  const update = req.body;
  if (!update) return;
  processUpdate(update).catch(err => {
    console.error('Error in background processUpdate:', err);
  });
}