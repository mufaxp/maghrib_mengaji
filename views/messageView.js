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

export function welcomeMessage() {
  const text = "Assalamu'alaikum, selamat datang di layanan Laporan Maghrib Mengaji. Silakan pilih peran Anda:";
  const keyboard = buildInlineKeyboard([
    { text: 'Siswa', callback_data: 'menu:siswa' },
    { text: 'Guru', callback_data: 'menu:guru' }
  ], 2);
  return { text, reply_markup: keyboard };
}

export function levelSelectionMessage() {
  const text = 'Pilih jenjang kelas Anda:';
  const keyboard = buildInlineKeyboard([
    { text: 'X', callback_data: 'level:X' },
    { text: 'XI', callback_data: 'level:XI' },
    { text: 'XII', callback_data: 'level:XII' }
  ], 3);
  return { text, reply_markup: keyboard };
}

export function classSelectionMessage(classes) {
  const text = 'Pilih kelas Anda:';
  const items = classes.map(c => ({
    text: c.name,
    callback_data: `class:${c.id}`
  }));
  const keyboard = buildInlineKeyboard(items, 4);
  return { text, reply_markup: keyboard };
}

export function studentSelectionMessage(students) {
  const text = 'Pilih nama Anda:';
  const items = students.map(s => ({
    text: s.full_name,
    callback_data: `student:${s.id}`
  }));
  const keyboard = buildInlineKeyboard(items, 2);
  return { text, reply_markup: keyboard };
}

export function startButtonKeyboard() {
  const keyboard = buildInlineKeyboard([
    { text: 'Mulai', callback_data: 'menu:start' }
  ], 1);
  return { reply_markup: keyboard };
}