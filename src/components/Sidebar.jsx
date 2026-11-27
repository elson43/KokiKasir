import React from 'react';
import { useApp } from '../context/AppContext';
import Logo from './Logo';
import { 
  UtensilsCrossed, 
  ReceiptText, 
  BookOpen, 
  BarChart3, 
  Settings,
  Wifi, 
  Sparkles,
  Clock
} from 'lucide-react';

export default function Sidebar() {
  const { activeNav, setActiveNav, unpaidCount } = useApp();

  const navItems = [
    {
      id: 'home',
      label: 'Buat Pesanan',
      sublabel: 'Katalog Menu & Tagihan',
      icon: UtensilsCrossed,
      badge: null
    },
    {
      id: 'dashboard',
      label: 'Tagihan & Kasir',
      sublabel: 'Unpaid & Riwayat Lunas',
      icon: ReceiptText,
      badge: unpaidCount > 0 ? `${unpaidCount} Pending` : null,
      badgeColor: 'bg-amber-500 text-white'
    },
    {
      id: 'menu',
      label: 'Kelola Menu',
      sublabel: 'Daftar & Status Menu',
      icon: BookOpen,
      badge: null
    },
    {
      id: 'reports',
      label: 'Laporan & Backup',
      sublabel: 'Omset & Ekspor Excel',
      icon: BarChart3,
      badge: null
    },
    {
      id: 'settings',
      label: 'Pengaturan',
      sublabel: 'Backup & Data di Perangkat',
      icon: Settings,
      badge: null
    }
  ];

  return (
    <aside className="hidden lg:flex flex-col w-72 bg-white/90 backdrop-blur-md border-r border-emerald-100/80 h-screen sticky top-0 z-30 shadow-sm shadow-emerald-100/40 p-5 select-none justify-between print:hidden">
      {/* Brand & Logo Header */}
      <div>
        <div className="pb-6 mb-6 border-b border-emerald-100/60">
          <Logo size="md" showText={true} />
        </div>

        {/* Navigation Section */}
        <div className="space-y-1.5">
          <div className="px-3 pb-2 text-[11px] font-bold text-emerald-800/60 tracking-wider uppercase">
            Navigasi Utama
          </div>

          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeNav === item.id;

            return (
              <button
                key={item.id}
                onClick={() => setActiveNav(item.id)}
                className={`w-full flex items-center justify-between px-3.5 py-3 rounded-2xl font-medium transition-all duration-200 group text-left ${
                  isActive
                    ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/25 scale-[1.01]'
                    : 'text-emerald-900/80 hover:bg-emerald-50/80 hover:text-emerald-950 active:scale-95'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${
                      isActive
                        ? 'bg-emerald-600/30 text-white'
                        : 'bg-emerald-100/50 text-emerald-700 group-hover:bg-emerald-100'
                    }`}
                  >
                    <Icon className="w-5 h-5 stroke-[2]" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold leading-tight">{item.label}</div>
                    <div
                      className={`text-[11px] leading-tight ${
                        isActive ? 'text-emerald-100' : 'text-emerald-700/60'
                      }`}
                    >
                      {item.sublabel}
                    </div>
                  </div>
                </div>

                {item.badge && (
                  <span
                    className={`px-2 py-0.5 text-[11px] font-bold rounded-full ${
                      isActive ? 'bg-white text-emerald-700' : item.badgeColor
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Bottom Footer Info Box */}
      <div className="space-y-3">
        {/* Quick Koki Tip Card */}
        <div className="p-3.5 rounded-2xl bg-emerald-50/70 border border-emerald-100/70">
          <div className="flex items-center gap-2 text-xs font-bold text-emerald-900 mb-1">
            <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
            <span>Koki Focus Mode</span>
          </div>
          <p className="text-[11px] text-emerald-700/80 leading-relaxed">
            Sistem Open Bill mempermudah tambah pesanan sewaktu pelanggan memesan lagi.
          </p>
        </div>

        {/* Offline & System Status */}
        <div className="px-3 py-2.5 rounded-xl bg-stone-50 border border-stone-200/60 text-xs text-stone-600">
          <div className="flex items-start gap-2">
            <span className="relative flex h-2 w-2 mt-1 flex-shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="font-semibold text-emerald-950 leading-snug">
              Mode Offline — data tersimpan otomatis di perangkat
            </span>
          </div>
        </div>
      </div>
    </aside>
  );
}
