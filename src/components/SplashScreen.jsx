import React, { useEffect, useState } from 'react';
import Logo from './Logo';

/**
 * Splash Screen KokiKasir
 * Memenuhi aturan CONTEXT.md:
 * - Full-screen bg-emerald-50
 * - Tampil selama 2 detik
 * - Logo KokiKasir dan teks dengan animasi fade-in yang ceria & halus
 * - Otomatis pindah ke Halaman Home
 */
export default function SplashScreen({ onFinish }) {
  const [isFadingOut, setIsFadingOut] = useState(false);

  useEffect(() => {
    // Start exit fade at 1.7 seconds, then call onFinish at 2.0 seconds
    const fadeTimer = setTimeout(() => {
      setIsFadingOut(true);
    }, 1700);

    const finishTimer = setTimeout(() => {
      if (onFinish) onFinish();
    }, 2000);

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(finishTimer);
    };
  }, [onFinish]);

  return (
    <div
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center bg-emerald-50 transition-all duration-300 ease-out ${
        isFadingOut ? 'opacity-0 scale-105 pointer-events-none' : 'opacity-100 scale-100'
      }`}
    >
      {/* Soft Background Jade Ornaments */}
      <div className="absolute top-1/4 -left-20 w-72 h-72 bg-emerald-200/30 rounded-full blur-3xl pointer-events-none animate-pulse-subtle"></div>
      <div className="absolute bottom-1/4 -right-20 w-80 h-80 bg-teal-200/30 rounded-full blur-3xl pointer-events-none animate-pulse-subtle"></div>

      {/* Main Animated Splash Content */}
      <div className="flex flex-col items-center justify-center p-8 text-center animate-fade-in relative z-10">
        {/* Animated Badge & Logo */}
        <div className="mb-6 relative">
          <div className="absolute inset-0 bg-emerald-300/40 rounded-3xl blur-xl animate-pulse"></div>
          <div className="relative p-3 bg-white/80 backdrop-blur-md rounded-3xl shadow-xl shadow-emerald-200/50 border border-emerald-100">
            <Logo size="xl" showText={false} />
          </div>
        </div>

        {/* Brand Name */}
        <h1 className="text-3xl md:text-4xl font-extrabold text-emerald-950 tracking-tight mb-2">
          Koki<span className="text-emerald-600">Kasir</span>
        </h1>

        {/* Tagline / Subtitle */}
        <p className="text-emerald-700 font-medium text-sm md:text-base max-w-xs mb-8">
          Aplikasi Kasir Minimalis & Cepat, Dirancang Khusus untuk Dapur Koki.
        </p>

        {/* Playful Loading Dots */}
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-bounce [animation-delay:-0.3s]"></span>
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-bounce [animation-delay:-0.15s]"></span>
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 animate-bounce"></span>
        </div>

        {/* Offline-Ready Badge */}
        <div className="mt-8 px-4 py-1.5 rounded-full bg-white/70 backdrop-blur-sm border border-emerald-200/60 shadow-xs text-xs font-medium text-emerald-800 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
          <span>100% Offline-First PWA</span>
        </div>
      </div>

      {/* Bottom Footer Info */}
      <div className="absolute bottom-6 text-xs text-emerald-600/70 font-medium">
        Jade Minimalist POS • v1.0
      </div>
    </div>
  );
}
