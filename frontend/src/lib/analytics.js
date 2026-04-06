import ReactGA from 'react-ga4'

const isProd = import.meta.env.PROD

export function trackEvent(category, action, label = undefined, value = undefined) {
  if (!isProd) return
  ReactGA.event({ category, action, label, value })
}
