import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter } from 'react-router-dom'
import ReactGA from 'react-ga4'
import './index.css'
import App from './App.jsx'
import AuthSync from './components/app/AuthSync.jsx'
import AchievementUnlockRunner from './components/app/AchievementUnlockRunner.jsx'
import AchievementToast from './components/app/AchievementToast.jsx'

const GA_ID = import.meta.env.VITE_GA_MEASUREMENT_ID

if (GA_ID && import.meta.env.PROD) {
  ReactGA.initialize(GA_ID)
}

const queryClient = new QueryClient()

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthSync />
        <AchievementUnlockRunner />
        <AchievementToast />
        <App />
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>,
)
