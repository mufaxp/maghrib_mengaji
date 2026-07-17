require('dotenv').config();
import express, { json } from 'express';
import webhookRoute from './routes/webhook';

const app = express();
const PORT = process.env.PORT || 3100;

// Middleware untuk parsing JSON body
app.use(json());

// Route webhook
app.use('/', webhookRoute);

// Health check sederhana (opsional)
app.get('/', (req, res) => {
  res.send('Maghrib Mengaji bot is running.');
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});