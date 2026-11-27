/**
 * Kompresi gambar agresif agar hemat memori perangkat dan cepat dimuat offline.
 *
 * Preset:
 *  - menu : maks 280x280 px, WebP (fallback JPEG) mulai kualitas 0.6, turun sampai 0.35
 *           hingga string Base64 < ~45 KB
 *  - logo : maks 200x200 px, Base64 < ~35 KB
 *  - qris : maks 520x520 px, kualitas 0.78 (tetap tajam & terbaca scanner), Base64 < ~120 KB
 */

export const IMAGE_PRESETS = {
  menu: {
    maxSize: 280,
    minSize: 120,
    quality: 0.6,
    minQuality: 0.35,
    maxBase64Length: 45 * 1024,
    whiteBackground: false
  },
  logo: {
    maxSize: 200,
    minSize: 96,
    quality: 0.7,
    minQuality: 0.35,
    maxBase64Length: 35 * 1024,
    whiteBackground: false
  },
  qris: {
    maxSize: 520,
    minSize: 400,
    quality: 0.78,
    minQuality: 0.6,
    maxBase64Length: 120 * 1024,
    whiteBackground: true
  }
};

const QUALITY_STEP = 0.05;
const SHRINK_FACTOR = 0.85;

let webpSupported = null;

/** Cek dukungan output WebP pada canvas (di-cache). */
function supportsWebp() {
  if (webpSupported !== null) return webpSupported;
  try {
    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;
    webpSupported = canvas.toDataURL('image/webp').startsWith('data:image/webp');
  } catch {
    webpSupported = false;
  }
  return webpSupported;
}

function loadImage(file) {
  return new Promise((resolve, reject) => {
    if (!file) {
      reject(new Error('File tidak ditemukan'));
      return;
    }

    const reader = new FileReader();
    reader.onerror = (err) => reject(err);
    reader.onload = (event) => {
      const img = new Image();
      img.onerror = (err) => reject(err);
      img.onload = () => resolve(img);
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  });
}

function renderToDataUrl(img, width, height, mime, quality, whiteBackground) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d');
  // JPEG tidak mengenal transparansi, QRIS wajib berlatar putih
  if (whiteBackground || mime === 'image/jpeg') {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);
  }
  ctx.drawImage(img, 0, 0, width, height);

  return canvas.toDataURL(mime, quality);
}

/**
 * Mengubah file gambar menjadi Base64 terkompresi sesuai preset.
 *
 * @param {File} file - File dari input type="file"
 * @param {'menu'|'logo'|'qris'} preset - Profil kompresi
 * @returns {Promise<string>} Base64 data URL
 */
export async function compressImageToBase64(file, preset = 'menu') {
  const profile = IMAGE_PRESETS[preset] || IMAGE_PRESETS.menu;
  const img = await loadImage(file);
  const mime = supportsWebp() ? 'image/webp' : 'image/jpeg';

  // Skala agar muat dalam kotak maxSize x maxSize (tanpa memperbesar)
  const baseScale = Math.min(1, profile.maxSize / Math.max(img.width, img.height));
  let width = Math.max(1, Math.round(img.width * baseScale));
  let height = Math.max(1, Math.round(img.height * baseScale));

  let result = '';

  for (let attempt = 0; attempt < 6; attempt += 1) {
    let quality = profile.quality;
    result = renderToDataUrl(img, width, height, mime, quality, profile.whiteBackground);

    // Turunkan kualitas bertahap sampai ukuran memenuhi batas
    while (result.length > profile.maxBase64Length && quality - QUALITY_STEP >= profile.minQuality - 0.0001) {
      quality = Math.round((quality - QUALITY_STEP) * 100) / 100;
      result = renderToDataUrl(img, width, height, mime, quality, profile.whiteBackground);
    }

    if (result.length <= profile.maxBase64Length) break;

    // Masih terlalu besar: perkecil dimensi sedikit (tidak di bawah minSize)
    const longest = Math.max(width, height);
    if (longest <= profile.minSize) break;
    const nextLongest = Math.max(profile.minSize, Math.round(longest * SHRINK_FACTOR));
    const ratio = nextLongest / longest;
    width = Math.max(1, Math.round(width * ratio));
    height = Math.max(1, Math.round(height * ratio));
  }

  return result;
}
