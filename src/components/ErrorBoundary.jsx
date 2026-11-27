import React from 'react';
import { logError } from '../utils/errorLogger';
import Logo from './Logo';
import { RefreshCw } from 'lucide-react';

/**
 * KokiKasir — React Error Boundary
 * Catches render-time errors, logs them securely, and shows a friendly fallback UI.
 */
export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    logError({
      message: error?.message || String(error),
      stack: error?.stack,
      componentStack: info?.componentStack,
      route: window?.location?.pathname
    });
  }

  handleReload() {
    window.location.reload();
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-emerald-50 flex flex-col items-center justify-center p-6 font-sans">
          <div className="bg-white rounded-3xl shadow-xl border border-rose-100 max-w-sm w-full p-8 text-center space-y-5">
            <div className="flex justify-center">
              <Logo size="md" showText={true} />
            </div>

            <p className="text-sm font-bold text-rose-950 leading-relaxed">
              Terjadi kendala. Muat ulang aplikasi.
            </p>

            <button
              onClick={this.handleReload}
              className="w-full py-3.5 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-white font-black text-sm flex items-center justify-center gap-2 shadow-md shadow-emerald-500/25 active:scale-95 transition-all"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Muat Ulang</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
