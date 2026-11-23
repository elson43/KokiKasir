# Spesifikasi Sistem KokiKasir (PWA POS)

Buatkan saya aplikasi Point of Sales (POS) berbasis web berupa PWA (Progressive Web App) bernama **"KokiKasir"** yang 100% responsif (mobile & tablet-friendly), didesain khusus untuk koki yang merangkap sebagai kasir.

## 🎨 ATURAN DESAIN UI/UX (FRIENDLY MINIMALIST - JADE ORNAMENT VIBES)
- **Warna & Tema:** Gunakan inspirasi warna *Jade Ornament* (Giok) yang segar, ramah, menenangkan, dan tidak mencekam.
  - **Background Utama:** Gunakan hijau giok super muda/putih susu (`bg-emerald-50` atau `bg-teal-50`).
  - **Kartu & Kontainer:** Putih bersih (`bg-white`) dengan bayangan sangat lembut bernuansa hijau (`shadow-sm shadow-emerald-100/50`).
  - **Tombol Aksi Utama:** Gunakan hijau giok yang *soft* namun jelas (`bg-emerald-500` atau `bg-teal-500`) saat *hover* menjadi sedikit lebih gelap.
  - **Teks Utama:** Hindari hitam pekat yang kaku. Gunakan abu-abu kehijauan gelap (`text-emerald-950` atau `text-stone-800`) agar lebih ramah di mata.
- **Bentuk & Sudut:** Wajib gunakan sudut melengkung yang lembut dan *bouncy* (`rounded-2xl` atau `rounded-3xl` pada elemen besar, `rounded-xl` pada tombol) agar UI terasa *friendly* dan modern.
- **Logo & Ikonografi:** Buatkan placeholder SVG Logo gabungan antara "Topi Koki" dan "Tablet/Monitor" dengan gaya *line-art* menggunakan warna `text-emerald-600`. Letakkan logo dan nama "KokiKasir" di: (1) Splash Screen, (2) Header/Sidebar, dan (3) Struk Digital.

## 🏗️ ARSITEKTUR & TEKNOLOGI UTAMA
1. **Offline-First & Reliable:** Gunakan LocalStorage, IndexedDB, atau state management (jika React/Vue) untuk menyimpan data sementara agar aplikasi berfungsi tanpa internet dan bisa didemokan. Tambahkan manifest PWA agar aplikasi bisa di "Add to Home Screen".
2. **Navigasi Efisien:** Gunakan "Bottom Navigation Bar" berlatar putih dengan ikon *outline* tipis untuk layar mobile/tablet, dan Sidebar ringkas untuk laptop.
3. **Animasi Startup (Splash Screen):** Saat aplikasi dibuka, tampilkan Splash Screen full-screen (`bg-emerald-50`) selama 2 detik. Tampilkan Logo KokiKasir dan teks dengan animasi *fade-in* yang ceria/halus, lalu otomatis pindah ke Halaman Home.

Aplikasi ini berfokus pada sistem "Open Bill" tanpa nomor meja, tanpa manajemen stok mentah, dan tanpa sistem diskon. 

## 📦 MODUL UTAMA APLIKASI

### 1. HALAMAN PEMBUATAN PESANAN (HOME / BERANDA)
- Setelah Splash Screen selesai, halaman ini adalah Beranda utama.
- Saat membuka halaman ini, koki WAJIB memasukkan "Nama Pelanggan" di sebuah text input (tanpa border kasar, gunakan `bg-emerald-100/50` dengan focus ring hijau soft).
- **Tipe Pesanan:** Sediakan Toggle/Radio Button wajib pilih: "Makan Sini" (Dine-in) atau "Bungkus" (Takeaway) di dekat Nama Pelanggan.
- Sediakan Filter Kategori Menu (Misal: Makanan, Minuman, Snack) berupa tombol/chips membulat di bagian atas.
- Tampilkan katalog menu dalam bentuk Grid. Menu "Habis" di-gray-out (tidak bisa diklik). Menu "Sembunyikan" jangan ditampilkan.
- Tiap kotak menu menampilkan: Gambar (rounded), Nama, Harga, dan Kontrol Kuantitas (default 0).
- **Kontrol Kuantitas:** Sediakan tombol (+) dan (-), serta angka kuantitas yang bisa diklik dan diketik langsung (direct edit input).
- **Catatan Item:** Jika kuantitas menu > 0, munculkan input teks kecil "Catatan" di bawah menu tersebut (misal: "tanpa bawang", "pedas").
- Di bagian bawah, tampilkan ringkasan pesanan dan Grand Total secara real-time. (Angka total gunakan teks *oversized*, tebal, warna `text-emerald-700`).
- **Tombol aksi:** "Simpan & Buka Tagihan". Jika ditekan, catat waktu, status "UNPAID", dan pindahkan ke Dashboard.

### 2. HALAMAN MANAJEMEN MENU (DATA MASTER)
- **Fitur:** Tambah dan Edit menu. Input mencakup: Gambar Menu (URL/Upload), Nama Produk, Kategori, dan Harga Jual.
- **Status/Visibilitas Menu:** Berikan 3 opsi untuk tiap menu:
  a. Tersedia (Tampil normal).
  b. Habis / Sold Out (Tampil di menu tapi di-gray out).
  c. Sembunyikan (Tidak tampil di Pemesanan, tapi data tidak dihapus permanen).
- Perubahan harga di sini TIDAK merubah harga pada riwayat pesanan yang sudah PAID.

### 3. HALAMAN DASHBOARD (UNPAID & HISTORY PAID)
Buat halaman dengan sistem 2 Tabs:
- **TAB UNPAID (Belum Lunas):** Tampilkan daftar pesanan HARI INI berupa kartu *soft*. Urutkan dari yang terlama. Kartu menampilkan: Nama Pelanggan, Tipe Pesanan, Jam Pesan, dan Total.
- Jika kartu diklik, muncul rincian pesanan beserta 3 tombol aksi:
  1. **"Tambah Pesanan" (Update Order):** Mengarahkan kembali ke Home untuk menyuntikkan menu (Open Bill).
  2. **"Batalkan Tagihan" (Void):** Menghapus pesanan (dengan pop-up konfirmasi bernada peringatan warna merah *soft* / `bg-rose-500`).
  3. **"Bayar":** Menuju proses checkout.
- **Proses Bayar:** Pilih metode QRIS atau TUNAI.
- **Fitur Tunai Cepat:** Jika TUNAI dipilih, tampilkan input field "Uang Diterima" dan otomatis hitung "Kembalian" secara real-time. Sediakan 3 tombol nominal cepat (Misal: "Uang Pas", "50.000", "100.000").
- **Struk Digital:** Setelah dibayar, munculkan Pop-Up UI "Struk Digital" berlatar putih dengan Logo KokiKasir di atasnya, layout menyerupai kertas struk kasir. Setelah ditutup, pindahkan pesanan ke Tab History.

### 4. HALAMAN LAPORAN KEUANGAN (REPORT) & BACKUP
- Menarik data transaksi berstatus PAID. Sediakan Date Picker: "Hari Ini", "Minggu Ini", "Custom".
- Tampilkan 3 indikator: TOTAL OMSET, TOTAL QRIS, dan TOTAL TUNAI (Gunakan ikon hijau *soft* di tiap kartunya).
- Tampilkan Tabel Riwayat Transaksi (Nama, Tipe, Waktu, Metode, Total).
- **Laporan Bestseller:** Tampilkan tabel "Item Terjual" (Nama Menu & Total Porsi) sebagai acuan belanja koki.
- **Keamanan Data (Backup):** Tambahkan tombol "Export Data (CSV)" dengan warna sekunder (misal `bg-stone-200` teks `text-stone-700`) agar koki bisa mengunduh riwayat transaksi.