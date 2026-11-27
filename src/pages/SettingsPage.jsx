import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { compressImageToBase64 } from '../utils/imageHelper';
import { getLocalDate, formatDateShortID, formatWIBDateTime } from '../utils/dateHelper';
import {
  isBluetoothSupported,
  getPrinterStatus,
  subscribePrinterStatus,
  connectPrinter,
  disconnectPrinter,
  printTestReceipt
} from '../utils/bluetoothPrinter';
import {
  runCloudBackup,
  pullCloudBackup,
  getLastSyncedAt
} from '../lib/syncService';
import { useNetworkStatus } from '../hooks/useNetworkStatus';
import Logo from '../components/Logo';
import QrisStatusBadge from '../components/QrisStatusBadge';
import { 
  Settings, 
  Trash2, 
  AlertOctagon, 
  X, 
  CheckSquare, 
  Square, 
  Store, 
  Upload, 
  Download,
  Camera, 
  Phone, 
  Clock, 
  MessageSquare, 
  Save, 
  CheckCircle2, 
  ShieldAlert, 
  HardDrive,
  Info,
  Database,
  AlertTriangle,
  Printer,
  Bluetooth,
  Cloud,
  ChevronDown,
  CreditCard
} from 'lucide-react';

/**
 * Validasi struktur file JSON backup KokiKasir
 */
function isValidKokiKasirBackup(parsed) {
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return false;
  if (parsed.app !== 'KokiKasir') return false;
  if (parsed.version !== 1) return false;
  if (!parsed.data || typeof parsed.data !== 'object' || Array.isArray(parsed.data)) return false;
  if (!Array.isArray(parsed.data.menuItems)) return false;
  if (!Array.isArray(parsed.data.orders)) return false;
  if (
    parsed.data.storeSettings !== undefined &&
    (!parsed.data.storeSettings || typeof parsed.data.storeSettings !== 'object' || Array.isArray(parsed.data.storeSettings))
  ) {
    return false;
  }
  if (parsed.data.qrisImage !== undefined && typeof parsed.data.qrisImage !== 'string') {
    return false;
  }
  return true;
}

export default function SettingsPage() {
  const {
    menuItems,
    orders,
    qrisImage,
    saveQrisFromFile,
    clearQris,
    qrisDecoding,
    storeSettings,
    setStoreSettings,
    restoreBackup
  } = useApp();

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
  const [backupErrorMsg, setBackupErrorMsg] = useState('');

  // Refs for Logo Upload (Camera & Gallery), QRIS Upload, & Backup Restore File Input
  const logoCameraRef = useRef(null);
  const logoGalleryRef = useRef(null);
  const qrisCameraRef = useRef(null);
  const qrisGalleryRef = useRef(null);
  const restoreFileInputRef = useRef(null);

  const handleSettingsQrisUpload = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    const result = await saveQrisFromFile(file);
    if (result?.ok) {
      showSuccessToast('QRIS Dinamis aktif! Nominal akan terisi otomatis saat pembeli scan.');
    } else {
      showSuccessToast('Foto QRIS tersimpan sebagai QRIS statis.');
    }
  };

  // Restore Backup Confirmation Modal State
  const [showRestoreConfirmModal, setShowRestoreConfirmModal] = useState(false);
  const [pendingBackup, setPendingBackup] = useState(null);

  const showSuccessToast = (msg) => {
    setSaveSuccessMsg(msg);
    setTimeout(() => {
      setSaveSuccessMsg('');
    }, 3500);
  };

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
      const base64 = await compressImageToBase64(file, 'logo');
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
    setStoreSettings(prev => ({ ...prev, ...storeForm }));
    showSuccessToast('Pengaturan toko & personalisasi nota berhasil disimpan!');
  };

  // Helper aman membaca JSON dari localStorage
  const readStoredJson = (key, fallback) => {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch {
      return fallback;
    }
  };

  // Export Backup (.json) dari seluruh data lokal
  const handleBackupDownload = () => {
    setBackupErrorMsg('');

    try {
      const storedSettings = readStoredJson('kokikasir_store_settings', storeSettings);
      // PIN cloud bersifat rahasia dan tidak ikut dalam file backup
      // eslint-disable-next-line no-unused-vars
      const { cloudBackupPin, ...settingsWithoutPin } = storedSettings || {};
      const storedQris = localStorage.getItem('kokikasir_qris_image') ?? qrisImage ?? '';
      const storedMenu = readStoredJson('kokikasir_menu', menuItems);
      const storedOrders = readStoredJson('kokikasir_orders', orders);

      const backupPayload = {
        app: 'KokiKasir',
        version: 1,
        exportedAt: new Date().toISOString(),
        data: {
          storeSettings: settingsWithoutPin,
          qrisImage: storedQris,
          menuItems: storedMenu,
          orders: storedOrders
        }
      };

      const blob = new Blob([JSON.stringify(backupPayload, null, 2)], {
        type: 'application/json'
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `kokikasir-backup-${getLocalDate()}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      showSuccessToast('File backup JSON berhasil diunduh!');
    } catch (err) {
      setBackupErrorMsg('Gagal membuat file backup: ' + err.message);
    }
  };

  // Pilih & Validasi File Backup (.json) sebelum konfirmasi restore
  const handleRestoreFileSelect = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setBackupErrorMsg('');

    try {
      const text = await file.text();
      const parsed = JSON.parse(text);

      if (!isValidKokiKasirBackup(parsed)) {
        setBackupErrorMsg('File tidak valid! Pastikan Anda memilih file backup resmi KokiKasir (.json).');
        return;
      }

      setPendingBackup({
        fileName: file.name,
        payload: parsed
      });
      setShowRestoreConfirmModal(true);
    } catch {
      setBackupErrorMsg('Gagal membaca file JSON. Pastikan file backup tidak rusak dan berformat .json yang valid.');
    }
  };

  // Eksekusi Restore setelah konfirmasi user
  const handleConfirmRestore = () => {
    if (!pendingBackup?.payload?.data) return;

    try {
      const restored = restoreBackup(pendingBackup.payload.data);
      setStoreForm(restored.storeSettings);
      setShowRestoreConfirmModal(false);
      setPendingBackup(null);
      setBackupErrorMsg('');
      showSuccessToast('Data berhasil dipulihkan! Semua menu, pengaturan, dan laporan telah diperbarui.');
    } catch (err) {
      setShowRestoreConfirmModal(false);
      setPendingBackup(null);
      setBackupErrorMsg('Gagal memulihkan data (memori perangkat penuh atau file rusak): ' + err.message);
    }
  };

  // Simpan sebagian pengaturan toko tanpa menimpa field lain
  const updateSettings = (partial) => {
    setStoreSettings(prev => ({ ...prev, ...partial }));
  };

  /* ───────────── Pengaturan Nota & Printer ───────────── */
  const bluetoothSupported = isBluetoothSupported();
  const [printerStatus, setPrinterStatus] = useState(() => getPrinterStatus());
  const [printerBusy, setPrinterBusy] = useState(false);
  const [printerMsg, setPrinterMsg] = useState('');

  useEffect(() => subscribePrinterStatus(setPrinterStatus), []);

  const printerMode = storeSettings?.printerMode || 'none';
  const autoPrintEnabled = Boolean(storeSettings?.autoPrint) && printerMode !== 'none';

  const printerModeOptions = [
    { id: 'none', label: 'Tanpa Printer (Digital)', desc: 'Struk hanya tampil di layar.' },
    { id: 'browser', label: 'Cetak Browser (58mm / A4)', desc: 'Cetak lewat dialog printer browser.' },
    { id: 'bluetooth', label: 'Printer Bluetooth (58mm)', desc: 'Cetak langsung ke printer thermal.' }
  ];

  const handleConnectPrinter = async () => {
    setPrinterMsg('');
    setPrinterBusy(true);
    try {
      const name = await connectPrinter();
      updateSettings({ lastPrinterName: name });
      setPrinterMsg(`Printer "${name}" berhasil terhubung.`);
    } catch (err) {
      if (err?.name === 'NotFoundError') {
        setPrinterMsg('Pemilihan printer dibatalkan.');
      } else {
        setPrinterMsg(err?.message || 'Gagal menghubungkan printer. Pastikan printer menyala dan Bluetooth aktif.');
      }
    } finally {
      setPrinterBusy(false);
    }
  };

  const handleDisconnectPrinter = () => {
    disconnectPrinter();
    setPrinterMsg('Printer diputuskan.');
  };

  const handleTestPrint = async () => {
    setPrinterMsg('');
    setPrinterBusy(true);
    try {
      await printTestReceipt(storeSettings);
      setPrinterMsg('Tes cetak terkirim ke printer.');
    } catch (err) {
      setPrinterMsg(err?.message || 'Tes cetak gagal. Coba hubungkan ulang printer.');
    } finally {
      setPrinterBusy(false);
    }
  };

  /* ───────────── Cadangan Otomatis (Google Drive) ───────────── */
  const { isOnline, syncState } = useNetworkStatus();
  const [cloudOpen, setCloudOpen] = useState(false);
  const [cloudForm, setCloudForm] = useState({
    url: storeSettings?.cloudBackupUrl || '',
    pin: storeSettings?.cloudBackupPin || ''
  });
  const [cloudBusy, setCloudBusy] = useState('');
  const [cloudMsg, setCloudMsg] = useState({ type: '', text: '' });
  const [lastSyncedAt, setLastSyncedAt] = useState(() => getLastSyncedAt());

  useEffect(() => {
    setLastSyncedAt(getLastSyncedAt());
  }, [syncState]);

  const saveCloudForm = () => {
    const url = cloudForm.url.trim();
    const pin = cloudForm.pin.trim();
    updateSettings({ cloudBackupUrl: url, cloudBackupPin: pin });
    return { url, pin };
  };

  const handleSaveCloudSettings = () => {
    saveCloudForm();
    setCloudMsg({ type: 'ok', text: 'Pengaturan cadangan cloud disimpan.' });
  };

  const handleCloudPush = async () => {
    setCloudMsg({ type: '', text: '' });
    const { url, pin } = saveCloudForm();

    if (!url) {
      setCloudMsg({ type: 'error', text: 'Isi Link Cadangan Cloud terlebih dahulu.' });
      return;
    }
    if (!isOnline) {
      setCloudMsg({ type: 'error', text: 'Perangkat sedang offline. Coba lagi saat tersambung internet.' });
      return;
    }

    setCloudBusy('push');
    const result = await runCloudBackup({
      storeSettings: { ...storeSettings, cloudBackupUrl: url, cloudBackupPin: pin },
      qrisImage,
      menuItems,
      orders
    });
    setCloudBusy('');
    setLastSyncedAt(getLastSyncedAt());

    if (result.ok) {
      setCloudMsg({ type: 'ok', text: 'Data berhasil dicadangkan ke cloud.' });
    } else if (result.skipped) {
      setCloudMsg({ type: 'error', text: 'Pencadangan sedang berjalan. Coba lagi sebentar.' });
    } else {
      setCloudMsg({ type: 'error', text: result.error || 'Pencadangan gagal. Periksa link dan kode keamanan.' });
    }
  };

  const handleCloudPull = async () => {
    setCloudMsg({ type: '', text: '' });
    const { url, pin } = saveCloudForm();

    if (!url) {
      setCloudMsg({ type: 'error', text: 'Isi Link Cadangan Cloud terlebih dahulu.' });
      return;
    }
    if (!isOnline) {
      setCloudMsg({ type: 'error', text: 'Perangkat sedang offline. Coba lagi saat tersambung internet.' });
      return;
    }

    setCloudBusy('pull');
    try {
      const payload = await pullCloudBackup(url, pin);
      if (!isValidKokiKasirBackup(payload)) {
        setCloudMsg({ type: 'error', text: 'Data di cloud bukan cadangan KokiKasir yang valid.' });
        return;
      }
      setPendingBackup({ fileName: 'Cadangan Cloud (Google Drive)', payload });
      setShowRestoreConfirmModal(true);
    } catch (err) {
      setCloudMsg({ type: 'error', text: err?.message || 'Gagal mengambil data dari cloud.' });
    } finally {
      setCloudBusy('');
    }
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
        try {
          const rawSettings = localStorage.getItem('kokikasir_store_settings');
          if (rawSettings) {
            const parsedSettings = JSON.parse(rawSettings);
            parsedSettings.qrisPayload = '';
            parsedSettings.qrisMerchantName = '';
            parsedSettings.qrisMerchantCity = '';
            localStorage.setItem('kokikasir_store_settings', JSON.stringify(parsedSettings));
          }
        } catch {
          // abaikan
        }
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
              Sesuaikan identitas toko Anda pada struk nota dan kelola data di perangkat ini.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold self-start sm:self-auto">
          <HardDrive className="w-3.5 h-3.5 text-emerald-600" />
          <span>Tersimpan otomatis di perangkat</span>
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

      {/* SEKSI: QRIS PEMBAYARAN (STATIS → DINAMIS OTOMATIS) */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-emerald-100 shadow-sm shadow-emerald-100/50 space-y-4">
        <div className="flex items-center gap-2.5 pb-3 border-b border-emerald-100">
          <CreditCard className="w-5 h-5 text-emerald-600" />
          <div>
            <h4 className="font-extrabold text-base text-emerald-950">QRIS Pembayaran</h4>
            <p className="text-xs text-stone-500">
              Unggah foto QRIS toko sekali saja agar nominal tagihan terisi otomatis saat pembeli scan.
            </p>
          </div>
        </div>

        {/* Hidden inputs kamera & galeri */}
        <input
          type="file"
          ref={qrisCameraRef}
          accept="image/*"
          capture="environment"
          onChange={handleSettingsQrisUpload}
          className="hidden"
        />
        <input
          type="file"
          ref={qrisGalleryRef}
          accept="image/*"
          onChange={handleSettingsQrisUpload}
          className="hidden"
        />

        {qrisImage ? (
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row items-center gap-4 p-3.5 rounded-2xl bg-stone-50 border border-stone-200">
              <div className="w-24 h-24 rounded-2xl bg-white border border-emerald-200 p-1.5 flex items-center justify-center flex-shrink-0 overflow-hidden shadow-xs">
                <img
                  src={qrisImage}
                  alt="QRIS Toko"
                  className="w-full h-full object-contain rounded-lg"
                />
              </div>
              <div className="flex-1 w-full space-y-2.5">
                <QrisStatusBadge />
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={qrisDecoding}
                    onClick={() => qrisCameraRef.current?.click()}
                    className="px-3 py-1.5 rounded-xl bg-white border border-emerald-200 hover:bg-emerald-50 text-emerald-800 font-bold text-xs flex items-center gap-1.5 disabled:opacity-50"
                  >
                    <Camera className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Foto Ulang</span>
                  </button>
                  <button
                    type="button"
                    disabled={qrisDecoding}
                    onClick={() => qrisGalleryRef.current?.click()}
                    className="px-3 py-1.5 rounded-xl bg-white border border-stone-200 hover:bg-stone-100 text-stone-700 font-bold text-xs flex items-center gap-1.5 disabled:opacity-50"
                  >
                    <Upload className="w-3.5 h-3.5 text-stone-600" />
                    <span>Pilih dari Galeri</span>
                  </button>
                  <button
                    type="button"
                    onClick={clearQris}
                    className="px-3 py-1.5 rounded-xl bg-white border border-rose-200 hover:bg-rose-50 text-rose-600 font-bold text-xs"
                  >
                    Hapus
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <button
              type="button"
              disabled={qrisDecoding}
              onClick={() => qrisCameraRef.current?.click()}
              className="py-3 px-4 rounded-2xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 font-bold text-xs flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
            >
              <Camera className="w-4 h-4 text-emerald-600" />
              <span>{qrisDecoding ? 'Memproses...' : 'Foto QRIS (Kamera)'}</span>
            </button>
            <button
              type="button"
              disabled={qrisDecoding}
              onClick={() => qrisGalleryRef.current?.click()}
              className="py-3 px-4 rounded-2xl bg-stone-50 hover:bg-stone-100 border border-stone-200 text-stone-700 font-bold text-xs flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
            >
              <Upload className="w-4 h-4 text-stone-600" />
              <span>{qrisDecoding ? 'Memproses...' : 'Pilih QRIS dari Galeri'}</span>
            </button>
          </div>
        )}
      </div>

      {/* SEKSI: PENGATURAN NOTA & PRINTER */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-emerald-100 shadow-sm shadow-emerald-100/50 space-y-4">
        <div className="flex items-center gap-2.5 pb-3 border-b border-emerald-100">
          <Printer className="w-5 h-5 text-emerald-600" />
          <div>
            <h4 className="font-extrabold text-base text-emerald-950">Pengaturan Nota &amp; Printer</h4>
            <p className="text-xs text-stone-500">Pilih cara struk dicetak setelah pembayaran.</p>
          </div>
        </div>

        {/* Mode Printer */}
        <div className="space-y-2">
          {printerModeOptions.map((opt) => {
            const active = printerMode === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => updateSettings({ printerMode: opt.id })}
                className={`w-full text-left p-3.5 rounded-2xl border flex items-center justify-between gap-3 transition-all ${
                  active
                    ? 'bg-emerald-50 border-emerald-400 shadow-xs'
                    : 'bg-stone-50/60 hover:bg-stone-100/60 border-stone-200'
                }`}
              >
                <div>
                  <div className="text-xs font-bold text-emerald-950">{opt.label}</div>
                  <div className="text-[11px] text-stone-500 mt-0.5">{opt.desc}</div>
                </div>
                <span
                  className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                    active ? 'border-emerald-500' : 'border-stone-300'
                  }`}
                >
                  {active && <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>}
                </span>
              </button>
            );
          })}
        </div>

        {/* Panel Bluetooth */}
        {printerMode === 'bluetooth' && (
          <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200 space-y-3">
            {!bluetoothSupported ? (
              <p className="text-xs text-stone-600 leading-relaxed">
                Browser ini belum mendukung printer Bluetooth langsung. Gunakan Chrome di Android/Laptop, atau pilih Cetak Browser.
              </p>
            ) : (
              <>
                <div className="flex items-center gap-2 text-xs font-bold">
                  <Bluetooth className={`w-4 h-4 ${printerStatus.connected ? 'text-emerald-600' : 'text-stone-400'}`} />
                  <span
                    className={`px-2.5 py-1 rounded-full ${
                      printerStatus.connected
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-stone-200 text-stone-600'
                    }`}
                  >
                    {printerStatus.connected ? `Terhubung: ${printerStatus.name}` : 'Belum terhubung'}
                  </span>
                </div>

                {!printerStatus.connected && storeSettings?.lastPrinterName && (
                  <p className="text-[11px] text-stone-500">
                    Printer terakhir: {storeSettings.lastPrinterName}
                  </p>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={handleConnectPrinter}
                    disabled={printerBusy}
                    className="py-2.5 px-3 rounded-2xl bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white font-extrabold text-xs shadow-md shadow-emerald-500/20 active:scale-95 transition-all"
                  >
                    {printerBusy ? 'Memproses...' : 'Cari & Hubungkan Printer'}
                  </button>
                  <button
                    type="button"
                    onClick={handleDisconnectPrinter}
                    disabled={!printerStatus.connected || printerBusy}
                    className="py-2.5 px-3 rounded-2xl bg-stone-100 hover:bg-stone-200 disabled:opacity-40 text-stone-800 font-bold text-xs transition-colors"
                  >
                    Putuskan
                  </button>
                  <button
                    type="button"
                    onClick={handleTestPrint}
                    disabled={!printerStatus.connected || printerBusy}
                    className="py-2.5 px-3 rounded-2xl bg-stone-100 hover:bg-stone-200 disabled:opacity-40 text-stone-800 font-bold text-xs transition-colors"
                  >
                    Tes Cetak
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {printerMsg && (
          <p className="text-xs font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2">
            {printerMsg}
          </p>
        )}

        {/* Toggle Cetak Otomatis */}
        <div
          className={`flex items-center justify-between gap-3 p-3.5 rounded-2xl border ${
            printerMode === 'none' ? 'bg-stone-50 border-stone-200 opacity-60' : 'bg-white border-emerald-100'
          }`}
        >
          <div>
            <div className="text-xs font-bold text-emerald-950">Cetak Otomatis setelah Bayar</div>
            <div className="text-[11px] text-stone-500 mt-0.5">
              {printerMode === 'none' ? 'Pilih mode printer terlebih dahulu.' : 'Nota langsung dicetak saat pembayaran selesai.'}
            </div>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={autoPrintEnabled}
            disabled={printerMode === 'none'}
            onClick={() => updateSettings({ autoPrint: !storeSettings?.autoPrint })}
            className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 disabled:cursor-not-allowed ${
              autoPrintEnabled ? 'bg-emerald-500' : 'bg-stone-300'
            }`}
          >
            <span
              className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
                autoPrintEnabled ? 'translate-x-5' : 'translate-x-0'
              }`}
            ></span>
          </button>
        </div>
      </div>

      {/* SEKSI 2: BACKUP & RESTORE DATA OFFLINE (.JSON) */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-emerald-100 shadow-sm shadow-emerald-100/50 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-emerald-100">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center flex-shrink-0">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-extrabold text-base text-emerald-950">
                Backup & Restore Data
              </h4>
              <p className="text-xs text-stone-500">
                Simpan cadangan seluruh data aplikasi ke file <code>.json</code> atau pulihkan data di perangkat ini secara offline.
              </p>
            </div>
          </div>
        </div>

        {/* Ringkasan Data Saat Ini */}
        <div className="flex flex-wrap gap-2 text-[11px] font-bold">
          <span className="px-3 py-1 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-100">
            {menuItems.length} Menu
          </span>
          <span className="px-3 py-1 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-100">
            {orders.length} Transaksi & Tagihan
          </span>
          <span className="px-3 py-1 rounded-xl bg-stone-50 text-stone-700 border border-stone-200">
            {qrisImage ? 'QRIS Tersimpan' : 'Belum Ada QRIS'}
          </span>
          <span className="px-3 py-1 rounded-xl bg-stone-50 text-stone-700 border border-stone-200">
            {storeSettings?.logo ? 'Logo Kustom Aktif' : 'Logo Default'}
          </span>
        </div>

        {/* Error Alert Backup/Restore */}
        {backupErrorMsg && (
          <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold flex items-center gap-2.5 animate-fade-in">
            <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0" />
            <span>{backupErrorMsg}</span>
          </div>
        )}

        {/* Hidden Input File untuk Restore (.json) */}
        <input
          type="file"
          ref={restoreFileInputRef}
          accept=".json,application/json"
          onChange={handleRestoreFileSelect}
          className="hidden"
        />

        {/* Tombol Backup & Restore */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          <button
            type="button"
            onClick={handleBackupDownload}
            className="py-3.5 px-4 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-white font-extrabold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md shadow-emerald-500/20 active:scale-95 transition-all"
          >
            <Download className="w-4 h-4" />
            <span>Backup Data (Download)</span>
          </button>

          <button
            type="button"
            onClick={() => restoreFileInputRef.current?.click()}
            className="py-3.5 px-4 rounded-2xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 font-extrabold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-xs active:scale-95 transition-all"
          >
            <Upload className="w-4 h-4 text-amber-700" />
            <span>Restore Data (Import)</span>
          </button>
        </div>

        {/* Cadangan Otomatis (Google Drive) */}
        <div className="rounded-2xl border border-emerald-100 overflow-hidden">
          <button
            type="button"
            onClick={() => setCloudOpen(prev => !prev)}
            className="w-full flex items-center justify-between gap-3 px-4 py-3 bg-emerald-50/60 hover:bg-emerald-50 text-left transition-colors"
          >
            <span className="flex items-center gap-2 text-sm font-extrabold text-emerald-950">
              <Cloud className="w-4 h-4 text-emerald-600" />
              Cadangan Otomatis (Google Drive)
            </span>
            <ChevronDown className={`w-4 h-4 text-emerald-700 transition-transform ${cloudOpen ? 'rotate-180' : ''}`} />
          </button>

          {cloudOpen && (
            <div className="p-4 space-y-3 bg-white">
              <div>
                <label className="block text-xs font-bold text-emerald-900 mb-1">Link Cadangan Cloud</label>
                <input
                  type="url"
                  value={cloudForm.url}
                  onChange={(e) => setCloudForm(prev => ({ ...prev, url: e.target.value }))}
                  placeholder="https://script.google.com/macros/s/.../exec"
                  className="w-full px-4 py-2.5 rounded-xl bg-emerald-50/50 border border-emerald-200 text-xs font-semibold text-emerald-950 focus:outline-none focus:ring-2 focus:ring-emerald-400"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-emerald-900 mb-1">Kode Keamanan (PIN)</label>
                <input
                  type="password"
                  value={cloudForm.pin}
                  onChange={(e) => setCloudForm(prev => ({ ...prev, pin: e.target.value }))}
                  placeholder="Opsional"
                  autoComplete="off"
                  className="w-full px-4 py-2.5 rounded-xl bg-emerald-50/50 border border-emerald-200 text-xs font-semibold text-emerald-950 focus:outline-none focus:ring-2 focus:ring-emerald-400"
                />
              </div>

              <div className="text-[11px] text-stone-500 space-y-0.5">
                <p>
                  Terakhir dicadangkan:{' '}
                  <span className="font-bold text-emerald-900">
                    {lastSyncedAt ? formatWIBDateTime(lastSyncedAt) : 'Belum pernah'}
                  </span>
                </p>
                <p>Tersimpan otomatis di perangkat. Cadangan cloud berjalan otomatis saat tersambung internet.</p>
              </div>

              {cloudMsg.text && (
                <p
                  className={`text-xs font-semibold rounded-xl px-3 py-2 border ${
                    cloudMsg.type === 'error'
                      ? 'text-rose-800 bg-rose-50 border-rose-200'
                      : 'text-emerald-800 bg-emerald-50 border-emerald-200'
                  }`}
                >
                  {cloudMsg.text}
                </p>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={handleSaveCloudSettings}
                  disabled={Boolean(cloudBusy)}
                  className="py-2.5 px-3 rounded-2xl bg-stone-100 hover:bg-stone-200 disabled:opacity-50 text-stone-800 font-bold text-xs transition-colors"
                >
                  Simpan Pengaturan
                </button>
                <button
                  type="button"
                  onClick={handleCloudPush}
                  disabled={Boolean(cloudBusy)}
                  className="py-2.5 px-3 rounded-2xl bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white font-extrabold text-xs shadow-md shadow-emerald-500/20 active:scale-95 transition-all"
                >
                  {cloudBusy === 'push' ? 'Mencadangkan...' : 'Cadangkan Sekarang'}
                </button>
                <button
                  type="button"
                  onClick={handleCloudPull}
                  disabled={Boolean(cloudBusy)}
                  className="py-2.5 px-3 rounded-2xl bg-amber-50 hover:bg-amber-100 disabled:opacity-50 text-amber-900 border border-amber-200 font-extrabold text-xs transition-colors"
                >
                  {cloudBusy === 'pull' ? 'Mengambil...' : 'Ambil Data dari Cloud'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* SEKSI 3: PENYEDERHANAAN UI RESET DATA APLIKASI (SATU TOMBOL UTAMA) */}
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

      {/* Informasi Sistem & Status Aplikasi */}
      <div className="bg-white rounded-3xl p-5 border border-emerald-100 shadow-sm shadow-emerald-100/40 text-xs text-stone-600 space-y-2">
        <h4 className="font-bold text-emerald-950 flex items-center gap-2">
          <Info className="w-4 h-4 text-emerald-600" />
          <span>Informasi KokiKasir</span>
        </h4>
        <p className="text-stone-500 leading-relaxed">
          Versi 1.3 • Seluruh data transaksi, menu, dan pengaturan toko tersimpan otomatis di perangkat tanpa memerlukan sambungan internet.
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
                        Menghapus gambar &amp; data QRIS tersimpan
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

      {/* MODAL KONFIRMASI RESTORE BACKUP (.JSON) */}
      {showRestoreConfirmModal && pendingBackup && (
        <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-amber-200 space-y-5">
            <div className="flex items-start justify-between pb-3 border-b border-amber-100">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center flex-shrink-0">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-emerald-950">
                    Konfirmasi Restore Data
                  </h3>
                  <span className="text-[11px] text-stone-500 font-semibold truncate block max-w-[230px]">
                    {pendingBackup.fileName}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowRestoreConfirmModal(false);
                  setPendingBackup(null);
                }}
                className="w-8 h-8 rounded-full bg-stone-100 text-stone-500 flex items-center justify-center hover:bg-stone-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-950 text-xs space-y-2">
              <p className="font-extrabold text-sm text-amber-900">
                Restoring will replace all current data on this device. Continue?
              </p>
              <p className="text-amber-800/90 leading-relaxed">
                Seluruh pengaturan toko, logo, QRIS, daftar menu, tagihan aktif, dan riwayat transaksi saat ini akan diganti dengan data dari file backup.
              </p>
            </div>

            {/* Ringkasan Isi File Backup */}
            <div className="p-3.5 rounded-2xl bg-stone-50 border border-stone-200 text-xs space-y-1.5 text-stone-700">
              <div className="flex justify-between">
                <span className="text-stone-500">Nama Toko:</span>
                <span className="font-bold text-emerald-950">
                  {pendingBackup.payload.data.storeSettings?.name || 'KokiKasir'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-500">Tanggal Backup:</span>
                <span className="font-bold text-emerald-950">
                  {pendingBackup.payload.exportedAt
                    ? formatDateShortID(getLocalDate(pendingBackup.payload.exportedAt))
                    : '-'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-500">Jumlah Menu:</span>
                <span className="font-bold text-emerald-950">
                  {pendingBackup.payload.data.menuItems.length} Item
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-500">Transaksi & Tagihan:</span>
                <span className="font-bold text-emerald-950">
                  {pendingBackup.payload.data.orders.length} Data
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-1">
              <button
                type="button"
                onClick={() => {
                  setShowRestoreConfirmModal(false);
                  setPendingBackup(null);
                }}
                className="py-3 rounded-2xl bg-stone-100 hover:bg-stone-200 text-stone-800 font-bold text-xs"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmRestore}
                className="py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-white font-black text-xs shadow-md shadow-emerald-500/25 flex items-center justify-center gap-1.5"
              >
                <Upload className="w-4 h-4" />
                <span>Ya, Pulihkan Data</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
