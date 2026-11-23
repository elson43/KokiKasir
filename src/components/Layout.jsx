import React from 'react';
import Sidebar from './Sidebar';
import Header from './Header';
import BottomNav from './BottomNav';

export default function Layout({ children }) {
  return (
    <div className="min-h-screen bg-emerald-50 print:bg-white flex flex-col lg:flex-row font-sans text-emerald-950">
      {/* Desktop Sidebar */}
      <Sidebar />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 pb-20 lg:pb-6 print:pb-0 print:p-0">
        {/* Top Header */}
        <Header />

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
