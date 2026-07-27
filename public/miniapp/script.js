const tg = window.Telegram.WebApp;
tg.ready();
tg.enableClosingConfirmation(); // mencegah tidak sengaja keluar

const statusEl = document.getElementById('status');
const token = new URLSearchParams(window.location.search).get('token');

if (!token) {
  statusEl.textContent = 'Token tidak valid. Silakan mulai ulang dari chat.';
}

// Fungsi upload
async function uploadFile(blob, type) {
  const formData = new FormData();
  formData.append('token', token);
  formData.append('media', blob, type === 'photo' ? 'photo.jpg' : 'voice.ogg');
  formData.append('type', type);

  statusEl.textContent = 'Mengunggah...';
  try {
    const res = await fetch('/api/upload-miniapp', {
      method: 'POST',
      body: formData
    });
    const data = await res.json();
    if (res.ok) {
      statusEl.textContent = '✅ Terkirim!';
      tg.close();
    } else {
      statusEl.textContent = '❌ ' + (data.error || 'Gagal mengirim. Silakan coba lagi.');
    }
  } catch (err) {
    statusEl.textContent = '⚠️ Gagal terhubung ke server. Periksa koneksi Anda.';
  }
}

// Kamera 
document.getElementById('btn-photo').addEventListener('click', async () => {
  try {
    // Minta akses kamera belakang (environment)
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'environment' },
      audio: false
    });

    const video = document.createElement('video');
    video.srcObject = stream;
    video.play();

    // Tunggu sebentar agar kamera siap
    await new Promise(resolve => setTimeout(resolve, 1500));

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    canvas.getContext('2d').drawImage(video, 0, 0);

    stream.getTracks().forEach(track => track.stop());

    canvas.toBlob(blob => {
      if (blob) {
        uploadFile(blob, 'photo');
      } else {
        statusEl.textContent = 'Gagal mengambil foto.';
      }
    }, 'image/jpeg', 0.85);
  } catch (err) {
    statusEl.textContent = 'Izin kamera ditolak atau tidak tersedia: ' + err.message;
  }
});

// Rekam Suara 
let mediaRecorder;
let audioChunks = [];

document.getElementById('btn-voice').addEventListener('click', async () => {
  // Jika sedang merekam, stop
  if (mediaRecorder && mediaRecorder.state === 'recording') {
    mediaRecorder.stop();
    return;
  }

  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    mediaRecorder = new MediaRecorder(stream);
    audioChunks = [];

    mediaRecorder.ondataavailable = e => audioChunks.push(e.data);
    mediaRecorder.onstop = () => {
      const blob = new Blob(audioChunks, { type: 'audio/ogg' });
      uploadFile(blob, 'voice');
    };

    mediaRecorder.start();
    statusEl.textContent = '🎙️ Merekam...';
    document.getElementById('btn-voice').textContent = '⏹️ Berhenti Rekam';
  } catch (err) {
    statusEl.textContent = 'Izin mikrofon ditolak atau tidak tersedia: ' + err.message;
  }
});