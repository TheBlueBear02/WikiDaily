export function buildAuthUrl({ returnTo }) {
  const qs = new URLSearchParams()
  if (returnTo) qs.set('returnTo', returnTo)
  const suffix = qs.toString()
  return suffix ? `/auth?${suffix}` : '/auth'
}

export function getReturnToFromLocation(location) {
  const params = new URLSearchParams(location?.search ?? '')
  const v = params.get('returnTo')
  return v && v.startsWith('/') ? v : null
}

