import { Component, Suspense, useCallback, useEffect, useRef, useState } from 'react'
import type { MutableRefObject, ReactNode } from 'react'
import { Canvas, useFrame, useLoader, useThree } from '@react-three/fiber'
import type { ThreeEvent } from '@react-three/fiber'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { MathUtils } from 'three'
import type { Group } from 'three'
import logoUrl from './assets/bdaiat-logo.glb?url'
import { usePlanetResolution } from './usePlanetResolution'

type Controls = { reset: () => void; nudge: (x: number, y: number) => void }
type CaptureTarget = { setPointerCapture: (id: number) => void; releasePointerCapture: (id: number) => void }

function Logo({ visible, reduced, controlsRef, onReady }: { visible: boolean; reduced: boolean; controlsRef: MutableRefObject<Controls | null>; onReady: () => void }) {
  const { scene } = useLoader(GLTFLoader, logoUrl)
  const group = useRef<Group>(null)
  const transform = useRef({ x: 0, y: 0, yaw: 0, pitch: 0 })
  const drag = useRef<{ id: number; x: number; y: number; start: typeof transform.current; target: CaptureTarget } | null>(null)
  const spin = useRef(0)
  const entrance = useRef(0)
  const frames = useRef(0)
  const invalidate = useThree((s) => s.invalidate)
  const viewport = useThree((s) => s.viewport)
  const canvas = useThree((s) => s.gl.domElement)
  const canvasRef = useRef(canvas)
  const scale = Math.min(viewport.width * 0.7 / 3, viewport.height * 0.6 / 0.672)
  const maxX = Math.max(0.1, (viewport.width - 3 * scale) / 2)
  const maxY = Math.max(0.1, (viewport.height - 0.672 * scale) / 2)

  useEffect(() => {
    invalidate()
    if (!visible || reduced) return
    const timer = window.setInterval(() => { if (!document.hidden) invalidate() }, 1000 / 30)
    return () => window.clearInterval(timer)
  }, [visible, reduced, invalidate])
  useEffect(() => {
    const reset = () => { transform.current = { x: 0, y: 0, yaw: 0, pitch: 0 }; invalidate() }
    controlsRef.current = {
      reset,
      nudge: (x, y) => {
        const t = transform.current
        t.x = MathUtils.clamp(t.x + x * viewport.width * 0.035, -maxX, maxX)
        t.y = MathUtils.clamp(t.y + y * viewport.height * 0.06, -maxY, maxY)
        invalidate()
      },
    }
    return () => { controlsRef.current = null }
  }, [controlsRef, invalidate, maxX, maxY, viewport.width, viewport.height])

  useFrame((_, delta) => {
    if (visible && !reduced && !document.hidden && !drag.current) spin.current += Math.min(delta, 0.1) * 0.3
    if (visible && entrance.current < 1) entrance.current = reduced ? 1 : Math.min(1, entrance.current + Math.min(delta, 0.05) / 0.85)
    const p = 1 - Math.pow(1 - entrance.current, 3)
    if (group.current) {
      const t = transform.current
      group.current.position.set(t.x, t.y - (1 - p) * 0.5, 0)
      group.current.rotation.set(t.pitch, t.yaw + spin.current - (1 - p) * 0.55, 0)
      group.current.scale.setScalar(scale * (0.72 + 0.28 * p))
    }
    if (frames.current < 2) {
      frames.current++
      if (frames.current === 2) onReady()
      else invalidate()
    }
    if (visible && entrance.current < 1) invalidate()
  })

  const endDrag = (event: ThreeEvent<PointerEvent>) => {
    if (!drag.current || event.pointerId !== drag.current.id) return
    event.stopPropagation()
    try { drag.current.target.releasePointerCapture(event.pointerId) } catch { /* Capture may already be released by the browser. */ }
    drag.current = null
    canvasRef.current.style.cursor = 'grab'
  }
  return <group ref={group}
    onPointerDown={(event) => {
      if (event.button !== 0) return
      event.stopPropagation()
      const target = event.target as unknown as CaptureTarget
      target.setPointerCapture(event.pointerId)
      drag.current = { id: event.pointerId, x: event.clientX, y: event.clientY, start: { ...transform.current }, target }
      canvasRef.current.style.cursor = 'grabbing'
    }}
    onPointerMove={(event) => {
      const d = drag.current
      if (!d || event.pointerId !== d.id) return
      event.stopPropagation()
      const dx = (event.clientX - d.x) / canvasRef.current.clientWidth
      const dy = (event.clientY - d.y) / canvasRef.current.clientHeight
      transform.current.x = MathUtils.clamp(d.start.x + dx * viewport.width, -maxX, maxX)
      transform.current.y = MathUtils.clamp(d.start.y - dy * viewport.height, -maxY, maxY)
      invalidate()
    }}
    onPointerUp={endDrag}
    onPointerCancel={endDrag}
  ><primitive object={scene} /></group>
}

class LogoBoundary extends Component<{ children: ReactNode; lang: 'en' | 'ar'; onError: () => void }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() { return { failed: true } }
  componentDidCatch() { this.props.onError() }
  render() { return this.state.failed ? <img className="footer-logo-fallback" src={`${import.meta.env.BASE_URL}logoEn.svg`} alt={this.props.lang === 'ar' ? 'بدايات' : 'Bdaiat'} /> : this.props.children }
}

export default function FooterLogo({ near, reduced, lang }: { near: boolean; reduced: boolean; lang: 'en' | 'ar' }) {
  const dpr = usePlanetResolution()
  const stage = useRef<HTMLDivElement>(null)
  const controlsRef = useRef<Controls | null>(null)
  const [visible, setVisible] = useState(false)
  const [ready, setReady] = useState(false)
  const markReady = useCallback(() => setReady(true), [])
  useEffect(() => {
    if (!stage.current) return
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), { threshold: 0.2 })
    observer.observe(stage.current)
    return () => observer.disconnect()
  }, [])
  const ar = lang === 'ar'
  return <div className="footer-logo-interactive">
    <div ref={stage} className={`footer-logo-stage ${ready && visible ? 'is-visible' : ''}`} tabIndex={0} role="group"
      aria-label={ar ? 'شعار ثلاثي الأبعاد يدور تلقائياً. اسحب أو استخدم الأسهم للتحريك، واضغط R لإعادة الموضع.' : 'Rotating 3D logo. Drag or use arrow keys to move. Press R to reset its position.'}
      onKeyDown={(event) => {
        const direction = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, 1], ArrowDown: [0, -1] }[event.key]
        if (direction) { event.preventDefault(); controlsRef.current?.nudge(direction[0], direction[1]) }
        if (event.key.toLowerCase() === 'r') { event.preventDefault(); controlsRef.current?.reset() }
      }}>
      {near && <LogoBoundary lang={lang} onError={markReady}><Canvas frameloop="demand" dpr={dpr} camera={{ position: [0, 0, 5], fov: 35 }} gl={{ alpha: true, antialias: true, powerPreference: 'low-power' }} fallback={<img className="footer-logo-fallback" src={`${import.meta.env.BASE_URL}logoEn.svg`} alt="Bdaiat" />}>
        <ambientLight intensity={1.2} />
        <directionalLight position={[-3, 3, 5]} intensity={2.2} />
        <directionalLight position={[4, -1, 2]} intensity={0.6} color="#d7ee9b" />
        <Suspense fallback={null}><Logo visible={visible} reduced={reduced} controlsRef={controlsRef} onReady={markReady} /></Suspense>
      </Canvas></LogoBoundary>}
    </div>
  </div>
}
