import React from 'react'
import ReactDOM from 'react-dom/client'
import App from '@/App.jsx'
import '@/index.css'

// DEV-läge: sätt Base44-token synkront innan SDK initialiseras
// Base44 SDK läser från localStorage('base44_access_token')
localStorage.setItem('base44_access_token', 'dev-token-admin');
localStorage.setItem('lagerai_token', 'dev-token-admin');

// Register Service Worker for PWA push notifications
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js', { scope: '/' })
      .then(reg => console.log('[SW] Registered:', reg.scope))
      .catch(err => console.error('[SW] Registration failed:', err));
  });
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <App />
)