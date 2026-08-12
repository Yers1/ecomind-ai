import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { EcoMindProvider } from './state/EcoMindContext'
import App from './App'
import './styles.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <EcoMindProvider>
      <App />
    </EcoMindProvider>
  </StrictMode>,
)
