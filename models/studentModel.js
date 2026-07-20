import pool from '../config/database.js';

/**
 * Mendapatkan daftar siswa berdasarkan class_id.
 * @param {number} classId
 * @returns {Array} - array objek siswa { id, full_name }
 */
export async function getStudentsByClassId(classId) {
  const [rows] = await pool.query(
    'SELECT id, full_name FROM students WHERE class_id = ? ORDER BY full_name',
    [classId]
  );
  return rows;
}
export async function getStudentById(studentId) {
  const [rows] = await pool.query(
    'SELECT id, full_name, class_id FROM students WHERE id = ?',
    [studentId]
  );
  return rows[0] || null;
}

/**
 * Mendapatkan data kelas (name) berdasarkan class_id
 * @param {number} classId
 * @returns {string}
 */
export async function getClassNameById(classId) {
  const [rows] = await pool.query('SELECT name FROM classes WHERE id = ?', [classId]);
  return rows[0]?.name || '';
}

/**
 * Menambahkan banyak siswa sekaligus ke dalam satu kelas.
 * @param {number} classId - ID kelas
 * @param {string[]} names - array nama lengkap siswa
 */
export async function insertStudents(classId, names) {
  const values = names.map(name => [classId, name.trim()]);
  await pool.query('INSERT IGNORE INTO students (class_id, full_name) VALUES ?', [values]);
}