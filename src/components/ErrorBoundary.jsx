import React from 'react';
import { logError } from '../utils/errorLogger';
import Logo from './Logo';
import { AlertTriangle, RefreshCw } from 'lucide-react';

/**
 * KokiKasir — React Error Boundary
 * Catches render-time errors, logs them securely, and shows a friendly fallback UI.
 */
export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, errorId: null };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    const entry = logError({
      message: error?.message || String(error),
      stack: error?.stack,
      componentStack: info?.componentStack,
      route: window?.location?.pathname
    });
    this.setState({ errorId: entry.id });
  }

  handleReload() {
    window.location.reload();
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-emerald-50 flex flex-col items-center justify-center p-6 font-sans">
          <div className="bg-white rounded-3xl shadow-xl border border-rose-100 max-w-md w-full p-8 text-center space-y-5">
            <div className="flex justify-center">
              <Logo size="md" showText={true} />
            </div>

            <div className="w-14 h-14 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-7 h-7" />
            </div>

            <div>
              <h2 className="text-xl font-black text-rose-950 mb-1">
                Ups! Terjadi Kesalahan
              </h2>
              <p className="text-xs text-stone-600 leading-relaxed">
                Aplikasi mengalami error yang tidak terduga. Data Anda tetap aman di perangkat ini.
                Silakan muat ulang halaman untuk melanjutkan.
              </p>
              {this.state.errorId && (
                <p className="mt-2 text-[10px] text-stone-400 font-mono">
                  Error ID: {this.state.errorId}
                </p>
              )}
            </div>

            <button
              onClick={this.handleReload}
              className="w-full py-3.5 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-white font-black text-sm flex items-center justify-center gap-2 shadow-md shadow-emerald-500/25 active:scale-95 transition-all"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Muat Ulang Aplikasi</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
