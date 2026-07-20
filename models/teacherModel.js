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