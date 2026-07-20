/**
 * Membuat tombol inline keyboard dari array data.
 * @param {Array} items - array objek { text, callback_data }
 * @param {number} columns - jumlah kolom per baris (default 2)
 * @returns {object} - objek reply_markup untuk Telegram
 */
function buildInlineKeyboard(items, columns = 2) {
  const keyboard = [];
  for (let i = 0; i < items.length; i += columns) {
    const row = items.slice(i, i + columns).map(item => ({
      text: item.text,
      callback_data: item.callback_data
    }));
    keyboard.push(row);
  }
  return { inline_keyboard: keyboard };
}

/**
 * Tombol utama "Laporan Maghrib Mengaji" setelah /start.
 */
export function welcomeMessage() {
  const text = "Assalamu'alaikum, selamat datang di layanan Laporan Maghrib Mengaji.";
  const keyboard = buildInlineKeyboard([
    { text: '📋 Laporan Maghrib Mengaji', callback_data: 'menu:laporan' }
  ], 1);
  return { text, reply_markup: keyboard };
}

/**
 * Pesan pilih jenjang dengan tombol X, XI, XII.
 */
export function levelSelectionMessage() {
  const text = 'Pilih jenjang kelas Anda:';
  const keyboard = buildInlineKeyboard([
    { text: 'X', callback_data: 'level:X' },
    { text: 'XI', callback_data: 'level:XI' },
    { text: 'XII', callback_data: 'level:XII' }
  ], 3);
  return { text, reply_markup: keyboard };
}

/**
 * Pesan pilih kelas berdasarkan daftar kelas.
 * @param {Array} classes - array { id, name }
 */
export function classSelectionMessage(classes) {
  const text = 'Pilih kelas Anda:';
  const items = classes.map(c => ({
    text: c.name,
    callback_data: `class:${c.id}`
  }));
  const keyboard = buildInlineKeyboard(items, 4); // bisa 4 kolom agar ringkas
  return { text, reply_markup: keyboard };
}

/**
 * Pesan pilih siswa berdasarkan daftar siswa.
 * @param {Array} students - array { id, full_name }
 */
export function studentSelectionMessage(students) {
  const text = 'Pilih nama Anda:';
  const items = students.map(s => ({
    text: s.full_name,
    callback_data: `student:${s.id}`
  }));
  const keyboard = buildInlineKeyboard(items, 2);
  return { text, reply_markup: keyboard };
}

/**
 * Pesan akhir, menyebutkan nama siswa yang dipilih.
 * @param {string} fullName
 */
export function studentSelectedMessage(fullName) {
  return `Terima kasih, ${fullName}. Anda telah memilih nama. (Fitur upload foto akan menyusul)`;
}