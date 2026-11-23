import React, { useState } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import SplashScreen from './components/SplashScreen';
import Layout from './components/Layout';
import HomePage from './pages/HomePage';
import DashboardPage from './pages/DashboardPage';
import MenuManagementPage from './pages/MenuManagementPage';
import ReportsPage from './pages/ReportsPage';
import SettingsPage from './pages/SettingsPage';

function AppContent() {
  const { activeNav } = useApp();
  const [showSplash, setShowSplash] = useState(true);

  // Render current active page based on navigation
  const renderCurrentPage = () => {
    switch (activeNav) {
      case 'home':
        return <HomePage />;
      case 'dashboard':
        return <DashboardPage />;
      case 'menu':
        return <MenuManagementPage />;
      case 'reports':
        return <ReportsPage />;
      case 'settings':
        return <SettingsPage />;
      default:
        return <HomePage />;
    }
  };

  return (
    <>
      {/* Animated Startup (Splash Screen) */}
      {showSplash && (
        <SplashScreen onFinish={() => setShowSplash(false)} />
      )}

      {/* Main Jade Ornament Layout */}
      <Layout>
        {renderCurrentPage()}
      </Layout>
    </>
  );
}

export default function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}
