import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, HashRouter } from 'react-router-dom'
import '@fontsource-variable/inter'
import '@fontsource-variable/plus-jakarta-sans'
import './index.css'
import App from './App'

// The demo build is served from static hosts without SPA rewrites, so it uses hash URLs.
const Router = import.meta.env.VITE_DEMO === 'true' ? HashRouter : BrowserRouter

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Router>
      <App />
    </Router>
  </StrictMode>,
)
