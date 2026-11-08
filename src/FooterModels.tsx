import { Component, Suspense, useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { useFrame, useLoader, useThree } from '@react-three/fiber'
import type { ThreeEvent } from '@react-three/fiber'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { MathUtils, Object3D, Vector3 } from 'three'
import type { Group, PerspectiveCamera } from 'three'
import earthUrl from './assets/earth-photoreal-detail-webp.glb?url'
import logoUrl from './assets/bdaiat-logo.glb?url'

function Models({ reduced }: { reduced: boolean }) {
  const [earth, logo] = useLoader(GLTFLoader, [earthUrl, logoUrl])
  const earthAnchor = useRef<Group>(null)
  const earthSpin = useRef<Group>(null)
  const logoAnchor = useRef<Group>(null)
  const logoSpin = useRef<Group>(null)
  const lights = useRef<Group>(null)
  const target = useMemo(() => new Object3D(), [])
  const state = useRef({ earth: -0.65, logo: 0, entrance: 0, x: 0, y: 0 })
  const drag = useRef<{ id: number; x: number; y: number; startX: number; startY: number } | null>(null)
  const vector = useRef(new Vector3())
  const invalidate = useThree(s => s.invalidate)
  const raycaster = useThree(s => s.raycaster)
  useEffect(() => {
    raycaster.layers.enable(1)
    earth.scene.traverse(o => o.layers.set(1))
    logo.scene.traverse(o => o.layers.set(1))
    invalidate()
    const keyboard = (event: Event) => {
      const { x, y, reset } = (event as CustomEvent<{ x: number; y: number; reset: boolean }>).detail
      if (reset) { state.current.x = 0; state.current.y = 0 }
      else { state.current.x += x * 20; state.current.y -= y * 20 }
      invalidate()
    }
    window.addEventListener('footer-logo-move', keyboard)
    return () => window.removeEventListener('footer-logo-move', keyboard)
  }, [earth.scene, logo.scene, invalidate, raycaster])

  useFrame(({ camera, size }, delta) => {
    camera.layers.enable(1)
    const dt = Math.min(delta, 0.1)
    const globe = document.querySelector('.footer-earth')?.getBoundingClientRect()
    const brand = document.querySelector('.footer-logo-stage')?.getBoundingClientRect()
    const perspective = camera as PerspectiveCamera
    const frameHeight = (distance: number) => 2 * Math.tan(perspective.fov * Math.PI / 360) * distance
    const place = (object: Group, x: number, y: number, distance: number) => {
      const height = frameHeight(distance)
      vector.current.set((x / size.width - 0.5) * height * size.width / size.height, (0.5 - y / size.height) * height, -distance)
      object.position.copy(vector.current.applyQuaternion(camera.quaternion).add(camera.position))
      object.quaternion.copy(camera.quaternion)
      return height / size.height
    }
    if (lights.current) { lights.current.position.copy(camera.position); lights.current.quaternion.copy(camera.quaternion) }
    if (globe && earthAnchor.current && earthSpin.current) {
      const visible = globe.top < size.height && globe.bottom > 0
      earthAnchor.current.visible = visible
      if (visible) {
        if (!reduced && !document.hidden) state.current.earth -= dt * 0.1
        const unit = place(earthAnchor.current, size.width / 2, globe.bottom + 30, 4)
        earthAnchor.current.scale.setScalar(globe.height * 0.94 * unit)
        earthSpin.current.rotation.set(0, state.current.earth, 0.08)
      }
    }
    if (brand && logoAnchor.current && logoSpin.current) {
      const visible = brand.top < size.height && brand.bottom > 0
      logoAnchor.current.visible = visible
      if (visible) {
        state.current.entrance = reduced ? 1 : Math.min(1, state.current.entrance + dt / 0.85)
        if (!reduced && !document.hidden && !drag.current) state.current.logo += dt * 0.3
        const p = 1 - Math.pow(1 - state.current.entrance, 3)
        const width = Math.min(450, size.width * 0.72)
        state.current.x = MathUtils.clamp(state.current.x, -size.width / 2 + width / 2 + 20, size.width / 2 - width / 2 - 20)
        const centerY = MathUtils.clamp(brand.top + brand.height / 2 + state.current.y, width * 0.12 + 12, size.height - width * 0.12 - 12)
        const unit = place(logoAnchor.current, size.width / 2 + state.current.x, centerY + (1 - p) * 35, 2.7)
        logoAnchor.current.scale.setScalar(width / 3 * unit * (0.8 + p * 0.2))
        logoSpin.current.rotation.set(0, state.current.logo - (1 - p) * 0.55, 0)
        if (state.current.entrance < 1) invalidate()
      }
    }
  })
  const endDrag = (event: ThreeEvent<PointerEvent>) => {
    if (drag.current?.id !== event.pointerId) return
    event.stopPropagation()
    const target = event.target as unknown as { releasePointerCapture: (id: number) => void }
    try { target.releasePointerCapture(event.pointerId) } catch { /* The browser may already have released capture. */ }
    drag.current = null
  }
  return <>
    <group ref={lights}>
      <primitive object={target} position={[0, 0, -4]} />
      <ambientLight intensity={0.65} onUpdate={l => l.layers.set(1)} />
      <directionalLight position={[-3, 4, 1]} target={target} intensity={1.9} color="#fff9ef" onUpdate={l => l.layers.set(1)} />
      <directionalLight position={[4, 0, -2]} target={target} intensity={0.6} color="#c9d9fb" onUpdate={l => l.layers.set(1)} />
    </group>
    <group ref={earthAnchor} visible={false}><group ref={earthSpin}><primitive object={earth.scene} /></group></group>
    <group ref={logoAnchor} visible={false}
      onPointerDown={event => {
        if (event.button !== 0) return
        event.stopPropagation()
        const target = event.target as unknown as { setPointerCapture: (id: number) => void }
        target.setPointerCapture(event.pointerId)
        drag.current = { id: event.pointerId, x: event.clientX, y: event.clientY, startX: state.current.x, startY: state.current.y }
      }}
      onPointerMove={event => {
        if (drag.current?.id !== event.pointerId) return
        event.stopPropagation()
        state.current.x = drag.current.startX + event.clientX - drag.current.x
        state.current.y = drag.current.startY + event.clientY - drag.current.y
        invalidate()
      }} onPointerUp={endDrag} onPointerCancel={endDrag}>
      <group ref={logoSpin}><primitive object={logo.scene} /></group>
    </group>
  </>
}

class FooterBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() { return { failed: true } }
  render() { return this.state.failed ? null : this.props.children }
}

export default function FooterModels({ reduced }: { reduced: boolean }) {
  const [near, setNear] = useState(false)
  useEffect(() => {
    const update = () => {
      const footer = document.querySelector('.earth-footer')
      if (footer && footer.getBoundingClientRect().top < window.innerHeight + 1800) setNear(true)
    }
    update()
    window.addEventListener('scroll', update, { passive: true })
    window.addEventListener('resize', update)
    return () => { window.removeEventListener('scroll', update); window.removeEventListener('resize', update) }
  }, [])
  return near ? <FooterBoundary><Suspense fallback={null}><Models reduced={reduced} /></Suspense></FooterBoundary> : null
}
