/**
 * KokiKasir — Cadangan Cloud Sederhana (Google Drive via Google Apps Script)
 *
 * Tanpa dependensi tambahan: hanya fetch ke Web App Google Apps Script milik pengguna.
 * Jika `cloudBackupUrl` kosong, semua fungsi tidak melakukan apa-apa (aplikasi tetap offline penuh).
 *
 * Kontrak Apps Script:
 *  - POST (text/plain;charset=utf-8) body JSON { pin, payload } → { ok: true } / { ok: false, error }
 *  - GET  ?pin=...                                              → { ok: true, payload } / { ok: false, error }
 */

import { logError } from '../utils/errorLogger';

const LAST_SYNCED_KEY = 'kokikasir_last_synced_at';

/* ───────────────────── Status sinkronisasi global ───────────────────── */

let currentState = 'idle'; // 'idle' | 'syncing' | 'error'
const stateListeners = new Set();
let syncInProgress = false;

export function getSyncState() {
  return currentState;
}

export function setSyncState(state) {
  if (state === currentState) return;
  currentState = state;
  stateListeners.forEach((cb) => {
    try {
      cb(state);
    } catch {
      // abaikan error listener
    }
  });
}

export function subscribeSyncState(cb) {
  stateListeners.add(cb);
  return () => stateListeners.delete(cb);
}

/* ───────────────────────── Waktu terakhir cadangan ───────────────────────── */

export function getLastSyncedAt() {
  try {
    return localStorage.getItem(LAST_SYNCED_KEY);
  } catch {
    return null;
  }
}

export function updateLastSyncedAt() {
  try {
    localStorage.setItem(LAST_SYNCED_KEY, new Date().toISOString());
  } catch {
    // abaikan
  }
}

/* ───────────────────────────── Payload cadangan ───────────────────────────── */

/**
 * Bentuk payload cadangan KokiKasir. PIN cloud tidak pernah ikut tersimpan di dalamnya.
 */
export function buildBackupPayload({ storeSettings = {}, qrisImage = '', menuItems = [], orders = [] } = {}) {
  // eslint-disable-next-line no-unused-vars
  const { cloudBackupPin, ...safeSettings } = storeSettings || {};
  return {
    app: 'KokiKasir',
    version: 1,
    exportedAt: new Date().toISOString(),
    data: {
      storeSettings: safeSettings,
      qrisImage: qrisImage || '',
      menuItems,
      orders
    }
  };
}

/* ───────────────────────────── Klien Apps Script ───────────────────────────── */

async function readJsonResponse(response) {
  if (!response.ok) {
    throw new Error('Server cadangan tidak merespons dengan benar.');
  }
  let json;
  try {
    json = await response.json();
  } catch {
    throw new Error('Tanggapan dari server cadangan tidak dikenali. Periksa link cadangan.');
  }
  if (json && json.ok === false) {
    throw new Error(json.error || 'Cadangan ditolak oleh server. Periksa kode keamanan (PIN).');
  }
  return json;
}

/**
 * Unggah cadangan ke Google Apps Script Web App.
 * Memakai text/plain agar tidak memicu CORS preflight.
 */
export async function pushCloudBackup(url, pin, payload) {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({ pin: pin || '', payload }),
    redirect: 'follow'
  });
  return readJsonResponse(response);
}

/**
 * Ambil cadangan terakhir dari Google Apps Script Web App.
 * @returns {Promise<object>} Payload cadangan KokiKasir
 */
export async function pullCloudBackup(url, pin) {
  const separator = url.includes('?') ? '&' : '?';
  const response = await fetch(`${url}${separator}pin=${encodeURIComponent(pin || '')}`, {
    method: 'GET',
    redirect: 'follow'
  });
  const json = await readJsonResponse(response);
  const payload = json && json.payload ? json.payload : json;
  if (!payload || typeof payload !== 'object') {
    throw new Error('Belum ada data cadangan di cloud.');
  }
  return payload;
}

/* ───────────────────────────── Cadangan otomatis ───────────────────────────── */

/**
 * Jalankan cadangan cloud dengan memperbarui status sinkronisasi.
 * Tidak melakukan apa-apa (tanpa error) bila link kosong atau perangkat offline.
 *
 * @returns {Promise<{ok: boolean, skipped?: boolean, error?: string}>}
 */
export async function runCloudBackup({ storeSettings = {}, qrisImage = '', menuItems = [], orders = [] } = {}) {
  const url = (storeSettings?.cloudBackupUrl || '').trim();
  if (!url) return { ok: false, skipped: true };
  if (typeof navigator !== 'undefined' && !navigator.onLine) return { ok: false, skipped: true };
  if (syncInProgress) return { ok: false, skipped: true };

  syncInProgress = true;
  setSyncState('syncing');

  try {
    const payload = buildBackupPayload({ storeSettings, qrisImage, menuItems, orders });
    await pushCloudBackup(url, storeSettings?.cloudBackupPin || '', payload);
    updateLastSyncedAt();
    setSyncState('idle');
    return { ok: true };
  } catch (err) {
    logError({
      message: `Cadangan cloud gagal: ${err?.message || err}`,
      stack: err?.stack,
      route: 'cloud-backup'
    });
    setSyncState('error');
    return { ok: false, error: err?.message || 'Cadangan gagal.' };
  } finally {
    syncInProgress = false;
  }
}
