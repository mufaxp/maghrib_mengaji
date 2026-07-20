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
    'SELECT id, full_name FROM students WHERE id = ?',
    [studentId]
  );
  return rows[0] || null;
}