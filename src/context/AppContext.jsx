import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { logError } from '../utils/errorLogger';
import { compressImageToBase64 } from '../utils/imageHelper';
import { decodeQrisFromImage } from '../utils/qrisHelper';
import { runCloudBackup } from '../lib/syncService';
import { useNetworkStatus } from '../hooks/useNetworkStatus';

const DEFAULT_STORE_SETTINGS = {
  logo: '',
  name: 'KokiKasir',
  phone: '',
  hours: '08:00 - 22:00 WIB',
  bio: 'Terima kasih atas kunjungannya! Semoga menikmati hidangan koki kami.',
  // Pengaturan printer
  printerMode: 'none', // 'none' | 'browser' | 'bluetooth'
  autoPrint: false,
  lastPrinterName: '',
  // Cadangan cloud (Google Drive via Apps Script)
  cloudBackupUrl: '',
  cloudBackupPin: '',
  // QRIS dinamis (hasil baca foto QRIS statis)
  qrisPayload: '',
  qrisMerchantName: '',
  qrisMerchantCity: ''
};

const STORAGE_FULL_MESSAGE =
  'Memori perangkat hampir penuh. Hapus sebagian foto menu atau lakukan backup data.';

const CLOUD_BACKUP_DEBOUNCE_MS = 3000;

function isQuotaExceededError(e) {
  return (
    e &&
    (e.name === 'QuotaExceededError' ||
      e.name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
      e.code === 22 ||
      e.code === 1014)
  );
}

const AppContext = createContext();

export function AppProvider({ children }) {
  const { isOnline } = useNetworkStatus();

  // Navigation active tab: 'home' | 'dashboard' | 'menu' | 'reports' | 'settings'
  const [activeNav, setActiveNav] = useState('home');

  // Peringatan memori penuh (ramah pengguna, tanpa detail teknis)
  const [storageWarning, setStorageWarning] = useState('');

  // Menu Master Data (Murni Kosong [] sebagai initial state default, tanpa data dummy)
  const [menuItems, setMenuItems] = useState(() => {
    try {
      const saved = localStorage.getItem('kokikasir_menu');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  // Orders / Bills (tersimpan di perangkat; tidak dihapus otomatis saat tengah malam sehingga riwayat 30+ hari tetap ada)
  const [orders, setOrders] = useState(() => {
    try {
      const saved = localStorage.getItem('kokikasir_orders');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  // Static QRIS Image (string Base64)
  const [qrisImage, setQrisImage] = useState(() => {
    try {
      return localStorage.getItem('kokikasir_qris_image') || '';
    } catch (e) {
      return '';
    }
  });

  // Store Personalization Settings (Logo, Nama Toko, Telp, Jam Buka, Bio, Printer, Cloud)
  const [storeSettings, setStoreSettings] = useState(() => {
    try {
      const saved = localStorage.getItem('kokikasir_store_settings');
      return saved ? { ...DEFAULT_STORE_SETTINGS, ...JSON.parse(saved) } : DEFAULT_STORE_SETTINGS;
    } catch (e) {
      return DEFAULT_STORE_SETTINGS;
    }
  });

  // Active Draft Order in progress (for Home Screen)
  // Supports 'Makan Sini' | 'Bungkus' | 'Pesan Dulu'
  const [draftOrder, setDraftOrder] = useState({
    customerName: '',
    orderType: 'Makan Sini',
    items: {}, // { [menuId]: { quantity: number, notes: string } }
    editingOrderId: null
  });

  /**
   * Tulis ke penyimpanan perangkat dengan aman.
   * Error kuota dicatat senyap lewat errorLogger dan ditampilkan sebagai peringatan ramah.
   * @returns {boolean} true jika berhasil
   */
  const safeWrite = (key, value) => {
    try {
      if (value === null || value === undefined) {
        localStorage.removeItem(key);
      } else {
        localStorage.setItem(key, value);
      }
      return true;
    } catch (e) {
      logError({
        message: `Gagal menyimpan ${key}: ${e?.name || 'Error'} ${e?.message || ''}`,
        stack: e?.stack,
        route: 'storage'
      });
      if (isQuotaExceededError(e)) {
        setStorageWarning(STORAGE_FULL_MESSAGE);
      }
      return false;
    }
  };

  // Simpan perubahan ke perangkat
  useEffect(() => {
    safeWrite('kokikasir_menu', JSON.stringify(menuItems));
  }, [menuItems]);

  useEffect(() => {
    safeWrite('kokikasir_orders', JSON.stringify(orders));
  }, [orders]);

  useEffect(() => {
    safeWrite('kokikasir_qris_image', qrisImage || null);
  }, [qrisImage]);

  useEffect(() => {
    safeWrite('kokikasir_store_settings', JSON.stringify(storeSettings));
  }, [storeSettings]);

  /* ───────────── Cadangan cloud otomatis (Google Drive) ───────────── */

  const latestDataRef = useRef({ storeSettings, qrisImage, menuItems, orders });
  latestDataRef.current = { storeSettings, qrisImage, menuItems, orders };

  const debounceTimerRef = useRef(null);
  const isFirstDataRunRef = useRef(true);
  const wasOnlineRef = useRef(isOnline);

  const scheduleCloudBackup = () => {
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(() => {
      runCloudBackup(latestDataRef.current);
    }, CLOUD_BACKUP_DEBOUNCE_MS);
  };

  // Data berubah (order dibayar, menu/pengaturan diubah) → cadangkan di latar belakang
  useEffect(() => {
    if (isFirstDataRunRef.current) {
      isFirstDataRunRef.current = false;
      return;
    }
    if (!storeSettings.cloudBackupUrl || !isOnline) return;
    scheduleCloudBackup();
  }, [orders, menuItems, storeSettings, qrisImage]);

  // Kembali online setelah offline → cadangkan otomatis
  useEffect(() => {
    if (!wasOnlineRef.current && isOnline && latestDataRef.current.storeSettings.cloudBackupUrl) {
      scheduleCloudBackup();
    }
    wasOnlineRef.current = isOnline;
  }, [isOnline]);

  useEffect(() => () => {
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
  }, []);

  /* ───────────── QRIS: foto statis → QRIS dinamis (offline) ───────────── */

  const [qrisDecoding, setQrisDecoding] = useState(false);

  const applyQrisResult = (result) => {
    setStoreSettings(prev => ({
      ...prev,
      qrisPayload: result?.ok ? result.payload : '',
      qrisMerchantName: result?.ok ? result.merchantName : '',
      qrisMerchantCity: result?.ok ? result.merchantCity : ''
    }));
  };

  /**
   * Simpan foto QRIS baru: gambar dikompres ke `kokikasir_qris_image`, lalu dibaca otomatis.
   * Pembacaan memakai file asli (lebih tajam); jika gagal dicoba lagi dari gambar terkompresi.
   * @returns {Promise<{ok: boolean, merchantName?: string, merchantCity?: string, reason?: string}>}
   */
  const saveQrisFromFile = async (file) => {
    setQrisDecoding(true);
    try {
      const [base64, originalResult] = await Promise.all([
        compressImageToBase64(file, 'qris'),
        decodeQrisFromImage(file)
      ]);

      let result = originalResult;
      if (!result.ok) {
        result = await decodeQrisFromImage(base64);
      }

      setQrisImage(base64);
      applyQrisResult(result);
      return result;
    } catch (err) {
      logError({
        message: `Gagal memproses foto QRIS: ${err?.message || err}`,
        stack: err?.stack,
        route: 'qris-upload'
      });
      return { ok: false, reason: 'Foto QRIS belum bisa diproses.' };
    } finally {
      setQrisDecoding(false);
    }
  };

  // Hapus QRIS: gambar sekaligus data QRIS dinamis
  const clearQris = () => {
    setQrisImage('');
    applyQrisResult(null);
  };

  // Pengguna lama: gambar QRIS sudah ada tapi belum dibaca → upgrade otomatis sekali saat aplikasi dibuka
  const qrisUpgradeTriedRef = useRef(false);
  useEffect(() => {
    if (qrisUpgradeTriedRef.current) return;
    qrisUpgradeTriedRef.current = true;
    if (!qrisImage || storeSettings.qrisPayload) return;

    let cancelled = false;
    (async () => {
      try {
        const result = await decodeQrisFromImage(qrisImage);
        if (!cancelled && result.ok) applyQrisResult(result);
      } catch (err) {
        logError({
          message: `Gagal membaca QRIS tersimpan: ${err?.message || err}`,
          stack: err?.stack,
          route: 'qris-upgrade'
        });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  // Helper counts
  const unpaidCount = orders.filter(o => o.status === 'UNPAID').length;
  const paidCount = orders.filter(o => o.status === 'PAID').length;

  // Restore all app data from a validated backup object
  const restoreBackup = (backupData) => {
    const incomingSettings = backupData.storeSettings || {};
    const nextStoreSettings = {
      ...DEFAULT_STORE_SETTINGS,
      ...incomingSettings,
      // Pertahankan link & PIN cloud perangkat ini jika tidak ada di file cadangan
      cloudBackupUrl: incomingSettings.cloudBackupUrl ?? storeSettings.cloudBackupUrl ?? '',
      cloudBackupPin: incomingSettings.cloudBackupPin ?? storeSettings.cloudBackupPin ?? ''
    };
    const nextQrisImage = typeof backupData.qrisImage === 'string' ? backupData.qrisImage : '';
    const nextMenuItems = Array.isArray(backupData.menuItems) ? backupData.menuItems : [];
    const nextOrders = Array.isArray(backupData.orders) ? backupData.orders : [];

    // Kosongkan data lama sebelum memasukkan data pulihan
    localStorage.removeItem('kokikasir_store_settings');
    localStorage.removeItem('kokikasir_qris_image');
    localStorage.removeItem('kokikasir_menu');
    localStorage.removeItem('kokikasir_orders');

    localStorage.setItem('kokikasir_store_settings', JSON.stringify(nextStoreSettings));
    if (nextQrisImage) {
      localStorage.setItem('kokikasir_qris_image', nextQrisImage);
    }
    localStorage.setItem('kokikasir_menu', JSON.stringify(nextMenuItems));
    localStorage.setItem('kokikasir_orders', JSON.stringify(nextOrders));

    setStoreSettings(nextStoreSettings);
    setQrisImage(nextQrisImage);
    setMenuItems(nextMenuItems);
    setOrders(nextOrders);

    // Cadangan lama tanpa data QRIS dinamis: baca gambar QRIS di latar belakang
    if (nextQrisImage && !nextStoreSettings.qrisPayload) {
      decodeQrisFromImage(nextQrisImage)
        .then((result) => {
          if (result.ok) applyQrisResult(result);
        })
        .catch(() => {});
    }
    setDraftOrder({
      customerName: '',
      orderType: 'Makan Sini',
      items: {},
      editingOrderId: null
    });

    return {
      storeSettings: nextStoreSettings,
      qrisImage: nextQrisImage,
      menuItems: nextMenuItems,
      orders: nextOrders
    };
  };

  return (
    <AppContext.Provider
      value={{
        activeNav,
        setActiveNav,
        menuItems,
        setMenuItems,
        orders,
        setOrders,
        qrisImage,
        setQrisImage,
        storeSettings,
        setStoreSettings,
        draftOrder,
        setDraftOrder,
        unpaidCount,
        paidCount,
        restoreBackup,
        saveQrisFromFile,
        clearQris,
        qrisDecoding,
        storageWarning,
        dismissStorageWarning: () => setStorageWarning('')
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  return useContext(AppContext);
}
