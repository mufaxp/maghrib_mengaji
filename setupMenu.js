import dotenv from 'dotenv';
dotenv.config();
import axios from 'axios';
import { TELEGRAM_API_BASE } from './config/telegram.js';

async function setupMenu() {
  try {
    await axios.post(`${TELEGRAM_API_BASE}/setMyCommands`, {
      commands: [
        { command: 'start', description: 'Mulai' }
      ],
      scope: { type: 'default' }
    });
    console.log('✅ Daftar perintah diatur: hanya /start.');

    await axios.post(`${TELEGRAM_API_BASE}/setChatMenuButton`, {
      menu_button: { type: 'commands' }
    });
    console.log('✅ Menu button diaktifkan. User hanya melihat tombol Mulai.');
  } catch (error) {
    console.error('❌ Gagal mengatur menu:', error.response?.data || error.message);
  }
}

setupMenu();