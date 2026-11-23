import React, { createContext, useContext, useState, useEffect } from 'react';

const DEFAULT_STORE_SETTINGS = {
  logo: '',
  name: 'KokiKasir',
  phone: '',
  hours: '08:00 - 22:00 WIB',
  bio: 'Terima kasih atas kunjungannya! Semoga menikmati hidangan koki kami.'
};

const AppContext = createContext();

export function AppProvider({ children }) {
  // Navigation active tab: 'home' | 'dashboard' | 'menu' | 'reports' | 'settings'
  const [activeNav, setActiveNav] = useState('home');

  // Menu Master Data (Murni Kosong [] sebagai initial state default, tanpa data dummy)
  const [menuItems, setMenuItems] = useState(() => {
    try {
      const saved = localStorage.getItem('kokikasir_menu');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  // Orders / Bills (persisted in localStorage)
  const [orders, setOrders] = useState(() => {
    try {
      const saved = localStorage.getItem('kokikasir_orders');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  // Static QRIS Image (Base64 string persisted in localStorage)
  const [qrisImage, setQrisImage] = useState(() => {
    try {
      return localStorage.getItem('kokikasir_qris_image') || '';
    } catch (e) {
      return '';
    }
  });

  // Store Personalization Settings (Logo, Nama Toko, Telp/WA, Jam Buka, Bio)
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

  // Save changes to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('kokikasir_menu', JSON.stringify(menuItems));
    } catch (e) {
      console.error('Failed to save menu to localStorage', e);
    }
  }, [menuItems]);

  useEffect(() => {
    try {
      localStorage.setItem('kokikasir_orders', JSON.stringify(orders));
    } catch (e) {
      console.error('Failed to save orders to localStorage', e);
    }
  }, [orders]);

  useEffect(() => {
    try {
      if (qrisImage) {
        localStorage.setItem('kokikasir_qris_image', qrisImage);
      } else {
        localStorage.removeItem('kokikasir_qris_image');
      }
    } catch (e) {
      console.error('Failed to save QRIS image to localStorage', e);
    }
  }, [qrisImage]);

  useEffect(() => {
    try {
      localStorage.setItem('kokikasir_store_settings', JSON.stringify(storeSettings));
    } catch (e) {
      console.error('Failed to save store settings to localStorage', e);
    }
  }, [storeSettings]);

  // Helper counts
  const unpaidCount = orders.filter(o => o.status === 'UNPAID').length;
  const paidCount = orders.filter(o => o.status === 'PAID').length;

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
        paidCount
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  return useContext(AppContext);
}
