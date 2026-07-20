import axios from 'axios';
import sharp from 'sharp';
import path from 'path';
import fs from 'fs/promises';
import { TELEGRAM_API_BASE, TELEGRAM_BOT_TOKEN } from '../config/telegram.js';

/**
 * Mengunduh dan mengonversi foto ke WebP.
 * @param {object[]} photoArray - array foto dari message.photo
 * @param {string} className
 * @param {string} studentName
 * @returns {Promise<string>} nama file
 */
export async function processPhoto(photoArray, className, studentName) {
  const largestPhoto = photoArray.reduce((prev, curr) =>
    (curr.file_size || 0) > (prev.file_size || 0) ? curr : prev
  );
  const filePath = await getTelegramFilePath(largestPhoto.file_id);
  const downloadUrl = `https://api.telegram.org/file/bot${TELEGRAM_BOT_TOKEN}/${filePath}`;
  const imageRes = await axios.get(downloadUrl, { responseType: 'arraybuffer' });
  const webpBuffer = await sharp(Buffer.from(imageRes.data))
    .webp({ quality: 80 })
    .toBuffer();

  const safeClassName = className.replace(/\s+/g, '_');
  const safeStudentName = studentName.replace(/\s+/g, '_');
  const timestamp = Date.now();
  const fileName = `${safeClassName}_${safeStudentName}_${timestamp}.webp`;

  await saveFile(fileName, webpBuffer);
  return fileName;
}

/**
 * Mengunduh voice note dan menyimpannya (format asli .oga/.ogg).
 * @param {object} voice - objek voice dari message.voice
 * @param {string} className
 * @param {string} studentName
 * @returns {Promise<string>} nama file
 */
export async function processVoice(voice, className, studentName) {
  const filePath = await getTelegramFilePath(voice.file_id);
  const downloadUrl = `https://api.telegram.org/file/bot${TELEGRAM_BOT_TOKEN}/${filePath}`;
  const response = await axios.get(downloadUrl, { responseType: 'arraybuffer' });
  const buffer = Buffer.from(response.data);

  const safeClassName = className.replace(/\s+/g, '_');
  const safeStudentName = studentName.replace(/\s+/g, '_');
  const timestamp = Date.now();
  // Ekstensi bisa dari voice.mime_type? Biasanya 'audio/ogg' -> .ogg
  const ext = voice.mime_type === 'audio/ogg' ? '.ogg' : '.oga';
  const fileName = `${safeClassName}_${safeStudentName}_${timestamp}${ext}`;

  await saveFile(fileName, buffer);
  return fileName;
}

// ---------- fungsi internal ----------

async function getTelegramFilePath(fileId) {
  const url = `${TELEGRAM_API_BASE}/getFile?file_id=${fileId}`;
  const res = await axios.get(url);
  if (!res.data.ok) throw new Error('Gagal mendapatkan file path');
  return res.data.result.file_path;
}

async function saveFile(fileName, buffer) {
  const uploadDir = path.resolve('uploads');
  await fs.mkdir(uploadDir, { recursive: true });
  await fs.writeFile(path.join(uploadDir, fileName), buffer);
}