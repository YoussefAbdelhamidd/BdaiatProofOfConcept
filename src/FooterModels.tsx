import { Component, Suspense, useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { useFrame, useLoader, useThree } from '@react-three/fiber'
import type { ThreeEvent } from '@react-three/fiber'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { Box3, MathUtils, Object3D, Sphere, Vector3 } from 'three'
import type { Group, Mesh, MeshStandardMaterial, PerspectiveCamera } from 'three'
import earthUrl from './assets/earth-photoreal-detail-webp.glb?url'
import logoUrl from './assets/bdaiat-logo.glb?url'

function Models({ reduced }: { reduced: boolean }) {
  const [earth, logo] = useLoader(GLTFLoader, [earthUrl, logoUrl])
  const navyLogo = useMemo(() => {
    const scene = logo.scene.clone(true)
    scene.traverse(object => {
      const mesh = object as Mesh
      if (!mesh.isMesh) return
      const tint = (source: MeshStandardMaterial) => {
        const material = source.clone()
        material.color.set('#edf1f8')
        material.map = null
        if (material.emissive) material.emissive.set('#000000')
        material.metalness = 0.25
        material.roughness = 0.38
        material.depthTest = true
        material.depthWrite = true
        return material
      }
      mesh.material = Array.isArray(mesh.material)
        ? mesh.material.map(material => tint(material as MeshStandardMaterial))
        : tint(mesh.material as MeshStandardMaterial)
    })
    return scene
  }, [logo.scene])
  useEffect(() => () => {
    navyLogo.traverse(object => {
      const mesh = object as Mesh
      if (!mesh.isMesh) return
      const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
      materials.forEach(material => material.dispose())
    })
  }, [navyLogo])
  const clearance = useMemo(() => {
    earth.scene.updateMatrixWorld(true)
    navyLogo.updateMatrixWorld(true)
    const earthBounds = new Box3().setFromObject(earth.scene)
    const earthSize = earthBounds.getSize(new Vector3())
    return {
      earthCenter: earthBounds.getCenter(new Vector3()),
      earthRadius: Math.max(earthSize.x, earthSize.y, earthSize.z) / 2,
      logo: new Box3().setFromObject(navyLogo).getBoundingSphere(new Sphere()),
      center: new Vector3(),
      logoCenter: new Vector3(),
      outward: new Vector3(),
    }
  }, [earth.scene, navyLogo])
  const earthAnchor = useRef<Group>(null)
  const earthSpin = useRef<Group>(null)
  const logoAnchor = useRef<Group>(null)
  const logoSpin = useRef<Group>(null)
  const lights = useRef<Group>(null)
  const target = useMemo(() => new Object3D(), [])
  const state = useRef({ earth: -0.65, orbit: 0, entrance: 0, x: 0, y: 0 })
  const drag = useRef<{ id: number; x: number; y: number; startX: number; startY: number } | null>(null)
  const vector = useRef(new Vector3())
  const invalidate = useThree(s => s.invalidate)
  const raycaster = useThree(s => s.raycaster)
  useEffect(() => {
    raycaster.layers.enable(1)
    earth.scene.traverse(o => o.layers.set(1))
    navyLogo.traverse(o => o.layers.set(1))
    invalidate()
    const keyboard = (event: Event) => {
      const { x, y, reset } = (event as CustomEvent<{ x: number; y: number; reset: boolean }>).detail
      if (reset) { state.current.x = 0; state.current.y = 0 }
      else { state.current.x += x * 20; state.current.y -= y * 20 }
      invalidate()
    }
    window.addEventListener('footer-logo-move', keyboard)
    return () => window.removeEventListener('footer-logo-move', keyboard)
  }, [earth.scene, navyLogo, invalidate, raycaster])

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
    if (brand && globe && logoAnchor.current && logoSpin.current) {
      const visible = globe.top < size.height && globe.bottom > 0
      logoAnchor.current.visible = visible
      if (visible) {
        state.current.entrance = reduced ? 1 : Math.min(1, state.current.entrance + dt / 0.85)
        if (!reduced && !document.hidden && !drag.current) state.current.orbit += dt * 0.25
        const p = 1 - Math.pow(1 - state.current.entrance, 3)
        const width = Math.min(280, size.width * 0.48)
        const marginX = width / 2 + 16
        const marginY = width * 0.12 + 16
        // Project the orbit over the visible cap of the globe, keeping the
        // entire logo inside the viewport even on narrow screens.
        const orbitRadiusX = Math.max(0, Math.min(globe.width * 0.32, size.width / 2 - marginX))
        const orbitTop = Math.max(marginY, globe.top + globe.height * 0.12)
        const orbitBottom = Math.max(orbitTop, Math.min(size.height - marginY, globe.top + globe.height * 0.62))
        const orbitRadiusY = (orbitBottom - orbitTop) / 2
        const orbitX = Math.sin(state.current.orbit) * orbitRadiusX
        const orbitY = (orbitTop + orbitBottom) / 2 - Math.cos(state.current.orbit) * orbitRadiusY
        if (!drag.current) {
          state.current.x = reduced ? 0 : MathUtils.damp(state.current.x, 0, 4, dt)
          state.current.y = reduced ? 0 : MathUtils.damp(state.current.y, 0, 4, dt)
          if (Math.abs(state.current.x) + Math.abs(state.current.y) > 0.1) invalidate()
        }
        const centerX = MathUtils.clamp(size.width / 2 + orbitX + state.current.x, marginX, size.width - marginX)
        const centerY = MathUtils.clamp(orbitY + state.current.y, marginY, size.height - marginY)
        // The far half travels behind both planets in the shared depth buffer.
        // Match depth to the ellipse so the logo emerges at either side.
        const orbitDistance = 6 + Math.cos(state.current.orbit) * 3.6
        const unit = place(logoAnchor.current, centerX, centerY + (1 - p) * 35, orbitDistance)
        logoAnchor.current.scale.setScalar(width / 3 * unit * (0.8 + p * 0.2))
        logoSpin.current.rotation.set(0, 0, 0)
        if (earthAnchor.current && earthSpin.current) {
          // Keep the whole logo outside the globe, including while dragging
          // and returning. Depth still allows natural occlusion on the far side.
          earthAnchor.current.updateWorldMatrix(true, true)
          logoAnchor.current.updateWorldMatrix(true, true)
          clearance.center.copy(clearance.earthCenter).applyMatrix4(earthSpin.current.matrixWorld)
          clearance.logoCenter.copy(clearance.logo.center).applyMatrix4(logoSpin.current.matrixWorld)
          const earthRadius = clearance.earthRadius * earthAnchor.current.scale.x
          const logoRadius = clearance.logo.radius * logoAnchor.current.scale.x
          const minimumDistance = earthRadius + logoRadius + earthRadius * 0.06
          clearance.outward.subVectors(clearance.logoCenter, clearance.center)
          const distance = clearance.outward.length()
          if (distance < minimumDistance) {
            if (distance < 0.0001) clearance.outward.set(0, 1, 0)
            else clearance.outward.multiplyScalar(1 / distance)
            logoAnchor.current.position.addScaledVector(clearance.outward, minimumDistance - distance)
          }
        }
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
    invalidate()
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
      <group ref={logoSpin}><primitive object={navyLogo} /></group>
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
