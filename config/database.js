import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'maghrib_mengaji',
  waitForConnections: true,
  connectionLimit: 5,
  queueLimit: 0,
  idleTimeout: 60000,
});

export default pool;