import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import path from 'path';
import multer from 'multer';
import webhookRoute from './routes/webhook.js';

const app = express();
const PORT = process.env.PORT || 3100;

app.use(express.json());

app.use('/miniapp', express.static(path.join(process.cwd(), 'public/miniapp')));

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 15 * 1024 * 1024 } });
app.use('/upload-miniapp', upload.single('media'));

app.use('/', webhookRoute);

app.get('/', (req, res) => {
  res.send('Maghrib Mengaji bot is running.');
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});