// ==========================================
// GOOGLE DRIVE API INTEGRATION - STRIDE PWA
// ==========================================

// OAuth 2.0 Client ID dari Google Cloud Console
const CLIENT_ID = '70199002080-3lo68amnmeakb7p7l66ptr40jk7qklb0.apps.googleusercontent.com';
const SCOPES = 'https://www.googleapis.com/auth/drive.appdata https://www.googleapis.com/auth/drive.file';

let tokenClient;
let accessToken = null;

// Inisialisasi Google Identity Services apabila halaman dimuatkan
window.onload = function () {
  if (typeof google !== 'undefined' && google.accounts) {
    tokenClient = google.accounts.oauth2.initTokenClient({
      client_id: CLIENT_ID,
      scope: SCOPES,
      callback: (tokenResponse) => {
        if (tokenResponse && tokenResponse.access_token) {
          accessToken = tokenResponse.access_token;
          console.log('Log masuk Google Drive berjaya!');
          uploadBackupToDrive();
        }
      },
    });
  }
};

// Fungsi dipanggil apabila butang "Sync ke Google Drive" ditekan di UI
function handleAuthClick() {
  if (!tokenClient) {
    alert('Google API belum siap sepenuhnya. Sila muat semula halaman (F5).');
    return;
  }
  
  // Meminta token kebenaran akses akaun Google daripada pengguna
  tokenClient.requestAccessToken({ prompt: 'consent' });
}

// Fungsi untuk menghantar data localStorage Stride ke Google Drive
async function uploadBackupToDrive() {
  if (!accessToken) {
    alert('Tiada access token yang sah.');
    return;
  }

  try {
    // Ambil keseluruhan data daripada localStorage aplikasi Stride
    const dataToBackup = JSON.stringify(localStorage);
    const fileContent = new Blob([dataToBackup], { type: 'application/json' });

    const metadata = {
      name: 'stride_backup.json',
      mimeType: 'application/json',
    };

    const form = new FormData();
    form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
    form.append('file', fileContent);

    // Hantar permintaan muat naik menggunakan Google Drive REST API v3
    const response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      body: form,
    });

    const result = await response.json();
    
    if (result.id) {
      alert('Berjaya! Data Stride telah di-backup ke Google Drive. ID Fail: ' + result.id);
    } else {
      console.error('Ralat balas API:', result);
      alert('Gagal membuat backup. Sila semak console.');
    }
  } catch (err) {
    console.error('Ralat rangkaian semasa backup:', err);
    alert('Ralat berlaku semasa menghubungi Google Drive.');
  }
}