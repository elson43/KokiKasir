/**
 * KokiKasir — QRIS Helper (EMVCo / Standar QRIS Bank Indonesia)
 *
 * Mengubah QRIS statis (hasil foto/unggah) menjadi QRIS dinamis dengan nominal terisi,
 * 100% offline di browser: decode lewat `jsqr`, render lewat `qrcode`.
 */

import jsQR from 'jsqr';
import QRCode from 'qrcode';

/* ───────────────────────────── CRC-16/CCITT-FALSE ───────────────────────────── */

/**
 * CRC-16/CCITT-FALSE: poly 0x1021, init 0xFFFF, tanpa refleksi, XOR akhir 0x0000.
 * @param {string} str
 * @returns {string} 4 karakter hex huruf besar, contoh "0A3F"
 */
export function computeCrc16CcittFalse(str) {
  let crc = 0xffff;
  const input = String(str ?? '');

  for (let i = 0; i < input.length; i += 1) {
    crc ^= (input.charCodeAt(i) & 0xff) << 8;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
    }
  }

  return crc.toString(16).toUpperCase().padStart(4, '0');
}

/* ───────────────────────────── Parser & Serializer TLV ───────────────────────────── */

/**
 * Parse payload EMVCo top-level secara berurutan: tag (2 char), panjang (2 digit), nilai.
 * @param {string} payload
 * @returns {Array<{tag: string, value: string}>}
 * @throws {Error} bila struktur TLV rusak
 */
export function parseEmvTlv(payload) {
  const text = String(payload ?? '');
  const tags = [];
  let index = 0;

  while (index < text.length) {
    if (index + 4 > text.length) {
      throw new Error('Struktur QRIS tidak lengkap.');
    }

    const tag = text.slice(index, index + 2);
    const lengthText = text.slice(index + 2, index + 4);

    if (!/^\d{2}$/.test(tag) || !/^\d{2}$/.test(lengthText)) {
      throw new Error('Struktur QRIS tidak valid.');
    }

    const length = parseInt(lengthText, 10);
    const value = text.slice(index + 4, index + 4 + length);

    if (value.length !== length) {
      throw new Error('Panjang data QRIS tidak sesuai.');
    }

    tags.push({ tag, value });
    index += 4 + length;
  }

  return tags;
}

/**
 * Gabungkan kembali daftar tag menjadi string payload EMVCo.
 * @param {Array<{tag: string, value: string}>} tags
 * @returns {string}
 */
export function serializeEmvTlv(tags) {
  return tags
    .map(({ tag, value }) => {
      const val = String(value ?? '');
      if (val.length > 99) {
        throw new Error('Data QRIS terlalu panjang.');
      }
      return `${tag}${String(val.length).padStart(2, '0')}${val}`;
    })
    .join('');
}

const findTag = (tags, tag) => tags.find((t) => t.tag === tag);

/* ───────────────────────────── Validasi & Inspeksi ───────────────────────────── */

/**
 * Validasi payload QRIS (struktur, mata uang/negara, merchant account, CRC) dan ambil info merchant.
 * @param {string} rawString
 * @returns {{isValid: boolean, merchantName: string, merchantCity: string, isAlreadyDynamic: boolean, rawPayload: string, reason?: string}}
 */
export function validateAndInspectQris(rawString) {
  const rawPayload = String(rawString ?? '').trim();
  const invalid = (reason) => ({
    isValid: false,
    merchantName: '',
    merchantCity: '',
    isAlreadyDynamic: false,
    rawPayload,
    reason
  });

  if (!rawPayload) return invalid('QR kosong.');

  let tags;
  try {
    tags = parseEmvTlv(rawPayload);
  } catch (err) {
    return invalid(err.message);
  }

  if (findTag(tags, '00')?.value !== '01') return invalid('Bukan format QRIS.');

  const isIndonesia = findTag(tags, '58')?.value === 'ID' || findTag(tags, '53')?.value === '360';
  if (!isIndonesia) return invalid('QR ini bukan QRIS Indonesia.');

  const hasMerchantAccount = tags.some((t) => {
    const n = parseInt(t.tag, 10);
    return n >= 26 && n <= 51;
  });
  if (!hasMerchantAccount) return invalid('Data merchant QRIS tidak ditemukan.');

  // CRC harus tag terakhir dengan panjang 4
  const last = tags[tags.length - 1];
  if (!last || last.tag !== '63' || last.value.length !== 4) {
    return invalid('Kode CRC QRIS tidak ditemukan.');
  }

  const payloadWithoutCrcValue = rawPayload.slice(0, rawPayload.length - 4);
  if (computeCrc16CcittFalse(payloadWithoutCrcValue) !== last.value.toUpperCase()) {
    return invalid('Kode CRC QRIS tidak cocok.');
  }

  return {
    isValid: true,
    merchantName: findTag(tags, '59')?.value || '',
    merchantCity: findTag(tags, '60')?.value || '',
    isAlreadyDynamic: findTag(tags, '01')?.value === '12',
    rawPayload
  };
}

/* ───────────────────────────── Static → Dynamic ───────────────────────────── */

/**
 * Ubah QRIS statis menjadi QRIS dinamis dengan nominal tetap.
 * Hanya tag 01, 53, 54, dan 63 yang diubah; tag merchant/acquirer tetap utuh.
 *
 * @param {string} staticPayload
 * @param {number} amountIdr - nominal Rupiah (dibulatkan ke bilangan bulat)
 * @returns {string} payload QRIS dinamis
 */
export function generateDynamicQrisPayload(staticPayload, amountIdr) {
  const amount = Number(amountIdr);
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error('Nominal tidak valid.');
  }
  const amountStr = String(Math.round(amount));
  if (amountStr === '0') {
    throw new Error('Nominal tidak valid.');
  }

  const parsed = parseEmvTlv(String(staticPayload ?? '').trim());

  // Buang tag 54 & 63 lama
  let tags = parsed.filter((t) => t.tag !== '54' && t.tag !== '63');

  // 1. Tag 01 → "12" (Dinamis)
  const tag01 = findTag(tags, '01');
  if (tag01) {
    tags = tags.map((t) => (t.tag === '01' ? { tag: '01', value: '12' } : t));
  } else {
    const idx00 = tags.findIndex((t) => t.tag === '00');
    tags.splice(idx00 >= 0 ? idx00 + 1 : 0, 0, { tag: '01', value: '12' });
  }

  // 3. Pastikan Tag 53 = "360" (IDR)
  if (findTag(tags, '53')) {
    tags = tags.map((t) => (t.tag === '53' ? { tag: '53', value: '360' } : t));
  } else {
    const idx52 = tags.findIndex((t) => t.tag === '52');
    const idx58 = tags.findIndex((t) => t.tag === '58');
    let insertAt = tags.length;
    if (idx52 >= 0) insertAt = idx52 + 1;
    else if (idx58 >= 0) insertAt = idx58;
    tags.splice(insertAt, 0, { tag: '53', value: '360' });
  }

  // 4. Sisipkan Tag 54 tepat setelah Tag 53
  const idx53 = tags.findIndex((t) => t.tag === '53');
  tags.splice(idx53 + 1, 0, { tag: '54', value: amountStr });

  // 5. Serialisasi + CRC
  const body = `${serializeEmvTlv(tags)}6304`;
  return `${body}${computeCrc16CcittFalse(body)}`;
}

/* ───────────────────────────── Decode dari Gambar ───────────────────────────── */

function loadImageElement(source) {
  return new Promise((resolve, reject) => {
    let objectUrl = null;
    let src = source;

    if (typeof Blob !== 'undefined' && source instanceof Blob) {
      objectUrl = URL.createObjectURL(source);
      src = objectUrl;
    }

    const img = new Image();
    img.onload = () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
      resolve(img);
    };
    img.onerror = (err) => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
      reject(err);
    };
    img.src = src;
  });
}

/**
 * Gambar ke canvas (area sumber opsional) lalu coba decode QR.
 * Hanya mengecilkan, tidak memperbesar.
 */
function tryDecode(img, maxDim, crop) {
  const sx = crop ? crop.x : 0;
  const sy = crop ? crop.y : 0;
  const sw = crop ? crop.size : img.naturalWidth || img.width;
  const sh = crop ? crop.size : img.naturalHeight || img.height;

  const scale = Math.min(1, maxDim / Math.max(sw, sh));
  const width = Math.max(1, Math.round(sw * scale));
  const height = Math.max(1, Math.round(sh * scale));

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(img, sx, sy, sw, sh, 0, 0, width, height);

  const imageData = ctx.getImageData(0, 0, width, height);
  const result = jsQR(imageData.data, width, height, { inversionAttempts: 'attemptBoth' });
  return result?.data || null;
}

/**
 * Baca QRIS dari foto (termasuk foto standee/poster) dengan beberapa tahap decode.
 * @param {File|Blob|string} imageSource - File, Blob, atau data URL Base64
 * @returns {Promise<{ok: true, payload: string, merchantName: string, merchantCity: string} | {ok: false, reason: string}>}
 */
export async function decodeQrisFromImage(imageSource) {
  try {
    const img = await loadImageElement(imageSource);
    const w = img.naturalWidth || img.width;
    const h = img.naturalHeight || img.height;
    const side = Math.min(w, h) * 0.7;

    const passes = [
      () => tryDecode(img, 1000), // Tahap 1: gambar penuh, maks 1000px
      () => tryDecode(img, 1800), // Tahap 2: gambar penuh, maks 1800px
      () =>
        tryDecode(img, 1000, {
          // Tahap 3: potong tengah 70% (posisi QR pada poster)
          x: Math.round((w - side) / 2),
          y: Math.round((h - side) / 2),
          size: Math.round(side)
        })
    ];

    let lastReason = 'QR tidak terbaca pada foto.';

    for (const run of passes) {
      let text = null;
      try {
        text = run();
      } catch {
        text = null;
      }
      if (!text) continue;

      const info = validateAndInspectQris(text);
      if (info.isValid) {
        return {
          ok: true,
          payload: info.rawPayload,
          merchantName: info.merchantName,
          merchantCity: info.merchantCity
        };
      }
      lastReason = info.reason || lastReason;
    }

    return { ok: false, reason: lastReason };
  } catch {
    return { ok: false, reason: 'Gambar tidak dapat dibuka.' };
  }
}

/* ───────────────────────────── Render QR ───────────────────────────── */

/**
 * Render QR hitam-putih kontras tinggi dengan quiet zone yang cukup untuk semua kamera.
 * @param {string} qrisPayload
 * @returns {Promise<string>} data URL PNG
 */
export function renderQrisToDataUrl(qrisPayload) {
  return QRCode.toDataURL(qrisPayload, {
    errorCorrectionLevel: 'M',
    margin: 4,
    width: 320,
    color: { dark: '#000000', light: '#FFFFFF' }
  });
}
