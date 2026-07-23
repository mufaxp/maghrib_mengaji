import pool from '../config/database.js';

export async function getTeacherByUsername(username) {
  const [rows] = await pool.query(
    `SELECT t.id, t.full_name, t.gender, t.class_id, c.name AS class_name
     FROM teachers t JOIN classes c ON t.class_id = c.id
     WHERE t.username = ?`,
    [username]
  );
  return rows[0] || null;
}

export async function getTeacherByClassId(classId) {
  const [rows] = await pool.query(
    `SELECT t.id, t.full_name, t.gender, t.class_id, t.username, c.name AS class_name
     FROM teachers t JOIN classes c ON t.class_id = c.id
     WHERE t.class_id = ?`,
    [classId]
  );
  return rows[0] || null;
}

export async function updateTeacherByClassId(classId, fullName, gender, newUsername) {
  const [result] = await pool.query(
    'UPDATE teachers SET full_name = ?, gender = ?, username = ? WHERE class_id = ?',
    [fullName, gender, newUsername, classId]
  );
  if (result.affectedRows === 0) {
    await pool.query(
      'INSERT INTO teachers (full_name, gender, username, class_id) VALUES (?, ?, ?, ?)',
      [fullName, gender, newUsername, classId]
    );
  }
}

/**
 * Pindahkan guru (berdasarkan username) ke kelas baru.
 * Kelas tujuan akan diisi oleh guru ini, guru lama di kelas tujuan dihapus.
 * @param {string} username - username guru yang dipindah
 * @param {number} newClassId - ID kelas tujuan
 * @returns {object} movedTeacher, oldTarget, className
 */
export async function moveTeacher(username, newClassId) {
  const guru = await getTeacherByUsername(username);
  if (!guru) throw new Error('Guru tidak ditemukan');

  // Ambil guru yang saat ini menjabat di kelas tujuan
  const oldTarget = await getTeacherByClassId(newClassId);

  // Hapus guru lama di kelas tujuan jika ada
  if (oldTarget) {
    await pool.query('DELETE FROM teachers WHERE class_id = ?', [newClassId]);
  }

  // Perbarui class_id guru yang dipindah
  await pool.query('UPDATE teachers SET class_id = ? WHERE id = ?', [newClassId, guru.id]);

  // Ambil nama kelas
  const [classRows] = await pool.query('SELECT name FROM classes WHERE id = ?', [newClassId]);
  const className = classRows[0]?.name || '';

  return {
    movedTeacher: { full_name: guru.full_name, gender: guru.gender },
    oldTarget: oldTarget ? { full_name: oldTarget.full_name, gender: oldTarget.gender } : null,
    className,
  };
}