# KokiKasir — Konteks Proyek (PWA POS)

Aplikasi Point of Sales berbasis web (PWA), 100% responsif (mobile, tablet, laptop), untuk koki yang merangkap kasir. Fokus pada sistem **Open Bill**: tanpa nomor meja, tanpa manajemen stok, tanpa diskon.

## Tech Stack
- React 18 + Vite 5 (`npm run dev` → http://localhost:3000, `npm run build`, `npm run preview`)
- Tailwind CSS 3, `lucide-react` (ikon), `xlsx` (export Excel), `jsqr` & `qrcode` (decode & render QRIS offline), `clsx`, `tailwind-merge`
- PWA: `public/manifest.json`, `public/sw.js` (didaftarkan di `index.html`), `public/logo.svg`
- Tanpa router: navigasi lewat state `activeNav` di `AppContext` (`home | dashboard | menu | reports | settings`), dirender di `src/App.jsx`
- Tanpa TypeScript, tanpa test runner

## Struktur `src/`
| Path | Isi |
|---|---|
| `main.jsx` | Entry; membungkus `<App/>` dengan `ErrorBoundary`, memasang `window.onerror` & `onunhandledrejection` → `logError` |
| `App.jsx` | `AppProvider`, Splash Screen 2 detik, `Layout`, switch halaman |
| `context/AppContext.jsx` | State global (menu, orders, draftOrder, QRIS, storeSettings, activeNav) + `restoreBackup()` |
| `components/` | `Layout`, `Sidebar` (desktop), `BottomNav` (mobile/tablet), `Header`, `SplashScreen`, `Logo`, `ErrorBoundary`, `QrisStatusBadge` |
| `pages/` | `HomePage`, `DashboardPage`, `MenuManagementPage`, `ReportsPage`, `SettingsPage` |
| `hooks/useNetworkStatus.js` | `{ isOnline, syncState, setSyncState }` (event online/offline + status sinkronisasi global dari `syncService`) |
| `utils/dateHelper.js` | Semua tanggal/jam WIB (`Asia/Jakarta`), filter 7/30 hari, grouping per tanggal, `formatWIBDateTime` |
| `utils/imageHelper.js` | Kompresi gambar agresif per preset (`menu`, `logo`, `qris`) → Base64 |
| `utils/qrisHelper.js` | Static-to-Dynamic QRIS offline (EMVCo TLV parser/serializer, CRC-16/CCITT-FALSE, decode multi-pass `jsqr`, render `qrcode`) |
| `utils/bluetoothPrinter.js` | Web Bluetooth + encoder ESC/POS 58mm (32 karakter/baris) |
| `utils/errorLogger.js` | Log error senyap (maks 100, data sensitif di-scrub) |
| `lib/syncService.js` | Cadangan cloud Google Drive (Apps Script) + status sinkronisasi + waktu terakhir cadangan |

## Kompresi Gambar
`compressImageToBase64(file, preset)` di `utils/imageHelper.js` (output WebP, fallback JPEG; kualitas diturunkan bertahap, lalu dimensi diperkecil bila masih terlalu besar):
- `menu`: maks 280×280 px, kualitas 0.6 → 0.35, Base64 < ~45 KB (dipakai foto menu)
- `logo`: maks 200×200 px, Base64 < ~35 KB (dipakai logo toko)
- `qris`: maks 520×520 px, kualitas 0.78 (min 0.6), latar putih agar terbaca scanner, Base64 < ~120 KB (dipakai QRIS di Dashboard)
- `AppContext` menulis ke penyimpanan lewat `safeWrite`: error kuota dicatat senyap via `errorLogger` dan memunculkan banner ramah (di `Layout`): "Memori perangkat hampir penuh. Hapus sebagian foto menu atau lakukan backup data."

## Printer Bluetooth 58mm
`utils/bluetoothPrinter.js` (hanya Chrome/Android/Laptop; cek `isBluetoothSupported()`):
- `connectPrinter()` memakai `acceptAllDevices` + `optionalServices` (UUID 18f0, ff00, 49535343-…, e7810a71-…, ae30), mencari karakteristik pertama yang mendukung `write`/`writeWithoutResponse`; koneksi disimpan di memori modul dan status diperbarui lewat event `gattserverdisconnected` (`getPrinterStatus`, `subscribePrinterStatus`)
- `buildReceiptEscPos(order, storeSettings)`: init, nama toko tebal tengah, telepon/jam, garis pemisah, tanggal & jam WIB, pelanggan & tipe, item (nama, qty × harga, subtotal rata kanan), TOTAL, metode (Tunai + Uang Diterima + Kembalian, atau QRIS), pesan penutup, 4 baris kosong. Teks dikonversi ke ASCII
- Data dikirim per 20 byte dengan jeda 20 ms; tersedia `printReceipt`, `printTestReceipt`, `disconnectPrinter`

## Penyimpanan Data
Semua data disimpan di perangkat lewat `localStorage` (bukan IndexedDB/Dexie). Key harus tetap persis:
`kokikasir_menu`, `kokikasir_orders`, `kokikasir_qris_image`, `kokikasir_store_settings` (termasuk `printerMode`, `autoPrint`, `lastPrinterName`, `cloudBackupUrl`, `cloudBackupPin`, `qrisPayload`, `qrisMerchantName`, `qrisMerchantCity`), `kokikasir_error_logs`, `kokikasir_last_synced_at`.
- Transaksi PAID **tidak** dihapus otomatis saat pergantian hari; riwayat minimal 30 hari tetap tersimpan.
- Teks UI untuk pengguna tidak boleh menyebut istilah teknis ("LocalStorage", "IndexedDB", "Dexie", "Penyimpanan Lokal"). Gunakan: "Tersimpan otomatis di perangkat", "Mode Offline — data tersimpan otomatis di perangkat", "Data di perangkat ini".

## Aturan Desain (Jade Ornament, friendly minimalist)
- Latar `bg-emerald-50`; kartu `bg-white` + `shadow-sm shadow-emerald-100/50`
- Aksi utama `bg-emerald-500` (hover lebih gelap); aksi sekunder `bg-stone-100`/`bg-stone-200`; bahaya `bg-rose-500`
- Teks `text-emerald-950` / `text-stone-800` (hindari hitam pekat)
- Sudut `rounded-2xl`/`rounded-3xl` (elemen besar), `rounded-xl` (tombol)
- Logo (topi koki + tablet, line-art `text-emerald-600`) tampil di Splash, Header/Sidebar, dan Struk Digital
- Bahasa UI: Indonesia

## Modul Aplikasi

### 1. Home (Buat Pesanan)
- Wajib isi **Nama Pelanggan**; toggle **Makan Sini / Bungkus**
- Filter kategori (chips), katalog grid (2 kolom di HP). Menu "Habis" di-gray-out, "Sembunyikan" tidak tampil
- Kontrol qty (+/−, input langsung), catatan item muncul jika qty > 0
- Ringkasan + Grand Total real-time; tombol **"Simpan & Buka Tagihan"** → status UNPAID, pindah ke Dashboard
- Mode edit (Tambah Pesanan) memakai `draftOrder.editingOrderId`

### 2. Manajemen Menu
- Tambah/edit/hapus menu: gambar (upload/URL), nama, kategori, harga, status `Tersedia | Habis | Sembunyikan`
- Daftar menu berupa **accordion per kategori**; saat halaman dimuat semua kategori **tertutup** (`expandedCategories = []`), terbuka hanya jika header diklik
- Perubahan harga tidak mengubah transaksi PAID lama

### 3. Dashboard (2 tab)
- **Unpaid:** pesanan belum lunas, terlama di atas. Detail punya aksi **Tambah Pesanan**, **Batalkan Tagihan** (konfirmasi merah soft), **Bayar**
- **Bayar:** QRIS atau Tunai. Tunai: input "Uang Diterima", kembalian otomatis, tombol nominal cepat (Uang Pas, 50.000, 100.000). QRIS: jika `qrisPayload` tersedia, render QRIS Dinamis dengan nominal terkunci, badge "QRIS Dinamis", nama merchant terverifikasi, pengingat cek layar pembeli dengan jam WIB di atas tombol **Konfirmasi Lunas**, serta toggle "Tampilkan gambar QRIS asli". Jika belum terbaca, fallback otomatis ke gambar QRIS statis (`kokikasir_qris_image`). Foto QRIS lama otomatis dicoba dibaca satu kali saat aplikasi dibuka
- **History (Riwayat Lunas):** 30 hari terakhir (WIB), terbaru ke terlama, dikelompokkan per tanggal
- **Struk Digital** (preview 58mm, logo/nama/bio toko dari Pengaturan) hanya punya dua tombol: **Cetak Nota** (sekunder) dan **Transaksi Baru** (utama; tutup struk, reset draft, ke Home)
- `handlePrintReceipt(order)` memilih rute berdasar `storeSettings.printerMode`: `bluetooth` → kirim byte ESC/POS ke printer terhubung (bila belum terhubung/gagal, tampil pemberitahuan lalu fallback cetak browser); `browser` → `window.print()` dengan CSS struk 58mm (`body.receipt-printing`, elemen `#receipt-print`, di `index.css`); `none` → cetak manual tetap memakai cetak browser dan Cetak Otomatis tidak pernah berjalan
- Jika `autoPrint` aktif dan mode bukan `none`, nota dicetak otomatis satu kali setelah pembayaran selesai
- Tidak ada fitur berbagi WhatsApp

### 4. Laporan
- Filter: **Hari Ini | 7 Hari | 30 Hari (default) | Custom** (WIB)
- Indikator: Total Omset, Total QRIS, Total Tunai, jumlah transaksi — dihitung ulang sesuai filter
- Riwayat transaksi dikelompokkan per tanggal, plus tabel Bestseller (Item Terjual)
- Tombol **Export Excel (.xlsx)** mengekspor persis data sesuai filter aktif

### 5. Pengaturan
- **Personalisasi Nota & Toko:** logo (kamera/galeri), nama, telepon, jam operasional, pesan penutup struk
- **QRIS Pembayaran:** unggah/foto QRIS langsung di Pengaturan (selain modal Bayar) lewat `saveQrisFromFile()` dengan status `QrisStatusBadge` ("QRIS Dinamis Aktif" + nama merchant, atau catatan statis jika buram). Reset QRIS menghapus `kokikasir_qris_image` sekaligus `qrisPayload`/`qrisMerchantName`/`qrisMerchantCity`
- **Pengaturan Nota & Printer:** mode `printerMode` = `none` ("Tanpa Printer (Digital)", default) | `browser` ("Cetak Browser (58mm / A4)") | `bluetooth` ("Printer Bluetooth (58mm)"), toggle `autoPrint` ("Cetak Otomatis setelah Bayar", nonaktif bila mode `none`), `lastPrinterName`. Panel Bluetooth: pesan jika browser tidak mendukung, badge "Terhubung: [nama]"/"Belum terhubung", tombol Cari & Hubungkan Printer, Putuskan, Tes Cetak
- **Backup & Restore (.json):** `Backup Data (Download)` → `kokikasir-backup-YYYY-MM-DD.json` berformat `{ app: "KokiKasir", version: 1, exportedAt, data: { storeSettings, qrisImage, menuItems, orders } }` (tanpa PIN cloud). `Restore Data (Import)` memvalidasi file, menampilkan modal konfirmasi ("Restoring will replace all current data on this device. Continue?"), lalu mengganti data dan memperbarui state lewat `restoreBackup()`. Di bawahnya ada panel Cadangan Otomatis (Google Drive), lihat bagian Cloud Backup
- **Reset Data:** pilih granular (transaksi / menu / QRIS), konfirmasi 2 langkah (ketik `HAPUS`)
- Tidak ada UI log error/diagnostik untuk pengguna

## Status Jaringan & Error Handling
- `Header` menampilkan badge: **Online** (Wifi hijau), **Syncing...** (ikon berputar), **Offline** (WifiOff abu-abu)
- Crash fatal: `ErrorBoundary` hanya menampilkan "Terjadi kendala. Muat ulang aplikasi." + tombol **Muat Ulang**. Detail error dicatat senyap lewat `errorLogger` (id, timestamp, message, stack, route, appVersion `1.3.0`, `reported`); token/password/header sensitif di-scrub sebelum disimpan. Pengguna tidak pernah melihat log/stack trace

## Cloud Backup (Google Drive via Apps Script)
Sinkronisasi ringan tanpa dependensi (hanya `fetch`) di `lib/syncService.js`; tidak ada Supabase lagi:
- Pengguna mengisi **Link Cadangan Cloud** (URL Web App Google Apps Script) dan **Kode Keamanan (PIN)** opsional di Pengaturan → tersimpan sebagai `cloudBackupUrl` & `cloudBackupPin` dalam `kokikasir_store_settings`
- `pushCloudBackup(url, pin, payload)`: `POST` `Content-Type: text/plain;charset=utf-8` (menghindari preflight CORS) dengan body `{ pin, payload }`. `pullCloudBackup(url, pin)`: `GET ?pin=...`. Apps Script membalas `{ ok, payload?, error? }`
- Payload = format backup yang sama (`{ app, version: 1, exportedAt, data }`); `buildBackupPayload()` membuang PIN. File backup `.json` lokal juga tidak memuat PIN
- `runCloudBackup()` mengatur status global (`idle | syncing | error`) yang dibaca `useNetworkStatus` (Header menampilkan "Syncing..."). Bila link kosong atau offline: tidak melakukan apa-apa, tanpa error
- `AppContext` memicu cadangan otomatis (debounce ±3 detik) saat orders/menu/pengaturan/QRIS berubah dan saat perangkat kembali online setelah offline; hasilnya memperbarui `kokikasir_last_synced_at` (ISO, ditampilkan WIB lewat `formatWIBDateTime`)
- Pengaturan → panel collapsible **Cadangan Otomatis (Google Drive)**: input link & PIN, waktu terakhir dicadangkan, tombol **Cadangkan Sekarang** dan **Ambil Data dari Cloud** (pull → validasi → modal konfirmasi restore yang sama → `restoreBackup()`)
- `restoreBackup()` mempertahankan link/PIN cloud perangkat bila file cadangan tidak memilikinya
- Belum ada: login/akun, `userId`/`syncStatus` per record, skrip Apps Script bawaan di repo, pengiriman otomatis error log ke cloud

## Konvensi Kerja
- Semua tanggal/jam lewat `utils/dateHelper.js` (WIB), jangan pakai `new Date()` mentah untuk logika tanggal laporan
- Verifikasi perubahan dengan `npx vite build` (peringatan chunk > 500 kB normal)
- Di PowerShell gunakan `;` bukan `&&`
- Setiap kali menambah/mengubah fitur, struktur `src/`, atau alur sinkronisasi, wajib perbarui file konteks ini agar selalu sinkron dengan kondisi kode terbaru.
