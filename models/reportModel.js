import pool from '../config/database.js';

/**
 * Menyimpan laporan baru
 * @param {number} studentId
 * @param {string} filePath - path file relatif terhadap folder uploads
 * @returns {number} insertId
 */
export async function createReport(studentId, filePath) {
  const [result] = await pool.query(
    'INSERT INTO reports (student_id, file_path) VALUES (?, ?)',
    [studentId, filePath]
  );
  return result.insertId;
}

/**
 * Mengambil daftar nama siswa yang sudah melapor hari ini untuk kelas tertentu
 * @param {number} classId
 * @param {string} [date] - format 'YYYY-MM-DD', default hari ini
 * @returns {Array<string>}
 */
export async function getTodayReportsByClass(classId, date) {
  const targetDate = date || new Date().toISOString().slice(0, 10);
  const [rows] = await pool.query(
    `SELECT s.full_name FROM reports r
     JOIN students s ON r.student_id = s.id
     WHERE s.class_id = ? AND DATE(r.created_at) = ?
     ORDER BY s.full_name`,
    [classId, targetDate]
  );
  return rows.map(r => r.full_name);
}

/**
 * Mendapatkan daftar laporan lengkap (nama + file_path) untuk kelas tertentu hari ini.
 * @param {number} classId
 * @param {string} [date] - format 'YYYY-MM-DD'
 * @returns {Array<{full_name: string, file_path: string}>}
 */
export async function getTodayReportDetailsByClass(classId, date) {
  const targetDate = date || new Date().toISOString().slice(0, 10);
  const [rows] = await pool.query(
    `SELECT s.full_name, r.file_path FROM reports r
     JOIN students s ON r.student_id = s.id
     WHERE s.class_id = ? AND DATE(r.created_at) = ?
     ORDER BY s.full_name`,
    [classId, targetDate]
  );
  return rows;
}