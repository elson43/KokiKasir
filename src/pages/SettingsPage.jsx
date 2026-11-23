import React, { useState, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { compressImageToBase64 } from '../utils/imageHelper';
import Logo from '../components/Logo';
import { 
  Settings, 
  Trash2, 
  AlertOctagon, 
  X, 
  CheckSquare, 
  Square, 
  Store, 
  Upload, 
  Camera, 
  Phone, 
  Clock, 
  MessageSquare, 
  Save, 
  CheckCircle2, 
  ShieldAlert, 
  HardDrive,
  Info
} from 'lucide-react';

export default function SettingsPage() {
  const { menuItems, orders, qrisImage, storeSettings, setStoreSettings } = useApp();

  // Local state for Store Customization form
  const [storeForm, setStoreForm] = useState({
    logo: storeSettings?.logo || '',
    name: storeSettings?.name || 'KokiKasir',
    phone: storeSettings?.phone || '',
    hours: storeSettings?.hours || '08:00 - 22:00 WIB',
    bio: storeSettings?.bio || 'Terima kasih atas kunjungannya! Semoga menikmati hidangan kami.'
  });

  const [isProcessingLogo, setIsProcessingLogo] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState('');

  // Refs for Logo Upload (Camera & Gallery)
  const logoCameraRef = useRef(null);
  const logoGalleryRef = useRef(null);

  // Granular Reset Modal State
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetStep, setResetStep] = useState(1); // 1 = Checkbox selection, 2 = Type HAPUS
  const [selectedItems, setSelectedItems] = useState({
    orders: false,  // Riwayat Transaksi & Tagihan
    menu: false,    // Semua Menu Master
    qris: false     // Gambar QRIS Toko
  });
  const [confirmInput, setConfirmInput] = useState('');

  // Count selected items for reset
  const selectedCount = Object.values(selectedItems).filter(Boolean).length;
  const isAllSelected = selectedItems.orders && selectedItems.menu && selectedItems.qris;

  // Toggle select all in reset modal
  const handleToggleSelectAll = () => {
    const nextVal = !isAllSelected;
    setSelectedItems({
      orders: nextVal,
      menu: nextVal,
      qris: nextVal
    });
  };

  const handleToggleItem = (key) => {
    setSelectedItems(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  // Handle Logo Upload (Base64)
  const handleLogoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsProcessingLogo(true);
      const base64 = await compressImageToBase64(file, 400, 0.85);
      setStoreForm(prev => ({ ...prev, logo: base64 }));
    } catch (err) {
      alert('Gagal memproses logo toko: ' + err.message);
    } finally {
      setIsProcessingLogo(false);
      e.target.value = '';
    }
  };

  // Save Store Settings
  const handleSaveStoreSettings = (e) => {
    e.preventDefault();
    setStoreSettings(storeForm);
    setSaveSuccessMsg('Pengaturan toko & personalisasi nota berhasil disimpan!');
    setTimeout(() => {
      setSaveSuccessMsg('');
    }, 3500);
  };

  // Open Reset Modal
  const openResetModal = () => {
    setSelectedItems({ orders: false, menu: false, qris: false });
    setResetStep(1);
    setConfirmInput('');
    setShowResetModal(true);
  };

  // Execute Reset
  const handleExecuteReset = () => {
    try {
      if (selectedItems.orders) {
        localStorage.removeItem('kokikasir_orders');
      }
      if (selectedItems.menu) {
        localStorage.removeItem('kokikasir_menu');
      }
      if (selectedItems.qris) {
        localStorage.removeItem('kokikasir_qris_image');
      }

      window.location.reload();
    } catch (e) {
      console.error('Gagal menghapus data:', e);
      window.location.reload();
    }
  };

  return (
    <div className="space-y-6 pb-24 lg:pb-12 max-w-4xl mx-auto">
      {/* Top Banner Info */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-emerald-100 shadow-sm shadow-emerald-100/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center flex-shrink-0 shadow-xs">
            <Settings className="w-6 h-6 stroke-[2.2]" />
          </div>
          <div>
            <h3 className="font-extrabold text-emerald-950 text-lg sm:text-xl">
              Pengaturan Sistem & Personalisasi
            </h3>
            <p className="text-xs text-stone-500 font-medium">
              Sesuaikan identitas toko Anda pada struk nota dan kelola data penyimpanan lokal.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold self-start sm:self-auto">
          <HardDrive className="w-3.5 h-3.5 text-emerald-600" />
          <span>Storage: Local & Offline</span>
        </div>
      </div>

      {/* Alert Sukses Simpan */}
      {saveSuccessMsg && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs sm:text-sm font-bold flex items-center gap-2.5 animate-fade-in shadow-xs">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
          <span>{saveSuccessMsg}</span>
        </div>
      )}

      {/* SEKSI 1: PERSONALISASI NOTA & TOKO */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-emerald-100 shadow-sm shadow-emerald-100/50 space-y-5">
        <div className="flex items-center gap-2.5 pb-3 border-b border-emerald-100">
          <Store className="w-5 h-5 text-emerald-600" />
          <div>
            <h4 className="font-extrabold text-base text-emerald-950">
              Personalisasi Nota & Toko
            </h4>
            <p className="text-xs text-stone-500">
              Data ini otomatis tercetak pada Struk Kasir Digital dan lembar Cetak Laporan.
            </p>
          </div>
        </div>

        <form onSubmit={handleSaveStoreSettings} className="space-y-4">
          {/* Logo Toko (Camera capture="environment" & Gallery) */}
          <div>
            <label className="block text-xs font-bold text-emerald-900 mb-1.5 flex items-center justify-between">
              <span>Logo Toko / Merek Kasir</span>
              {isProcessingLogo && <span className="text-emerald-600 animate-pulse text-[11px]">Memproses logo...</span>}
            </label>

            {/* Hidden inputs */}
            <input
              type="file"
              ref={logoGalleryRef}
              accept="image/*"
              onChange={handleLogoUpload}
              className="hidden"
            />
            <input
              type="file"
              ref={logoCameraRef}
              accept="image/*"
              capture="environment"
              onChange={handleLogoUpload}
              className="hidden"
            />

            {storeForm.logo ? (
              <div className="flex items-center gap-4 p-3 rounded-2xl bg-stone-50 border border-emerald-200">
                <div className="w-20 h-20 rounded-2xl overflow-hidden bg-white border border-stone-200 shadow-xs flex items-center justify-center p-1 flex-shrink-0">
                  <img
                    src={storeForm.logo}
                    alt="Logo Toko"
                    className="w-full h-full object-contain"
                  />
                </div>
                <div className="space-y-1.5">
                  <div className="text-xs font-bold text-emerald-950">Logo Kustom Aktif</div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => logoCameraRef.current?.click()}
                      className="px-2.5 py-1.5 rounded-xl bg-white border border-stone-200 hover:bg-stone-100 text-stone-700 text-xs font-bold flex items-center gap-1 shadow-xs"
                    >
                      <Camera className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Kamera</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => logoGalleryRef.current?.click()}
                      className="px-2.5 py-1.5 rounded-xl bg-white border border-stone-200 hover:bg-stone-100 text-stone-700 text-xs font-bold flex items-center gap-1 shadow-xs"
                    >
                      <Upload className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Galeri</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setStoreForm(prev => ({ ...prev, logo: '' }))}
                      className="px-2.5 py-1.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold shadow-xs hover:bg-rose-100"
                    >
                      Hapus
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => logoCameraRef.current?.click()}
                  className="p-4 rounded-2xl border-2 border-dashed border-emerald-200 hover:border-emerald-500 bg-emerald-50/40 hover:bg-emerald-50 flex items-center justify-center gap-2.5 text-xs font-bold text-emerald-950 transition-colors"
                >
                  <Camera className="w-4 h-4 text-emerald-600" />
                  <span>Jepret Foto Logo (Kamera)</span>
                </button>

                <button
                  type="button"
                  onClick={() => logoGalleryRef.current?.click()}
                  className="p-4 rounded-2xl border-2 border-dashed border-stone-200 hover:border-emerald-400 bg-stone-50/50 hover:bg-stone-50 flex items-center justify-center gap-2.5 text-xs font-bold text-stone-800 transition-colors"
                >
                  <Upload className="w-4 h-4 text-stone-600" />
                  <span>Pilih Logo dari Galeri</span>
                </button>
              </div>
            )}
          </div>

          {/* Nama Toko & Telepon / WhatsApp */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-bold text-emerald-900 mb-1">
                Nama Toko / Resto / Cafe <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={storeForm.name}
                onChange={(e) => setStoreForm(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Contoh: KokiKasir Warung Nusantara"
                className="w-full px-4 py-2.5 rounded-xl bg-emerald-50/50 border border-emerald-200 text-sm font-bold text-emerald-950 focus:outline-none focus:ring-2 focus:ring-emerald-400"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-emerald-900 mb-1 flex items-center gap-1">
                <Phone className="w-3.5 h-3.5 text-emerald-600" />
                <span>Nomor Telepon / WhatsApp</span>
              </label>
              <input
                type="text"
                value={storeForm.phone}
                onChange={(e) => setStoreForm(prev => ({ ...prev, phone: e.target.value }))}
                placeholder="Contoh: 0812-3456-7890"
                className="w-full px-4 py-2.5 rounded-xl bg-emerald-50/50 border border-emerald-200 text-sm font-semibold text-emerald-950 focus:outline-none focus:ring-2 focus:ring-emerald-400"
              />
            </div>
          </div>

          {/* Jam Operasional */}
          <div>
            <label className="block text-xs font-bold text-emerald-900 mb-1 flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-emerald-600" />
              <span>Jam Operasional</span>
            </label>
            <input
              type="text"
              value={storeForm.hours}
              onChange={(e) => setStoreForm(prev => ({ ...prev, hours: e.target.value }))}
              placeholder="Contoh: 08:00 - 22:00 WIB"
              className="w-full px-4 py-2.5 rounded-xl bg-emerald-50/50 border border-emerald-200 text-sm font-semibold text-emerald-950 focus:outline-none focus:ring-2 focus:ring-emerald-400"
            />
          </div>

          {/* Deskripsi / Bio Singkat (Footer Struk) */}
          <div>
            <label className="block text-xs font-bold text-emerald-900 mb-1 flex items-center gap-1">
              <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
              <span>Pesan Penutup Struk (Bio / Ucapan Terima Kasih)</span>
            </label>
            <textarea
              rows={2}
              value={storeForm.bio}
              onChange={(e) => setStoreForm(prev => ({ ...prev, bio: e.target.value }))}
              placeholder="Contoh: Terima kasih atas kunjungannya! Follow IG kami: @warung_koki"
              className="w-full px-4 py-2.5 rounded-xl bg-emerald-50/50 border border-emerald-200 text-xs font-medium text-emerald-950 focus:outline-none focus:ring-2 focus:ring-emerald-400"
            />
          </div>

          {/* Tombol Simpan Toko */}
          <div className="pt-1 flex justify-end">
            <button
              type="submit"
              className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-white font-extrabold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md shadow-emerald-500/25 active:scale-95 transition-all"
            >
              <Save className="w-4 h-4" />
              <span>Simpan Pengaturan Toko</span>
            </button>
          </div>
        </form>
      </div>

      {/* SEKSI 2: PENYEDERHANAAN UI RESET DATA APLIKASI (SATU TOMBOL UTAMA) */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-rose-100 shadow-sm shadow-rose-100/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-rose-600 font-extrabold text-sm mb-1">
            <ShieldAlert className="w-4 h-4" />
            <span>Pemeliharaan & Pembersihan Data</span>
          </div>
          <p className="text-xs text-stone-600 max-w-xl leading-relaxed">
            Bersihkan data transaksi, menu, atau barcode QRIS secara terspesifikasi tanpa mempengaruhi konfigurasi yang tidak Anda pilih.
          </p>
        </div>

        {/* SATU TOMBOL UTAMA: RESET DATA APLIKASI */}
        <button
          type="button"
          onClick={openResetModal}
          className="px-5 py-3 rounded-2xl bg-rose-500 hover:bg-rose-600 text-white font-extrabold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md shadow-rose-500/25 active:scale-95 transition-all flex-shrink-0"
        >
          <Trash2 className="w-4 h-4" />
          <span>Reset Data Aplikasi</span>
        </button>
      </div>

      {/* Informasi Sistem & Status PWA */}
      <div className="bg-white rounded-3xl p-5 border border-emerald-100 shadow-sm shadow-emerald-100/40 text-xs text-stone-600 space-y-2">
        <h4 className="font-bold text-emerald-950 flex items-center gap-2">
          <Info className="w-4 h-4 text-emerald-600" />
          <span>Informasi KokiKasir PWA</span>
        </h4>
        <p className="text-stone-500 leading-relaxed">
          Versi 1.2 Enterprise • PWA POS Offline-First. Seluruh data transaksi, menu, dan preferensi toko disimpan langsung di peramban lokal perangkat tanpa memerlukan sambungan internet.
        </p>
      </div>

      {/* MODAL RESET DATA APLIKASI (CHECKBOX GRANULAR & KONFIRMASI GANDA) */}
      {showResetModal && (
        <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-rose-100 space-y-5">
            {/* Header Modal */}
            <div className="flex items-start justify-between pb-3 border-b border-rose-100">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center flex-shrink-0">
                  <AlertOctagon className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-rose-950">
                    {resetStep === 1 ? 'Pilih Data yang Mau Direset' : 'Konfirmasi Terakhir (Ketik HAPUS)'}
                  </h3>
                  <span className="text-[11px] text-stone-500 font-semibold">
                    Langkah {resetStep} dari 2
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowResetModal(false)}
                className="w-8 h-8 rounded-full bg-stone-100 text-stone-500 flex items-center justify-center hover:bg-stone-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Step 1: Checklist Granular Reset */}
            {resetStep === 1 && (
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-1">
                  <span className="text-xs font-bold text-stone-700">Centang data yang ingin dihapus:</span>
                  <button
                    type="button"
                    onClick={handleToggleSelectAll}
                    className="text-xs font-bold text-rose-600 hover:underline flex items-center gap-1"
                  >
                    {isAllSelected ? <CheckSquare className="w-3.5 h-3.5" /> : <Square className="w-3.5 h-3.5" />}
                    <span>{isAllSelected ? 'Batalkan Semua' : 'Pilih Semua'}</span>
                  </button>
                </div>

                <div className="space-y-2.5">
                  {/* [ ] Riwayat Transaksi & Tagihan */}
                  <div
                    onClick={() => handleToggleItem('orders')}
                    className={`p-3.5 rounded-2xl border cursor-pointer select-none transition-all flex items-center justify-between ${
                      selectedItems.orders
                        ? 'bg-rose-50/80 border-rose-300 shadow-xs'
                        : 'bg-stone-50/60 hover:bg-stone-100/60 border-stone-200'
                    }`}
                  >
                    <div>
                      <div className="font-bold text-xs text-stone-900">
                        Riwayat Transaksi & Tagihan
                      </div>
                      <div className="text-[11px] text-stone-500 mt-0.5">
                        Mengosongkan {orders.length} data order & laporan
                      </div>
                    </div>
                    <div className={`w-5 h-5 rounded-md flex items-center justify-center border ${
                      selectedItems.orders ? 'bg-rose-600 border-rose-600 text-white' : 'border-stone-300 bg-white'
                    }`}>
                      {selectedItems.orders && <CheckSquare className="w-4 h-4" />}
                    </div>
                  </div>

                  {/* [ ] Semua Menu Master */}
                  <div
                    onClick={() => handleToggleItem('menu')}
                    className={`p-3.5 rounded-2xl border cursor-pointer select-none transition-all flex items-center justify-between ${
                      selectedItems.menu
                        ? 'bg-rose-50/80 border-rose-300 shadow-xs'
                        : 'bg-stone-50/60 hover:bg-stone-100/60 border-stone-200'
                    }`}
                  >
                    <div>
                      <div className="font-bold text-xs text-stone-900">
                        Semua Menu Master
                      </div>
                      <div className="text-[11px] text-stone-500 mt-0.5">
                        Mengosongkan {menuItems.length} menu makanan & minuman
                      </div>
                    </div>
                    <div className={`w-5 h-5 rounded-md flex items-center justify-center border ${
                      selectedItems.menu ? 'bg-rose-600 border-rose-600 text-white' : 'border-stone-300 bg-white'
                    }`}>
                      {selectedItems.menu && <CheckSquare className="w-4 h-4" />}
                    </div>
                  </div>

                  {/* [ ] Gambar QRIS Toko */}
                  <div
                    onClick={() => handleToggleItem('qris')}
                    className={`p-3.5 rounded-2xl border cursor-pointer select-none transition-all flex items-center justify-between ${
                      selectedItems.qris
                        ? 'bg-rose-50/80 border-rose-300 shadow-xs'
                        : 'bg-stone-50/60 hover:bg-stone-100/60 border-stone-200'
                    }`}
                  >
                    <div>
                      <div className="font-bold text-xs text-stone-900">
                        Gambar QRIS Toko
                      </div>
                      <div className="text-[11px] text-stone-500 mt-0.5">
                        Menghapus barcode QRIS statis tersimpan
                      </div>
                    </div>
                    <div className={`w-5 h-5 rounded-md flex items-center justify-center border ${
                      selectedItems.qris ? 'bg-rose-600 border-rose-600 text-white' : 'border-stone-300 bg-white'
                    }`}>
                      {selectedItems.qris && <CheckSquare className="w-4 h-4" />}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowResetModal(false)}
                    className="py-3 rounded-2xl bg-stone-100 hover:bg-stone-200 text-stone-800 font-bold text-xs"
                  >
                    Batalkan
                  </button>
                  <button
                    type="button"
                    disabled={selectedCount === 0}
                    onClick={() => setResetStep(2)}
                    className="py-3 rounded-2xl bg-rose-500 hover:bg-rose-600 disabled:opacity-30 disabled:pointer-events-none text-white font-black text-xs shadow-md shadow-rose-500/20"
                  >
                    Lanjutkan ({selectedCount}) →
                  </button>
                </div>
              </div>
            )}

            {/* Step 2: Strict Typing Confirmation */}
            {resetStep === 2 && (
              <div className="space-y-4">
                <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-950 space-y-2">
                  <p className="font-bold">
                    Ketik kata <span className="font-black text-rose-700 bg-rose-100 px-1.5 py-0.5 rounded">HAPUS</span> di bawah ini untuk mengonfirmasi pembersihan {selectedCount} modul data terpilih:
                  </p>
                  <input
                    type="text"
                    value={confirmInput}
                    onChange={(e) => setConfirmInput(e.target.value)}
                    placeholder="Ketik HAPUS"
                    className="w-full px-4 py-3 rounded-xl bg-white border border-rose-300 font-black text-center text-rose-700 text-base uppercase tracking-wider focus:outline-none focus:ring-2 focus:ring-rose-500"
                    autoFocus
                  />
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setResetStep(1)}
                    className="py-3 rounded-2xl bg-stone-100 hover:bg-stone-200 text-stone-800 font-bold text-xs"
                  >
                    ← Kembali
                  </button>
                  <button
                    type="button"
                    disabled={confirmInput.trim().toUpperCase() !== 'HAPUS'}
                    onClick={handleExecuteReset}
                    className="py-3 rounded-2xl bg-rose-600 hover:bg-rose-700 disabled:opacity-30 disabled:pointer-events-none text-white font-black text-xs shadow-lg shadow-rose-600/30 flex items-center justify-center gap-1.5"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>Hapus Data Terpilih</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
