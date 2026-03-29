import { Route, Routes } from 'react-router-dom'
import Home from './pages/Home.jsx'
import History from './pages/History.jsx'
import Auth from './pages/Auth.jsx'
import Navbar from './components/Navbar.jsx'

export default function App() {
  return (
    <div className="min-h-full bg-white text-slate-900">
      <Navbar />

      <main className="mx-auto max-w-5xl px-4 py-8">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/history" element={<History />} />
          <Route path="/auth" element={<Auth />} />
        </Routes>
      </main>
    </div>
  )
}
