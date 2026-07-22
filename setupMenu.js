import dotenv from 'dotenv';
dotenv.config();
import axios from 'axios';
import { TELEGRAM_API_BASE } from './config/telegram.js';

async function setupMenu() {
  try {
    await axios.post(`${TELEGRAM_API_BASE}/setMyCommands`, {
      commands: [
        { command: 'start', description: 'Mulai / tampilkan menu utama' },
        { command: 'list', description: 'Lihat daftar laporan (guru)' },
        { command: 'laporan', description: 'Kirim foto & voice laporan (guru)' },
        { command: 'tambah', description: 'Tambah siswa (guru)' },
        { command: 'hapus', description: 'Hapus laporan hari ini (siswa)' },
      ],
      scope: { type: 'default' }
    });
    console.log('✅ Daftar perintah berhasil diatur.');

    await axios.post(`${TELEGRAM_API_BASE}/setChatMenuButton`, {
      menu_button: { type: 'commands' }
    });
    console.log('✅ Menu button diaktifkan. User bisa mengakses /start dari menu.');
  } catch (error) {
    console.error('❌ Gagal mengatur menu:', error.response?.data || error.message);
  }
}

setupMenu();