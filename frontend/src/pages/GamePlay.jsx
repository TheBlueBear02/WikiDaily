import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  fetchWikipediaHtml,
  normalizeWikiSlugForDb,
  parseWikiSlugFromHref,
  sanitizeWikiHtmlForIframeSrc,
} from '../lib/wikipedia'
import { useGameChallenge } from '../hooks/useGameChallenge'
import { useGameSession } from '../hooks/useGameSession'
import { useUserProgress } from '../hooks/useUserProgress'
import { getSupabase } from '../lib/supabaseClient'
import { todayUtcYmd } from '../lib/date'
import GameHUD from '../components/game/GameHUD'
import PathTrail from '../components/game/PathTrail'

export default function GamePlay() {
  const navigate = useNavigate()
  const { data: challengeData, isLoading: challengeLoading } = useGameChallenge()
  const { userId } = useUserProgress()
  const { startSessionMutation, recordClickMutation, completeSessionMutation } = useGameSession()

  const challenge = challengeData?.challenge ?? null
  const targetArticle = challengeData?.targetArticle ?? null

  // --- Refs (closure-safe, never read stale values inside event handlers) ---
  const sessionIdRef = useRef(null)
  const clicksRef = useRef(0)
  const pathRef = useRef([])
  const timerRef = useRef(null)
  const iframeRef = useRef(null)
  const navCleanupRef = useRef(null)
  // Keep target slug in a ref so the iframe click handler always reads the latest value
  const targetSlugRef = useRef(null)

  // --- State (drives re-renders / UI) ---
  const [clicks, setClicks] = useState(0)
  const [path, setPath] = useState([])
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const [iframeHtml, setIframeHtml] = useState(null)
  const [htmlLoading, setHtmlLoading] = useState(true)
  const [htmlError, setHtmlError] = useState(null)
  const [gameStarted, setGameStarted] = useState(false)


  // Keep targetSlugRef current whenever challenge loads
  useEffect(() => {
    if (challenge?.target_slug) {
      targetSlugRef.current = normalizeWikiSlugForDb(challenge.target_slug)
    }
  }, [challenge?.target_slug])

  // Fetch article HTML whenever slug changes
  const fetchArticle = useCallback(async (slug) => {
    setHtmlLoading(true)
    setHtmlError(null)
    setIframeHtml(null)
    let cancelled = false
    try {
      const raw = await fetchWikipediaHtml(slug)
      if (cancelled) return
      setIframeHtml(sanitizeWikiHtmlForIframeSrc(raw))
    } catch (err) {
      if (cancelled) return
      setHtmlError(err instanceof Error ? err.message : 'Could not load article')
    } finally {
      if (!cancelled) setHtmlLoading(false)
    }
    return () => { cancelled = true }
  }, [])

  // Mount: check already-played (signed-in only), start session, start timer, load first article
  useEffect(() => {
    if (!challenge) return

    let cancelled = false

    async function initGame() {
      if (userId) {
        const supabase = getSupabase()

        // Check if already completed today's challenge
        const { data: existing } = await supabase
          .from('game_sessions')
          .select('id')
          .eq('user_id', userId)
          .eq('challenge_id', challenge.id)
          .eq('completed', true)
          .maybeSingle()

        if (existing) {
          navigate('/game', { replace: true })
          return
        }

        if (cancelled) return

        // Start session
        let sessionId
        try {
          sessionId = await startSessionMutation.mutateAsync({
            challengeId: challenge.id,
            userId,
            startSlug: challenge.start_slug,
          })
        } catch (err) {
          console.error('GamePlay: failed to start session', err)
          navigate('/game', { replace: true })
          return
        }

        if (cancelled) return

        sessionIdRef.current = sessionId
      }

      clicksRef.current = 0
      pathRef.current = [challenge.start_slug]
      setClicks(0)
      setPath([challenge.start_slug])

      // Start timer
      timerRef.current = setInterval(() => {
        setElapsedSeconds((s) => s + 1)
      }, 1000)

      setGameStarted(true)

      // Load start article
      await fetchArticle(challenge.start_slug)
    }

    void initGame()

    return () => {
      cancelled = true
      if (timerRef.current) {
        clearInterval(timerRef.current)
        timerRef.current = null
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, challenge?.id])

  // Handle iframe onLoad — attach click interception
  function handleIframeLoad(event) {
    navCleanupRef.current?.()
    navCleanupRef.current = null

    const iframe = event.currentTarget
    iframeRef.current = iframe
    const doc = iframe.contentDocument
    if (!doc?.body) return

    const handler = (e) => {
      const anchor = e.target?.closest?.('a')
      if (!anchor) return

      const href = anchor.getAttribute('href')
      const nextSlug = parseWikiSlugFromHref(href, doc.baseURI)
      if (!nextSlug) return

      const nextCanonical = normalizeWikiSlugForDb(nextSlug)
      if (!nextCanonical) return

      e.preventDefault()
      e.stopPropagation()

      const currentTarget = targetSlugRef.current

      if (
        currentTarget &&
        nextCanonical.toLowerCase() === currentTarget.toLowerCase()
      ) {
        // Target reached!
        if (timerRef.current) {
          clearInterval(timerRef.current)
          timerRef.current = null
        }

        clicksRef.current += 1
        pathRef.current = [...pathRef.current, nextCanonical]

        const finalClicks = clicksRef.current
        const finalPath = pathRef.current

        setElapsedSeconds((s) => {
          const finalTime = s
          const resultState = {
            sessionId: sessionIdRef.current,
            clicks: finalClicks,
            timeSeconds: finalTime,
            path: finalPath,
            challengeId: challenge?.id,
          }

          if (!sessionIdRef.current) {
            // Guest — no session to save
            navigate('/game/result', { state: resultState })
          } else {
            void completeSessionMutation
              .mutateAsync({
                sessionId: sessionIdRef.current,
                clicks: finalClicks,
                timeSeconds: finalTime,
                path: finalPath,
              })
              .then(() => navigate('/game/result', { state: resultState }))
              .catch((err) => {
                console.error('GamePlay: failed to complete session', err)
                navigate('/game/result', { state: resultState })
              })
          }
          return s
        })
        return
      }

      // Normal navigation
      clicksRef.current += 1
      pathRef.current = [...pathRef.current, nextCanonical]

      setClicks(clicksRef.current)
      setPath([...pathRef.current])

      // Batch write every 5 clicks (signed-in only)
      if (sessionIdRef.current && clicksRef.current % 5 === 0) {
        recordClickMutation.mutate({
          sessionId: sessionIdRef.current,
          clicks: clicksRef.current,
          path: pathRef.current,
        })
      }

      // Fetch next article
      void fetchArticle(nextCanonical)
    }

    doc.addEventListener('click', handler, true)
    navCleanupRef.current = () => {
      doc.removeEventListener('click', handler, true)
    }
  }

  // Cleanup nav handler on unmount
  useEffect(() => {
    return () => {
      navCleanupRef.current?.()
      navCleanupRef.current = null
    }
  }, [])

  function handleGiveUp() {
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
    navigate('/game')
  }

  // Warn before leaving mid-game
  useEffect(() => {
    if (!gameStarted) return
    const handler = (e) => {
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [gameStarted])

  if (challengeLoading || (!challenge && userId)) {
    return (
      <div className="-mx-4 -my-8">
        <div className="flex h-[calc(100dvh-4rem)] items-center justify-center text-sm text-slate-400">
          Loading challenge…
        </div>
      </div>
    )
  }

  if (!challenge) {
    return (
      <div className="-mx-4 -my-8">
        <div className="flex h-[calc(100dvh-4rem)] items-center justify-center text-sm text-slate-400">
          No challenge available today. Check back soon.
        </div>
      </div>
    )
  }

  return (
    // Escape the max-w-5xl px-4 py-8 container from App.jsx
    <div className="-mx-4 -my-8 flex flex-col" style={{ height: '100dvh' }}>
      <GameHUD
        targetArticle={targetArticle}
        clicks={clicks}
        elapsedSeconds={elapsedSeconds}
        onGiveUp={handleGiveUp}
      />

      <div className="relative flex-1 overflow-hidden">
        {htmlLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-white text-sm text-slate-400 z-10">
            Loading article…
          </div>
        )}
        {htmlError && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-white z-10">
            <p className="text-sm text-slate-500">{htmlError}</p>
            <button
              onClick={() => void fetchArticle(pathRef.current[pathRef.current.length - 1] ?? challenge.start_slug)}
              className="border border-primary px-4 py-2 text-xs font-medium text-primary hover:bg-primary hover:text-white transition-colors"
            >
              Retry
            </button>
          </div>
        )}
        {iframeHtml && (
          <iframe
            ref={iframeRef}
            key={iframeHtml.length} // re-key when html changes so onLoad fires
            title="Wikipedia article"
            srcDoc={iframeHtml}
            onLoad={handleIframeLoad}
            className="h-full w-full border-0 bg-white"
            sandbox="allow-same-origin allow-popups"
          />
        )}
      </div>

      <PathTrail path={path} />
    </div>
  )
}
