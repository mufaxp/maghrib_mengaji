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
let facingMode = 'environment'; // kamera belakang
let videoReady = false;

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
  videoReady = false;
  statusEl.textContent = 'Membuka kamera...';

  try {
    currentStream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: mode, width: { ideal: 1280 }, height: { ideal: 720 } },
      audio: false
    });

    videoEl.srcObject = currentStream;
    videoEl.setAttribute('playsinline', '');
    videoEl.setAttribute('autoplay', '');

    // Tunggu video siap
    await new Promise((resolve, reject) => {
      videoEl.onloadedmetadata = () => {
        videoEl.play().then(resolve).catch(reject);
      };
      // Timeout 5 detik
      setTimeout(() => reject(new Error('Video tidak merespons')), 5000);
    });

    videoReady = true;
    statusEl.textContent = '';
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
  videoReady = false;
  cameraContainer.style.display = 'none';
  mainButtons.style.display = 'block';
}

// Flip kamera depan/belakang
btnFlip.addEventListener('click', () => {
  facingMode = facingMode === 'environment' ? 'user' : 'environment';
  startCamera(facingMode);
});

// Capture foto
btnCapture.addEventListener('click', () => {
  if (!videoReady || !currentStream) {
    statusEl.textContent = 'Kamera belum siap.';
    return;
  }

  const canvas = document.createElement('canvas');
  // Gunakan dimensi aktual video, fallback jika 0
  const vw = videoEl.videoWidth || 640;
  const vh = videoEl.videoHeight || 480;
  canvas.width = vw;
  canvas.height = vh;

  const ctx = canvas.getContext('2d');
  ctx.drawImage(videoEl, 0, 0, vw, vh);

  canvas.toBlob(blob => {
    if (blob) {
      uploadFile(blob, 'photo');
      hideCamera();
    } else {
      statusEl.textContent = 'Gagal mengambil foto.';
    }
  }, 'image/jpeg', 0.85);
});

// Tutup kamera
btnCloseCamera.addEventListener('click', hideCamera);

// Tombol "Ambil Foto" di menu utama
document.getElementById('btn-photo').addEventListener('click', showCamera);

// Rekam Suara 
let mediaRecorder;
let audioChunks = [];

document.getElementById('btn-voice').addEventListener('click', async () => {
  if (mediaRecorder && mediaRecorder.state === 'recording') {
    mediaRecorder.stop();
    return;
  }

  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
    audioChunks = [];

    mediaRecorder.ondataavailable = e => audioChunks.push(e.data);
    mediaRecorder.onstop = () => {
      const blob = new Blob(audioChunks, { type: 'audio/webm' });
      uploadFile(blob, 'voice');
    };

    mediaRecorder.start();
    statusEl.textContent = '🎙️ Merekam...';
    document.getElementById('btn-voice').textContent = '⏹️ Berhenti Rekam';
  } catch (err) {
    statusEl.textContent = 'Izin mikrofon ditolak: ' + err.message;
  }
});