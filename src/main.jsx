import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import ErrorBoundary from './components/ErrorBoundary.jsx'
import { logError } from './utils/errorLogger.js'

// Global error handlers — capture unhandled errors into local error log
window.onerror = (message, source, lineno, colno, error) => {
  logError({
    message: String(message),
    stack: error?.stack ?? `${source}:${lineno}:${colno}`,
    route: window.location.pathname,
  });
};

window.onunhandledrejection = (event) => {
  logError({
    message: event.reason?.message ?? String(event.reason),
    stack: event.reason?.stack,
    route: window.location.pathname,
  });
};

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>,
)
