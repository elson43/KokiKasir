import React from 'react';
import { useApp } from '../context/AppContext';
import { UtensilsCrossed, ReceiptText, BookOpen, BarChart3, Settings } from 'lucide-react';

/**
 * Bottom Navigation Bar untuk Mobile & Tablet
 * Dilengkapi 5 menu navigasi dengan tata letak proporsional dan ramah sentuhan.
 */
export default function BottomNav() {
  const { activeNav, setActiveNav, unpaidCount } = useApp();

  const navItems = [
    {
      id: 'home',
      label: 'Pesanan',
      icon: UtensilsCrossed,
      badge: null
    },
    {
      id: 'dashboard',
      label: 'Tagihan',
      icon: ReceiptText,
      badge: unpaidCount > 0 ? unpaidCount : null
    },
    {
      id: 'menu',
      label: 'Menu',
      icon: BookOpen,
      badge: null
    },
    {
      id: 'reports',
      label: 'Laporan',
      icon: BarChart3,
      badge: null
    },
    {
      id: 'settings',
      label: 'Setting',
      icon: Settings,
      badge: null
    }
  ];

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-lg border-t border-emerald-100/80 px-1.5 py-1.5 shadow-[0_-4px_20px_rgba(16,185,129,0.06)] print:hidden">
      <div className="max-w-md mx-auto grid grid-cols-5 gap-0.5">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeNav === item.id;

          return (
            <button
              key={item.id}
              onClick={() => setActiveNav(item.id)}
              className={`relative flex flex-col items-center justify-center py-1.5 px-0.5 rounded-2xl transition-all duration-200 select-none ${
                isActive
                  ? 'text-emerald-700 font-bold scale-105'
                  : 'text-stone-500 hover:text-emerald-800 active:scale-95'
              }`}
            >
              {/* Highlight Pill for Active State */}
              <div
                className={`w-9 h-7 rounded-full flex items-center justify-center transition-all duration-300 relative ${
                  isActive
                    ? 'bg-emerald-100/80 text-emerald-700 shadow-xs'
                    : 'bg-transparent'
                }`}
              >
                <Icon className={`w-4 h-4 sm:w-5 sm:h-5 ${isActive ? 'stroke-[2.2]' : 'stroke-[1.6]'}`} />

                {/* Badge notification (e.g., unpaid count) */}
                {item.badge && (
                  <span className="absolute -top-1 -right-1 min-w-[16px] h-[16px] bg-rose-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center px-0.5 border-2 border-white shadow-xs">
                    {item.badge}
                  </span>
                )}
              </div>

              {/* Label */}
              <span
                className={`text-[10px] mt-0.5 tracking-tight transition-colors truncate max-w-full ${
                  isActive ? 'text-emerald-900 font-bold' : 'text-stone-600 font-medium'
                }`}
              >
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
