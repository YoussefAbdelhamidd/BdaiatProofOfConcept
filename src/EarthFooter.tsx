import { Component, Suspense, useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { Canvas, useFrame, useLoader, useThree } from '@react-three/fiber'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import type { Group } from 'three'
import earthUrl from './assets/earth-photoreal-2k-webp.glb?url'

function Earth({ active, reduced, onReady }: { active: boolean; reduced: boolean; onReady: () => void }) {
  const { scene } = useLoader(GLTFLoader, earthUrl)
  const group = useRef<Group>(null)
  const frames = useRef(0)
  const spin = useRef(-0.65)
  const invalidate = useThree((state) => state.invalidate)
  useEffect(() => {
    invalidate()
    if (!active || reduced) return
    const timer = window.setInterval(() => { if (!document.hidden) invalidate() }, 1000 / 30)
    return () => window.clearInterval(timer)
  }, [active, reduced, invalidate])
  useFrame((_, delta) => {
    if (active && !reduced && !document.hidden) spin.current += Math.min(delta, 0.1) * 0.1
    if (group.current) group.current.rotation.set(0, spin.current, 0.08)
    if (frames.current < 2) {
      frames.current++
      if (frames.current === 2) onReady()
      else invalidate()
    }
  })
  return <group ref={group}><primitive object={scene} /></group>
}

class EarthBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() { return { failed: true } }
  render() { return this.state.failed ? null : this.props.children }
}

export default function EarthFooter({ lang, reduced, note }: { lang: 'en' | 'ar'; reduced: boolean; note: string }) {
  const footer = useRef<HTMLElement>(null)
  const [near, setNear] = useState(false)
  const [active, setActive] = useState(false)
  const [ready, setReady] = useState(false)
  useEffect(() => {
    if (!footer.current) return
    const preload = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { setNear(true); preload.disconnect() }
    }, { rootMargin: '700px' })
    const visibility = new IntersectionObserver(([entry]) => setActive(entry.isIntersecting))
    preload.observe(footer.current)
    visibility.observe(footer.current)
    return () => { preload.disconnect(); visibility.disconnect() }
  }, [])
  return <footer ref={footer} className="earth-footer">
    <div className="earth-footer-heading"><p className="eyebrow">{lang === 'ar' ? 'من مدارنا إلى عالمك' : 'FROM OUR ORBIT TO YOUR WORLD'}</p><h2>{lang === 'ar' ? 'أفكار بلا حدود.' : 'No borders. Just possibilities.'}</h2><a href="#home">{lang === 'ar' ? 'العودة إلى البداية ↑' : 'Back to the beginning ↑'}</a></div>
    <div className="footer-earth" aria-hidden="true">
      <div className={`earth-static ${ready ? 'is-hidden' : ''}`} />
      <div className={`earth-canvas ${ready ? 'is-ready' : ''}`}>
        {near && <EarthBoundary><Canvas frameloop="demand" dpr={1} camera={{ position: [0, 0, 2.9], fov: 43 }} gl={{ alpha: true, antialias: false, powerPreference: 'low-power' }}>
          <ambientLight intensity={0.55} />
          <directionalLight position={[-3, 4, 5]} intensity={2.4} color="#fff9ef" />
          <directionalLight position={[4, 0, -2]} intensity={0.65} color="#96bfff" />
          <Suspense fallback={null}><Earth active={active} reduced={reduced} onReady={() => setReady(true)} /></Suspense>
        </Canvas></EarthBoundary>}
      </div>
    </div>
    <div className="footer-meta"><span>{note}</span><span>© {new Date().getFullYear()} BDAIAT</span></div>
  </footer>
}
