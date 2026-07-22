// helpers/mediaHelper.js
import axios from 'axios';
import sharp from 'sharp';
import path from 'path';
import fs from 'fs/promises';
import { TELEGRAM_API_BASE, TELEGRAM_BOT_TOKEN } from '../config/telegram.js';

sharp.concurrency(1);

async function getTelegramFilePath(fileId) {
  const url = `${TELEGRAM_API_BASE}/getFile?file_id=${fileId}`;
  const res = await axios.get(url);
  if (!res.data?.ok) throw new Error('Gagal mendapatkan file path dari Telegram');
  return res.data.result.file_path;
}

async function saveFile(fileName, buffer) {
  const uploadDir = path.resolve('uploads');
  await fs.mkdir(uploadDir, { recursive: true });
  await fs.writeFile(path.join(uploadDir, fileName), buffer);
}

/**
 * Hapus file fisik dari folder uploads.
 * @param {string} fileName - nama file yang akan dihapus
 */
export async function deleteLocalFile(fileName) {
  if (!fileName) return;
  try {
    const filePath = path.resolve('uploads', fileName);
    await fs.unlink(filePath);
    console.log(`File ${fileName} berhasil dihapus dari server.`);
  } catch (err) {
    if (err.code !== 'ENOENT') {
      console.error(`Gagal menghapus file lokal ${fileName}:`, err.message);
    }
  }
}

function sanitizeString(str) {
  return (str || '').trim().replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_-]/g, '');
}

export async function processPhoto(photoArray, className, studentName) {
  const largestPhoto = photoArray.reduce((prev, curr) =>
    (curr.file_size || 0) > (prev.file_size || 0) ? curr : prev
  );
  const filePath = await getTelegramFilePath(largestPhoto.file_id);
  const downloadUrl = `https://api.telegram.org/file/bot${TELEGRAM_BOT_TOKEN}/${filePath}`;
  const imageRes = await axios.get(downloadUrl, { responseType: 'arraybuffer' });

  const jpegBuffer = await sharp(Buffer.from(imageRes.data))
    .resize({ width: 1080, height: 1080, fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: 75 })
    .toBuffer();

  const safeClassName = sanitizeString(className);
  const safeStudentName = sanitizeString(studentName);
  const timestamp = Date.now();
  const fileName = `${safeClassName}_${safeStudentName}_${timestamp}.jpg`;

  await saveFile(fileName, jpegBuffer);
  return fileName;
}

export async function processVoice(voice, className, studentName) {
  const filePath = await getTelegramFilePath(voice.file_id);
  const downloadUrl = `https://api.telegram.org/file/bot${TELEGRAM_BOT_TOKEN}/${filePath}`;
  const response = await axios.get(downloadUrl, { responseType: 'arraybuffer' });
  const buffer = Buffer.from(response.data);

  const safeClassName = sanitizeString(className);
  const safeStudentName = sanitizeString(studentName);
  const timestamp = Date.now();
  const fileName = `${safeClassName}_${safeStudentName}_${timestamp}.ogg`;

  await saveFile(fileName, buffer);
  return fileName;
}