import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/globals.css'
import App from './App.jsx'
import { AuthProvider } from './state/auth.jsx'
import { ThemeProvider } from './state/theme.jsx'
import { CurrencyProvider } from './state/currency.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ThemeProvider>
      <CurrencyProvider>
        <AuthProvider>
          <App />
        </AuthProvider>
      </CurrencyProvider>
    </ThemeProvider>
  </StrictMode>,
)
