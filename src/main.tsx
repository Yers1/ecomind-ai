import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { EcoMindProvider } from './state/EcoMindContext'
import { SupabaseProvider } from './state/SupabaseContext'
import App from './App'
import './styles.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <EcoMindProvider>
      <SupabaseProvider><App /></SupabaseProvider>
    </EcoMindProvider>
  </StrictMode>,
)
