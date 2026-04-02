import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.jsx'
import AuthSync from './components/AuthSync.jsx'
import AchievementUnlockRunner from './components/AchievementUnlockRunner.jsx'
import AchievementToast from './components/AchievementToast.jsx'

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
