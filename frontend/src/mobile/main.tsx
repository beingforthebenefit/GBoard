import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
// Self-hosted: the page must not depend on a font CDN being reachable. Latin subsets
// cover Spanish (ñ, á, ¿) for the word of the day.
import '@fontsource/barlow/latin-400.css'
import '@fontsource/barlow/latin-500.css'
import '@fontsource/barlow/latin-600.css'
import '@fontsource/barlow/latin-700.css'
import '@fontsource-variable/source-serif-4/opsz.css'
import '@fontsource-variable/source-serif-4/opsz-italic.css'
import './mobile.css'
import { MobileApp } from './MobileApp.js'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <MobileApp />
  </StrictMode>
)
