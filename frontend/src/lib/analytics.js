import _ga4 from 'react-ga4'

// react-ga4 ships CJS only. Vite wraps it so the default import is the
// module.exports object, which has the actual GA4 instance at .default.
const ReactGA = _ga4?.default ?? _ga4

const isProd = import.meta.env.PROD

export function initGA(measurementId) {
  if (!measurementId || !isProd) return
  ReactGA.initialize(measurementId)
}

export function sendPageview(pathname) {
  if (!isProd) return
  ReactGA.send({ hitType: 'pageview', page: pathname })
}

export function trackEvent(category, action, label = undefined, value = undefined) {
  if (!isProd) return
  ReactGA.event({ category, action, label, value })
}
