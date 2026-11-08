import { useEffect, useState } from 'react'

// Small supersampling caps sharpen silhouettes without following expensive 3x phone DPR.
export function usePlanetResolution() {
  const [ratio, setRatio] = useState(() => window.innerWidth < 768 ? 1.25 : 1.5)
  useEffect(() => {
    const query = window.matchMedia('(max-width: 767px)')
    const update = () => setRatio(query.matches ? 1.25 : 1.5)
    query.addEventListener('change', update)
    return () => query.removeEventListener('change', update)
  }, [])
  return ratio
}
