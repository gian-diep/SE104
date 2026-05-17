import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/global.css'
import AppRouter from './components/Router'
import { AuthProvider } from './context/AuthContext'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AuthProvider>
      <AppRouter />
    </AuthProvider>
  </StrictMode>,
)
