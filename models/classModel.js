import pool from '../config/database.js';

/**
 * Mendapatkan daftar jenjang unik (X, XI, XII) dari tabel classes.
 * Hasilnya diurutkan sesuai urutan enum.
 */
export async function getLevels() {
  const [rows] = await pool.query(
    "SELECT DISTINCT level FROM classes ORDER BY FIELD(level, 'X', 'XI', 'XII')"
  );
  return rows.map(r => r.level);
}

/**
 * Mendapatkan semua kelas untuk jenjang tertentu.
 * @param {string} level - X, XI, atau XII
 * @returns {Array} - array objek kelas { id, name }
 */
export async function getClassesByLevel(level) {
  const [rows] = await pool.query(
    'SELECT id, name FROM classes WHERE level = ? ORDER BY name',
    [level]
  );
  return rows;
}