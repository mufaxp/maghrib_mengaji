const tg = window.Telegram.WebApp;
tg.ready();

const statusEl = document.getElementById('status');
const token = new URLSearchParams(window.location.search).get('token');

if (!token) {
  statusEl.textContent = 'Token tidak valid. Silakan mulai dari awal di chat.';
}

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
      statusEl.textContent = '✅ Laporan terkirim!';
      tg.close();
    } else {
      statusEl.textContent = '❌ ' + (data.error || 'Gagal mengirim. Silakan coba lagi.');
    }
  } catch (err) {
    statusEl.textContent = '⚠️ Gagal terhubung ke server. Periksa koneksi.';
  }
}

// Kamera 
document.getElementById('btn-photo').addEventListener('click', async () => {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'environment' },
      audio: false
    });
    const video = document.createElement('video');
    video.srcObject = stream;
    video.play();

    await new Promise(resolve => (video.onloadedmetadata = resolve));
    await new Promise(resolve => setTimeout(resolve, 800));

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d').drawImage(video, 0, 0);

    stream.getTracks().forEach(track => track.stop());
    video.remove();

    canvas.toBlob(blob => {
      if (blob) {
        uploadFile(blob, 'photo');
      } else {
        statusEl.textContent = 'Gagal mengambil foto.';
      }
    }, 'image/jpeg', 0.9);
  } catch (err) {
    statusEl.textContent = 'Gagal mengakses kamera. Pastikan izin diberikan.';
  }
});

// Voice Recorder 
let mediaRecorder;
let audioChunks = [];
let recording = false;

document.getElementById('btn-voice').addEventListener('click', async () => {
  if (recording) {
    // Stop recording
    mediaRecorder.stop();
    recording = false;
    document.getElementById('btn-voice').textContent = '🎙️ Rekam Suara';
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
    recording = true;
    document.getElementById('btn-voice').textContent = '⏹️ Berhenti Rekam';
    statusEl.textContent = 'Merekam...';
  } catch (err) {
    statusEl.textContent = 'Gagal mengakses mikrofon.';
  }
});