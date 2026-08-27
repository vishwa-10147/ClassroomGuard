import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './app/App';
import './styles/globals.css';

// Apply stored theme before render to prevent flash
try {
  const stored = localStorage.getItem('cg-theme');
  const theme = stored === 'light' ? 'light' : 'dark';
  document.documentElement.classList.add(theme);
  document.documentElement.style.colorScheme = theme;
} catch {
  document.documentElement.classList.add('dark');
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// Register service worker for PWA
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      // SW registration failed — non-critical
    });
  });
}
