import React from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { useApp } from '../context/AppContext';
import Sidebar from './Sidebar';
import Header from './Header';
import BottomNav from './BottomNav';

export default function Layout({ children }) {
  const { storageWarning, dismissStorageWarning } = useApp();

  return (
    <div className="min-h-screen bg-emerald-50 print:bg-white flex flex-col lg:flex-row font-sans text-emerald-950">
      {/* Desktop Sidebar */}
      <Sidebar />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 pb-20 lg:pb-6 print:pb-0 print:p-0">
        {/* Top Header */}
        <Header />

        {/* Peringatan memori perangkat hampir penuh */}
        {storageWarning && (
          <div className="mx-3 md:mx-6 lg:mx-8 mt-3 p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs font-bold flex items-start gap-2.5 print:hidden">
            <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
            <span className="flex-1 leading-relaxed">{storageWarning}</span>
            <button
              type="button"
              onClick={dismissStorageWarning}
              className="w-6 h-6 rounded-full hover:bg-amber-100 flex items-center justify-center flex-shrink-0"
              aria-label="Tutup peringatan"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Dynamic Page Body */}
        <main className="flex-1 p-3 md:p-6 lg:p-8 max-w-7xl w-full mx-auto print:max-w-none print:p-0">
          {children}
        </main>
      </div>

      {/* Mobile/Tablet Bottom Navigation Bar */}
      <BottomNav />
    </div>
  );
}
