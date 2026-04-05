import { Route, Routes, useLocation } from 'react-router-dom'
import { useEffect } from 'react'

function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => { window.scrollTo(0, 0) }, [pathname])
  return null
}
import Home from './pages/Home.jsx'
import History from './pages/History.jsx'
import Auth from './pages/Auth.jsx'
import Navbar from './components/layout/Navbar.jsx'
import Footer from './components/layout/Footer.jsx'
import WikiIframe from './pages/WikiIframe.jsx'
import Profile from './pages/Profile.jsx'
import Game from './pages/Game.jsx'
import GamePlay from './pages/GamePlay.jsx'
import GameResult from './pages/GameResult.jsx'
import FreeGameHub from './pages/FreeGameHub.jsx'
import FreeGamePlay from './pages/FreeGamePlay.jsx'
import FreeGameResult from './pages/FreeGameResult.jsx'
import UsernameSetup from './pages/UsernameSetup.jsx'

export default function App() {
  return (
    <div className="min-h-full bg-white text-primary">
      <ScrollToTop />
      <Navbar />

      <main className="mx-auto max-w-5xl px-4 py-8">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/history" element={<History />} />
          <Route path="/game" element={<Game />} />
          <Route path="/game/play" element={<GamePlay />} />
          <Route path="/game/result" element={<GameResult />} />
          <Route path="/game/free" element={<FreeGameHub />} />
          <Route path="/game/free/play" element={<FreeGamePlay />} />
          <Route path="/game/free/result" element={<FreeGameResult />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/setup-username" element={<UsernameSetup />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/wiki/:wikiSlug" element={<WikiIframe />} />
        </Routes>
      </main>
      <Footer />
    </div>
  )
}
