import React from 'react'
import ReactDOM from 'react-dom/client'
import AppPlantas from './AppPlantas.jsx'
import './styles.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AppPlantas />
  </React.StrictMode>
)

// PWA: instalable y funcionando sin conexión (solo en producción; en
// desarrollo Vite sirve desde memoria y el service worker estorbaría).
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(() => {})
  })
}
