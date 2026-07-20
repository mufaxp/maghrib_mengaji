import axios from 'axios';
import sharp from 'sharp';
import path from 'path';
import fs from 'fs/promises';
import { TELEGRAM_API_BASE, TELEGRAM_BOT_TOKEN } from '../config/telegram.js';

/**
 * Mengunduh foto terbesar dari message.photo, mengonversi ke WebP,
 * menyimpan dengan nama sesuai format: {kelas}_{nama}_{timestamp}.webp
 * @param {object} photoArray - array ukuran foto dari message.photo
 * @param {string} className - nama kelas (misal "X 1")
 * @param {string} studentName - nama lengkap siswa
 * @returns {Promise<string>} - path file relatif terhadap folder uploads
 */
export async function processPhoto(photoArray, className, studentName) {
  // Cari foto dengan ukuran terbesar (file_size terbesar)
  const largestPhoto = photoArray.reduce((prev, curr) =>
    (curr.file_size || 0) > (prev.file_size || 0) ? curr : prev
  );

  // Dapatkan file path dari Telegram
  const getFileUrl = `${TELEGRAM_API_BASE}/getFile?file_id=${largestPhoto.file_id}`;
  const fileRes = await axios.get(getFileUrl);
  const filePath = fileRes.data.result.file_path;
  const downloadUrl = `https://api.telegram.org/file/bot${TELEGRAM_BOT_TOKEN}/${filePath}`;

  // Unduh gambar sebagai buffer
  const imageRes = await axios.get(downloadUrl, { responseType: 'arraybuffer' });
  const inputBuffer = Buffer.from(imageRes.data);

  // Konversi ke WebP dengan kualitas bagus
  const webpBuffer = await sharp(inputBuffer)
    .webp({ quality: 80 })
    .toBuffer();

  // Nama file: kelas_nama_timestamp.webp (spasi diganti underscore)
  const safeClassName = className.replace(/\s+/g, '_');
  const safeStudentName = studentName.replace(/\s+/g, '_');
  const timestamp = Date.now();
  const fileName = `${safeClassName}_${safeStudentName}_${timestamp}.webp`;

  // Simpan ke folder uploads (relative path)
  const uploadDir = path.resolve('uploads');
  await fs.mkdir(uploadDir, { recursive: true });
  const fileFullPath = path.join(uploadDir, fileName);
  await fs.writeFile(fileFullPath, webpBuffer);

  // Kembalikan nama file saja (relatif terhadap uploads/)
  return fileName;
}