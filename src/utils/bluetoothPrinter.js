/**
 * KokiKasir — Printer Bluetooth Thermal 58mm (Web Bluetooth + ESC/POS)
 *
 * Koneksi disimpan di memori modul selama aplikasi terbuka.
 * Lebar kertas 58mm = 32 karakter per baris.
 */

import { formatDateToDDMMYYYY, getLocalDate, getWIBTimeString } from './dateHelper';

const SERVICE_UUIDS = [
  '000018f0-0000-1000-8000-00805f9b34fb',
  '0000ff00-0000-1000-8000-00805f9b34fb',
  '49535343-fe7d-4ae5-8fa9-9fafd205e455',
  'e7810a71-73ae-499d-8c15-faa9aef0c3f2',
  '0000ae30-0000-1000-8000-00805f9b34fb'
];

const LINE_WIDTH = 32;
const DIVIDER = '-'.repeat(LINE_WIDTH);
const CHUNK_SIZE = 20;
const CHUNK_DELAY_MS = 20;

// Status koneksi di memori
let activeDevice = null;
let activeCharacteristic = null;
const listeners = new Set();

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function notifyStatus() {
  const status = getPrinterStatus();
  listeners.forEach((cb) => {
    try {
      cb(status);
    } catch {
      // abaikan error listener
    }
  });
}

/** Browser mendukung Web Bluetooth? */
export function isBluetoothSupported() {
  return typeof navigator !== 'undefined' && 'bluetooth' in navigator;
}

/** Status koneksi printer saat ini. */
export function getPrinterStatus() {
  const connected = Boolean(activeDevice?.gatt?.connected && activeCharacteristic);
  return {
    connected,
    name: connected ? activeDevice?.name || 'Printer Bluetooth' : ''
  };
}

export function isPrinterConnected() {
  return getPrinterStatus().connected;
}

/** Berlangganan perubahan status koneksi. Mengembalikan fungsi unsubscribe. */
export function subscribePrinterStatus(cb) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

function handleDisconnected(event) {
  if (event?.target && event.target !== activeDevice) return;
  activeCharacteristic = null;
  notifyStatus();
}

/** Cari karakteristik pertama yang bisa ditulis (write / writeWithoutResponse). */
async function findWritableCharacteristic(server) {
  let services = [];
  try {
    services = await server.getPrimaryServices();
  } catch {
    services = [];
  }

  for (const service of services) {
    let characteristics = [];
    try {
      characteristics = await service.getCharacteristics();
    } catch {
      continue;
    }
    const found = characteristics.find(
      (c) => c.properties.writeWithoutResponse || c.properties.write
    );
    if (found) return found;
  }
  return null;
}

/**
 * Cari printer di sekitar, sambungkan, dan siapkan karakteristik tulis.
 * Harus dipanggil dari aksi pengguna (klik tombol).
 * @returns {Promise<string>} Nama printer
 */
export async function connectPrinter() {
  if (!isBluetoothSupported()) {
    throw new Error('Browser ini belum mendukung printer Bluetooth.');
  }

  const device = await navigator.bluetooth.requestDevice({
    acceptAllDevices: true,
    optionalServices: SERVICE_UUIDS
  });

  device.addEventListener('gattserverdisconnected', handleDisconnected);

  const server = await device.gatt.connect();
  const characteristic = await findWritableCharacteristic(server);

  if (!characteristic) {
    try {
      server.disconnect();
    } catch {
      // abaikan
    }
    throw new Error('Perangkat ini bukan printer thermal yang didukung.');
  }

  activeDevice = device;
  activeCharacteristic = characteristic;
  notifyStatus();
  return device.name || 'Printer Bluetooth';
}

/** Putuskan koneksi printer. */
export function disconnectPrinter() {
  try {
    if (activeDevice?.gatt?.connected) activeDevice.gatt.disconnect();
  } catch {
    // abaikan
  }
  activeCharacteristic = null;
  activeDevice = null;
  notifyStatus();
}

/** Coba sambung ulang ke printer yang sudah pernah dipilih di sesi ini. */
async function ensureConnected() {
  if (activeDevice && activeCharacteristic && activeDevice.gatt.connected) return true;
  if (!activeDevice) return false;

  try {
    const server = await activeDevice.gatt.connect();
    const characteristic = await findWritableCharacteristic(server);
    if (!characteristic) return false;
    activeCharacteristic = characteristic;
    notifyStatus();
    return true;
  } catch {
    activeCharacteristic = null;
    notifyStatus();
    return false;
  }
}

/** Kirim byte ke printer dalam potongan 20 byte dengan jeda 20ms. */
async function sendBytes(bytes) {
  if (!activeCharacteristic) throw new Error('Printer belum terhubung.');

  const canWriteNoResponse =
    activeCharacteristic.properties.writeWithoutResponse &&
    typeof activeCharacteristic.writeValueWithoutResponse === 'function';

  for (let i = 0; i < bytes.length; i += CHUNK_SIZE) {
    const chunk = bytes.slice(i, i + CHUNK_SIZE);
    if (canWriteNoResponse) {
      await activeCharacteristic.writeValueWithoutResponse(chunk);
    } else {
      await activeCharacteristic.writeValue(chunk);
    }
    await sleep(CHUNK_DELAY_MS);
  }
}

/* ───────────────────────── ESC/POS ENCODER ───────────────────────── */

const ESC = 0x1b;
const LF = 0x0a;

/** Printer murah umumnya hanya ASCII: hilangkan aksen & karakter non-ASCII. */
function toAscii(value) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[\r\n\t]+/g, ' ')
    .replace(/[^\x20-\x7e]/g, '?');
}

function formatNumber(n) {
  const value = Math.round(Number(n) || 0);
  return String(value).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

const rupiah = (n) => `Rp ${formatNumber(n)}`;

function wrapText(text, width = LINE_WIDTH) {
  const words = toAscii(text).split(' ').filter(Boolean);
  const lines = [];
  let current = '';

  words.forEach((word) => {
    let w = word;
    while (w.length > width) {
      if (current) {
        lines.push(current);
        current = '';
      }
      lines.push(w.slice(0, width));
      w = w.slice(width);
    }
    if (!current) {
      current = w;
    } else if ((current + ' ' + w).length <= width) {
      current += ' ' + w;
    } else {
      lines.push(current);
      current = w;
    }
  });

  if (current) lines.push(current);
  return lines.length ? lines : [''];
}

function twoColumns(left, right) {
  const r = toAscii(right);
  let l = toAscii(left);
  const maxLeft = LINE_WIDTH - r.length - 1;
  if (l.length > maxLeft) l = l.slice(0, Math.max(0, maxLeft));
  return l + ' '.repeat(Math.max(1, LINE_WIDTH - l.length - r.length)) + r;
}

class EscPosBuilder {
  constructor() {
    this.bytes = [];
  }

  raw(...values) {
    this.bytes.push(...values);
    return this;
  }

  init() {
    return this.raw(ESC, 0x40);
  }

  align(mode) {
    // 0 kiri, 1 tengah, 2 kanan
    return this.raw(ESC, 0x61, mode);
  }

  bold(on) {
    return this.raw(ESC, 0x45, on ? 1 : 0);
  }

  line(text = '') {
    const ascii = toAscii(text);
    for (let i = 0; i < ascii.length; i += 1) this.bytes.push(ascii.charCodeAt(i));
    this.bytes.push(LF);
    return this;
  }

  feed(count = 1) {
    for (let i = 0; i < count; i += 1) this.bytes.push(LF);
    return this;
  }

  toUint8Array() {
    return Uint8Array.from(this.bytes);
  }
}

/**
 * Susun struk ESC/POS untuk kertas thermal 58mm (32 karakter per baris).
 * @param {object} order
 * @param {object} storeSettings
 * @returns {Uint8Array}
 */
export function buildReceiptEscPos(order, storeSettings = {}) {
  const b = new EscPosBuilder();
  const items = Array.isArray(order?.items) ? order.items : [];
  const time = order?.paidAt || order?.createdAt || getWIBTimeString();
  const dateText = formatDateToDDMMYYYY(order?.date || getLocalDate());

  b.init();

  // Header toko
  b.align(1).bold(true);
  wrapText((storeSettings?.name || 'KokiKasir').toUpperCase()).forEach((l) => b.line(l));
  b.bold(false);
  if (storeSettings?.phone) wrapText(storeSettings.phone).forEach((l) => b.line(l));
  if (storeSettings?.hours) wrapText(storeSettings.hours).forEach((l) => b.line(l));

  b.align(0).line(DIVIDER);
  b.line(`${dateText} ${time} WIB`);
  b.line(`Pelanggan: ${order?.customerName || '-'}`);
  b.line(`Tipe: ${order?.orderType || '-'}`);
  b.line(DIVIDER);

  // Daftar item
  items.forEach((it) => {
    const qty = Number(it.quantity) || 0;
    const subtotal = Number(it.subtotal) || 0;
    const unitPrice = it.price != null ? Number(it.price) : qty ? subtotal / qty : 0;

    wrapText(it.name).forEach((l) => b.line(l));
    b.line(twoColumns(`  ${qty} x ${formatNumber(unitPrice)}`, formatNumber(subtotal)));
    if (it.notes) wrapText(`  *${it.notes}`).forEach((l) => b.line(l));
  });

  b.line(DIVIDER);

  // Total & pembayaran
  b.bold(true).line(twoColumns('TOTAL', rupiah(order?.total))).bold(false);
  b.line(twoColumns('Metode', order?.paymentMethod === 'TUNAI' ? 'Tunai' : order?.paymentMethod || '-'));
  if (order?.paymentMethod === 'TUNAI') {
    b.line(twoColumns('Uang Diterima', rupiah(order?.cashGiven)));
    b.line(twoColumns('Kembalian', rupiah(order?.change)));
  }

  b.line(DIVIDER);

  // Pesan penutup
  b.align(1);
  wrapText(storeSettings?.bio || 'Terima kasih atas kunjungannya!').forEach((l) => b.line(l));

  // 4 baris kosong agar kertas keluar dari mulut printer
  b.feed(4);

  return b.toUint8Array();
}

/**
 * Cetak struk pesanan ke printer Bluetooth.
 * Mencoba menyambung ulang otomatis bila koneksi terputus.
 */
export async function printReceipt(order, storeSettings = {}) {
  const ready = await ensureConnected();
  if (!ready) throw new Error('Printer belum terhubung.');
  await sendBytes(buildReceiptEscPos(order, storeSettings));
}

/** Cetak struk contoh untuk uji koneksi. */
export async function printTestReceipt(storeSettings = {}) {
  const testOrder = {
    date: getLocalDate(),
    createdAt: getWIBTimeString(),
    customerName: 'Tes Printer',
    orderType: 'Makan Sini',
    items: [
      { name: 'Nasi Goreng Spesial', quantity: 2, price: 20000, subtotal: 40000, notes: 'pedas' },
      { name: 'Es Teh Manis', quantity: 1, price: 5000, subtotal: 5000 }
    ],
    total: 45000,
    paymentMethod: 'TUNAI',
    cashGiven: 50000,
    change: 5000
  };

  await printReceipt(testOrder, storeSettings);
}
