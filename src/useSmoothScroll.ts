import { useEffect } from 'react'
import { gsap } from 'gsap'
import { ScrollToPlugin } from 'gsap/ScrollToPlugin'

gsap.registerPlugin(ScrollToPlugin)

export function useSmoothScroll(enabled: boolean) {
  useEffect(() => {
    if (!enabled) return

    let tween: gsap.core.Tween | undefined
    let target = window.scrollY
    let direction = 0
    const originalBehavior = document.documentElement.style.scrollBehavior
    const restoreBehavior = () => { document.documentElement.style.scrollBehavior = originalBehavior }
    const stop = () => {
      tween?.kill()
      tween = undefined
      target = window.scrollY
      direction = 0
      restoreBehavior()
    }
    const onWheel = (event: WheelEvent) => {
      if (event.defaultPrevented || event.ctrlKey || event.metaKey || Math.abs(event.deltaX) > Math.abs(event.deltaY)) return
      if (document.body.style.overflow === 'hidden' || document.querySelector('dialog[open]')) return

      // Let nested scroll areas consume their own wheel input.
      let element = event.target instanceof Element ? event.target : null
      while (element && element !== document.body) {
        const { overflowY } = getComputedStyle(element)
        if (/(auto|scroll)/.test(overflowY) && element.scrollHeight > element.clientHeight) {
          stop()
          return
        }
        element = element.parentElement
      }

      const delta = event.deltaY * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? window.innerHeight : 1)
      if (!delta || !event.cancelable) return
      event.preventDefault()
      const nextDirection = Math.sign(delta)
      if (!tween?.isActive() || nextDirection !== direction) target = window.scrollY
      direction = nextDirection
      target = gsap.utils.clamp(0, Math.max(0, document.documentElement.scrollHeight - window.innerHeight), target + delta)
      tween?.kill()
      document.documentElement.style.scrollBehavior = 'auto'
      tween = gsap.to(window, {
        scrollTo: { y: target, autoKill: true, onAutoKill: stop },
        duration: 0.24,
        ease: 'power2.out',
        onComplete: () => { tween = undefined; restoreBehavior() },
      })
    }

    window.addEventListener('wheel', onWheel, { passive: false })
    window.addEventListener('pointerdown', stop, { passive: true })
    window.addEventListener('touchstart', stop, { passive: true })
    window.addEventListener('keydown', stop)
    window.addEventListener('resize', stop)
    return () => {
      stop()
      window.removeEventListener('wheel', onWheel)
      window.removeEventListener('pointerdown', stop)
      window.removeEventListener('touchstart', stop)
      window.removeEventListener('keydown', stop)
      window.removeEventListener('resize', stop)
    }
  }, [enabled])
}
