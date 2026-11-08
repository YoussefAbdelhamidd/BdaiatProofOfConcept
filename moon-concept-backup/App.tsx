import { Component, Suspense, useState } from 'react'
import type { ReactNode } from 'react'
import { Canvas } from '@react-three/fiber'
import { Html, OrbitControls, useGLTF } from '@react-three/drei'
import moonUrl from './assets/moon-mobile-webp.glb?url'
import './App.css'

function Moon() {
  const { scene } = useGLTF(moonUrl)
  return <primitive object={scene} />
}

class SceneErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() { return { failed: true } }
  render() {
    return this.state.failed
      ? <div className="scene-error" role="alert">The moon could not load. <button onClick={() => window.location.reload()}>Try again</button></div>
      : this.props.children
  }
}

function App() {
  const [rotating, setRotating] = useState(false)
  return (
    <main className="moon-preview">
      <header className="preview-heading"><span>BDAIAT / EXPLORATIONS</span><h1>A closer look at the moon.</h1></header>
      <SceneErrorBoundary>
        <Canvas frameloop={rotating ? 'always' : 'demand'} dpr={[1, 1.5]} camera={{ position: [0, 0.5, 6.5], fov: 42 }} gl={{ antialias: true }} fallback={<p className="scene-error">Your browser needs WebGL to display this scene.</p>}>
          <color attach="background" args={['#080b12']} />
          <ambientLight intensity={0.35} />
          <directionalLight position={[-4, 3, 5]} intensity={3} color="#fff5e7" />
          <directionalLight position={[4, -1, -3]} intensity={0.65} color="#9cbcff" />
          <Suspense fallback={<Html center><span className="loading-moon" role="status">Loading moon…</span></Html>}>
            <Moon />
          </Suspense>
          <OrbitControls makeDefault enablePan={false} minDistance={2.8} maxDistance={12} autoRotate={rotating} autoRotateSpeed={0.4} />
        </Canvas>
      </SceneErrorBoundary>
      <footer className="preview-controls"><p>Drag to orbit · Scroll or pinch to zoom</p><button aria-pressed={rotating} onClick={() => setRotating(!rotating)}>{rotating ? 'Pause rotation' : 'Rotate moon'}</button></footer>
    </main>
  )
}

export default App
