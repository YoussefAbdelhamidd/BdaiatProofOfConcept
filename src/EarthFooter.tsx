export default function EarthFooter({ lang, note }: { lang: 'en' | 'ar'; reduced?: boolean; note: string }) {
  const ar = lang === 'ar'
  return <footer className="earth-footer">
    <div className="footer-logo-interactive">
      <div className="footer-logo-stage shared-logo-anchor" tabIndex={0} role="group"
        aria-label={ar ? 'شعار ثلاثي الأبعاد يدور حول الأرض. اسحبه ثم اتركه ليعود إلى مداره، أو استخدم الأسهم للتحريك.' : '3D logo orbiting Earth. Drag and release to return to orbit, or use arrow keys to move. Press R to reset.'}
        onKeyDown={event => {
          const direction = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, 1], ArrowDown: [0, -1] }[event.key]
          const reset = event.key.toLowerCase() === 'r'
          if (direction || reset) {
            event.preventDefault()
            window.dispatchEvent(new CustomEvent('footer-logo-move', { detail: { x: direction?.[0] ?? 0, y: direction?.[1] ?? 0, reset } }))
          }
        }} />
    </div>
    <div className="earth-footer-heading"><p className="eyebrow">{ar ? 'من مدارنا إلى عالمك' : 'FROM OUR ORBIT TO YOUR WORLD'}</p><h2>{ar ? 'أفكار بلا حدود.' : 'No borders. Just possibilities.'}</h2><a href="#home">{ar ? 'العودة إلى البداية ↑' : 'Back to the beginning ↑'}</a></div>
    <div className="footer-earth" aria-hidden="true" />
    <div className="footer-meta"><span>{note}</span><span>© {new Date().getFullYear()} BDAIAT</span></div>
  </footer>
}
