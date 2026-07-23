import pool from '../config/database.js';

/**
 * Cari guru berdasarkan username Telegram (tanpa @)
 * @param {string} username
 * @returns {object|null}
 */
export async function getTeacherByUsername(username) {
  const [rows] = await pool.query(
    `SELECT t.id, t.full_name, t.gender, t.class_id, c.name AS class_name
     FROM teachers t
     JOIN classes c ON t.class_id = c.id
     WHERE t.username = ?`,
    [username]
  );
  return rows[0] || null;
}

/**
 * Cari guru berdasarkan class_id.
 */
export async function getTeacherByClassId(classId) {
  const [rows] = await pool.query(
    `SELECT t.id, t.full_name, t.gender, t.class_id, t.username, c.name AS class_name
     FROM teachers t JOIN classes c ON t.class_id = c.id
     WHERE t.class_id = ?`,
    [classId]
  );
  return rows[0] || null;
}

/**
 * Perbarui data guru untuk kelas tertentu.
 */
export async function updateTeacherByClassId(classId, fullName, gender, newUsername) {
  const [result] = await pool.query(
    'UPDATE teachers SET full_name = ?, gender = ?, username = ? WHERE class_id = ?',
    [fullName, gender, newUsername, classId]
  );
  // Jika tidak ada baris yang terupdate (kelas belum punya guru), kita INSERT.
  if (result.affectedRows === 0) {
    await pool.query(
      'INSERT INTO teachers (full_name, gender, username, class_id) VALUES (?, ?, ?, ?)',
      [fullName, gender, newUsername, classId]
    );
  }
}