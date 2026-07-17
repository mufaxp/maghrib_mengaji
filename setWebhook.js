import dotenv from 'dotenv';
dotenv.config(); // pastikan .env dibaca sebelum config lainnya

import express from 'express';
import webhookRoute from './routes/webhook.js';

const app = express();
const PORT = process.env.PORT || 3100;

app.use(express.json());

app.use('/', webhookRoute);

app.get('/', (req, res) => {
  res.send('Maghrib Mengaji bot is running.');
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});