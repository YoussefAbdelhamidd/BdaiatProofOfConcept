import { Component, Suspense, useEffect, useRef } from 'react'
import type { ReactNode } from 'react'
import { Canvas, useFrame, useLoader, useThree } from '@react-three/fiber'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { MathUtils, Vector3 } from 'three'
import type { Group } from 'three'
import moonUrl from './assets/moon-mobile-webp.glb?url'

// Camera viewpoints follow the introduction and four content chapters.
const viewpoints = [
  { angle: 0, elevation: 0, distance: 6.8 },
  { angle: -0.7, elevation: 0.9, distance: 7.4 },
  { angle: -1.4, elevation: -0.5, distance: 7.1 },
  { angle: -2.1, elevation: 1.2, distance: 7.8 },
  { angle: -2.8, elevation: 0.2, distance: 7.2 },
]

function Moon({ reduced, onReady }: { reduced: boolean; onReady: () => void }) {
  const { scene } = useLoader(GLTFLoader, moonUrl)
  const group = useRef<Group>(null)
  const renderedFrames = useRef(0)
  const desiredPosition = useRef(new Vector3(0, 0, 6.8))
  const scroll = useRef(0)
  const footerApproach = useRef(0)
  const spin = useRef(0.3)
  const cameraAngle = useRef(0)
  const framingOffset = useRef(0)
  const lookTarget = useRef(new Vector3())
  const invalidate = useThree((state) => state.invalidate)
  const size = useThree((state) => state.size)

  useEffect(() => {
    const update = () => {
      // Match the camera stops to the actual sections, including responsive heights.
      const chapters = Array.from(document.querySelectorAll<HTMLElement>('.chapter'))
      const stops = [0, ...chapters.map((chapter) => chapter.offsetTop)]
      const footer = document.querySelector('.earth-footer')
      footerApproach.current = footer ? MathUtils.smoothstep(1 - footer.getBoundingClientRect().top / window.innerHeight, 0, 0.85) : 0
      const y = window.scrollY
      let segment = 0
      while (segment < stops.length - 2 && y >= stops[segment + 1]) segment++
      const from = stops[segment] ?? 0
      const to = stops[segment + 1] ?? from + window.innerHeight
      scroll.current = Math.min(4, segment + MathUtils.clamp((y - from) / Math.max(1, to - from), 0, 1))
      invalidate()
    }
    update()
    window.addEventListener('scroll', update, { passive: true })
    window.addEventListener('resize', update)
    // A modest frame rate is enough for a slow lunar rotation. Hidden tabs stop drawing.
    const timer = reduced ? undefined : window.setInterval(() => {
      if (!document.hidden) invalidate()
    }, 1000 / 30)
    return () => {
      window.removeEventListener('scroll', update)
      window.removeEventListener('resize', update)
      if (timer !== undefined) window.clearInterval(timer)
    }
  }, [invalidate, reduced])

  useFrame(({ camera }, delta) => {
    const dt = Math.min(delta, 0.1)
    // Rotation is time-based, never driven by page position.
    if (!reduced && !document.hidden) spin.current += dt * 0.12
    if (group.current) {
      group.current.rotation.set(0.06, spin.current, 0.04)
      const baseScale = Math.min(0.8, size.width / size.height * 0.9)
      const targetScale = baseScale * (1 - footerApproach.current * 0.5)
      const scale = reduced ? targetScale : MathUtils.lerp(group.current.scale.x, targetScale, 1 - Math.exp(-4 * dt))
      group.current.scale.setScalar(scale)
    }
    const index = Math.min(3, Math.floor(scroll.current))
    const progress = MathUtils.smoothstep(scroll.current - index, 0, 1)
    const from = viewpoints[index]
    const to = viewpoints[index + 1]
    const angle = reduced ? 0 : MathUtils.lerp(from.angle, to.angle, progress)
    const elevation = reduced ? 0 : MathUtils.lerp(from.elevation, to.elevation, progress)
    const distance = reduced ? 6.8 : MathUtils.lerp(from.distance, to.distance, progress)
    // Ease the orbital angle itself so the camera follows an arc, never cuts through it.
    const ease = 1 - Math.exp(-4 * dt)
    cameraAngle.current = MathUtils.lerp(cameraAngle.current, angle, ease)
    const radius = MathUtils.lerp(Math.hypot(camera.position.x, camera.position.z), distance, ease)
    const height = MathUtils.lerp(camera.position.y, elevation, ease)
    desiredPosition.current.set(Math.sin(cameraAngle.current) * radius, height, Math.cos(cameraAngle.current) * radius)
    camera.position.copy(desiredPosition.current)
    // Offset the hero composition to the right, then return to centered orbital framing.
    const heroAmount = 1 - MathUtils.smoothstep(scroll.current, 0, 1)
    const targetOffset = heroAmount * (size.width < 760 ? -0.65 : -2.15)
    framingOffset.current = renderedFrames.current === 0 ? targetOffset : MathUtils.lerp(framingOffset.current, targetOffset, ease)
    // Camera-local right vector keeps the framing stable throughout the orbit.
    lookTarget.current.set(
      Math.cos(cameraAngle.current) * framingOffset.current,
      0,
      -Math.sin(cameraAngle.current) * framingOffset.current,
    )
    camera.lookAt(lookTarget.current)
    // A previous complete frame means textures and shaders have reached the renderer.
    if (renderedFrames.current < 2) {
      renderedFrames.current++
      if (renderedFrames.current === 2) onReady()
      else invalidate()
    }
    // Finish camera easing when reduced motion is toggled back to the static view.
    if (reduced && (Math.abs(cameraAngle.current) > 0.001 || Math.abs(camera.position.y) > 0.001 || Math.abs(camera.position.z - 6.8) > 0.001 || Math.abs(framingOffset.current - targetOffset) > 0.001)) invalidate()
  })
  return <group ref={group} scale={Math.min(0.8, size.width / size.height * 0.9)}><primitive object={scene} /></group>
}

class SceneBoundary extends Component<{ children: ReactNode; onError: () => void }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() { return { failed: true } }
  componentDidCatch() { this.props.onError() }
  render() { return this.state.failed ? <div className="fallback-moon" /> : this.props.children }
}

export default function MoonScene({ reduced, onReady, onError }: { reduced: boolean; onReady: () => void; onError: () => void }) {
  return <SceneBoundary onError={onError}><Canvas frameloop="demand" dpr={[1, window.innerWidth < 768 ? 1 : 1.25]} camera={{ position: [0, 0, 6.8], fov: 43 }} gl={{ alpha: true, antialias: false, powerPreference: 'low-power' }} fallback={<div className="fallback-moon" />}>
    <ambientLight intensity={0.3} />
    <directionalLight position={[-4, 3, 5]} intensity={3.1} color="#fff5e7" />
    <directionalLight position={[3, -1, -4]} intensity={0.45} color="#b1c6f6" />
    <Suspense fallback={null}><Moon reduced={reduced} onReady={onReady} /></Suspense>
  </Canvas></SceneBoundary>
}
