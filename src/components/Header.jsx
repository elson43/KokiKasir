import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import Logo from './Logo';
import { Clock, Wifi, WifiOff, Loader2 } from 'lucide-react';
import { useNetworkStatus } from '../hooks/useNetworkStatus';

export default function Header() {
  const { activeNav, unpaidCount } = useApp();
  const { isOnline, syncState } = useNetworkStatus();
  const [currentTime, setCurrentTime] = useState('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString('id-ID', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: false
        })
      );
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const titles = {
    home: { title: 'Buat Pesanan Baru', desc: 'Sistem Open Bill untuk pelanggan' },
    dashboard: { title: 'Dashboard Tagihan', desc: 'Kelola Open Bill & Bayar Kasir' },
    menu: { title: 'Manajemen Menu Master', desc: 'Atur ketersediaan & urutan menu' },
    reports: { title: 'Laporan Penjualan', desc: 'Ringkasan omset & riwayat transaksi' },
    settings: { title: 'Pengaturan Sistem', desc: 'Kelola data di perangkat ini & pengaturan toko' },
  };

  const currentInfo = titles[activeNav] || titles.home;

  return (
    <header className="sticky top-0 z-20 bg-white/80 backdrop-blur-md border-b border-emerald-100/80 px-4 md:px-8 py-3.5 flex items-center justify-between shadow-xs print:hidden">
      {/* Mobile Brand / Desktop Page Title */}
      <div className="flex items-center gap-3">
        <div className="lg:hidden">
          <Logo size="sm" showText={true} />
        </div>

        <div className="hidden lg:block">
          <h2 className="text-xl font-extrabold text-emerald-950 tracking-tight">
            {currentInfo.title}
          </h2>
          <p className="text-xs text-emerald-700/80 font-medium">
            {currentInfo.desc}
          </p>
        </div>
      </div>

      {/* Right Action & Status Area */}
      <div className="flex items-center gap-2.5">
        {/* Live Clock */}
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50/80 border border-emerald-200/50 text-emerald-800 text-xs font-semibold shadow-xs">
          <Clock className="w-3.5 h-3.5 text-emerald-600" />
          <span>{currentTime || '00:00'} WIB</span>
        </div>

        {/* Unpaid Badge indicator in header */}
        {unpaidCount > 0 && (
          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 border border-amber-200/60 text-amber-800 text-xs font-semibold">
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
            <span>{unpaidCount} Tagihan Terbuka</span>
          </div>
        )}

        {/* Network Status Pill */}
        {!isOnline ? (
          <div className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-stone-100 text-stone-500 text-xs font-bold">
            <WifiOff className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Offline</span>
          </div>
        ) : syncState === 'syncing' ? (
          <div className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-teal-50 text-teal-700 text-xs font-bold border border-teal-200/50">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            <span className="hidden sm:inline">Syncing...</span>
          </div>
        ) : (
          <div className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-emerald-100/50 text-emerald-800 text-xs font-bold">
            <Wifi className="w-3.5 h-3.5 text-emerald-600" />
            <span className="hidden sm:inline">Online</span>
          </div>
        )}
      </div>
    </header>
  );
}
