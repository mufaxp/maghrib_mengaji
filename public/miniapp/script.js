const tg = window.Telegram.WebApp;
tg.ready();
tg.enableClosingConfirmation();

const statusEl = document.getElementById('status');
const token = new URLSearchParams(window.location.search).get('token');

if (!token) {
  statusEl.textContent = 'Token tidak valid. Silakan mulai ulang dari chat.';
}

// Elemen UI 
const mainButtons = document.getElementById('main-buttons');
const cameraContainer = document.getElementById('camera-container');
const videoEl = document.getElementById('video');
const btnFlip = document.getElementById('btn-flip');
const btnCapture = document.getElementById('btn-capture');
const btnCloseCamera = document.getElementById('btn-close-camera');

let currentStream = null;
let facingMode = 'environment'; // belakang

// Upload 
async function uploadFile(blob, type) {
  const formData = new FormData();
  formData.append('token', token);
  formData.append('media', blob, type === 'photo' ? 'photo.jpg' : 'voice.ogg');
  formData.append('type', type);

  statusEl.textContent = 'Mengunggah...';
  try {
    const res = await fetch('/maghrib_mengaji/upload-miniapp', {
      method: 'POST',
      body: formData
    });
    const data = await res.json();
    if (res.ok) {
      statusEl.textContent = '✅ Terkirim!';
      tg.close();
    } else {
      statusEl.textContent = '❌ ' + (data.error || 'Gagal mengirim.');
    }
  } catch (err) {
    statusEl.textContent = '⚠️ Gagal terhubung ke server.';
  }
}

// Kamera 
async function startCamera(mode) {
  if (currentStream) {
    currentStream.getTracks().forEach(track => track.stop());
  }
  try {
    currentStream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: mode },
      audio: false
    });
    videoEl.srcObject = currentStream;
  } catch (err) {
    statusEl.textContent = 'Gagal mengakses kamera: ' + err.message;
    hideCamera();
  }
}

function showCamera() {
  mainButtons.style.display = 'none';
  cameraContainer.style.display = 'flex';
  facingMode = 'environment';
  startCamera(facingMode);
}

function hideCamera() {
  if (currentStream) {
    currentStream.getTracks().forEach(track => track.stop());
    currentStream = null;
  }
  cameraContainer.style.display = 'none';
  mainButtons.style.display = 'block';
}

// Tombol flip
btnFlip.addEventListener('click', () => {
  facingMode = facingMode === 'environment' ? 'user' : 'environment';
  startCamera(facingMode);
});

// Tombol capture
btnCapture.addEventListener('click', () => {
  if (!currentStream) return;
  const canvas = document.createElement('canvas');
  canvas.width = videoEl.videoWidth || 640;
  canvas.height = videoEl.videoHeight || 480;
  canvas.getContext('2d').drawImage(videoEl, 0, 0);

  canvas.toBlob(blob => {
    if (blob) {
      uploadFile(blob, 'photo');
      hideCamera();
    } else {
      statusEl.textContent = 'Gagal mengambil foto.';
    }
  }, 'image/jpeg', 0.85);
});

// Tombol tutup kamera
btnCloseCamera.addEventListener('click', hideCamera);

// Tombol "Ambil Foto" di menu utama
document.getElementById('btn-photo').addEventListener('click', showCamera);

// Rekam Suara (tetap sederhana) 
let mediaRecorder;
let audioChunks = [];

document.getElementById('btn-voice').addEventListener('click', async () => {
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
    statusEl.textContent = 'Izin mikrofon ditolak: ' + err.message;
  }
});