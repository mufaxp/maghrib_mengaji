import pool from '../config/database.js';

/**
 * Cari guru berdasarkan telegram_id
 * @param {number} telegramId
 * @returns {object|null}
 */
export async function getTeacherByTelegramId(telegramId) {
  const [rows] = await pool.query(
    'SELECT t.id, t.full_name, t.gender, t.class_id, c.name AS class_name FROM teachers t JOIN classes c ON t.class_id = c.id WHERE t.telegram_id = ?',
    [telegramId]
  );
  return rows[0] || null;
}