import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import './App.css'

const MoonScene = lazy(() => import('./MoonScene'))
const copy = {
  en: { nav: ['Our universe', 'What we do', 'Selected work', 'Let’s talk'], eyebrow: 'INDEPENDENT MINDS. SHARED GRAVITY.', title: ['Ideas beyond', 'the ordinary.'], intro: 'Every great beginning starts with a little curiosity. Welcome to our orbit.', scroll: 'SCROLL TO EXPLORE', label: 'A NEW PERSPECTIVE', heading: 'Good things start with a different point of view.', body: 'We imagine a world where ambitious ideas become meaningful experiences. A space for brands to discover what comes next.', serviceLabel: 'WHAT WE COULD CREATE', serviceTitle: 'A whole universe of possibilities.', services: ['Brand worlds', 'Digital experiences', 'Stories in motion'], workLabel: 'CONCEPT EXPLORATION / 01', workTitle: 'Built to pull you in.', workBody: 'Identity, interaction and a little unexpected magic. A glimpse of how your next project could feel.', contactLabel: 'YOUR NEXT CHAPTER', contactTitle: 'Let’s make something worth orbiting.', contactBody: 'Have a world in mind? Let’s explore it together.', cta: 'Start a conversation', back: 'Back to the beginning', note: 'BDAIAT · INTERACTIVE CONCEPT', demo: 'Illustrative content · Scroll concept', explore: 'Explore the possibilities' },
  ar: { nav: ['عالمنا', 'ماذا نقدم', 'أعمال مختارة', 'لنتحدث'], eyebrow: 'أفكار مستقلة. جاذبية مشتركة.', title: ['أفكار تتجاوز', 'المألوف.'], intro: 'كل بداية عظيمة تبدأ بقليل من الفضول. أهلاً بك في مدارنا.', scroll: 'مرّر للاستكشاف', label: 'منظور جديد', heading: 'الأشياء الجميلة تبدأ بنظرة مختلفة.', body: 'نتخيّل عالماً تتحول فيه الأفكار الطموحة إلى تجارب ذات معنى. مساحة تكتشف فيها العلامات ما هو قادم.', serviceLabel: 'ما يمكن أن نصنعه', serviceTitle: 'عالم كامل من الاحتمالات.', services: ['عوالم العلامات', 'تجارب رقمية', 'قصص تنبض بالحركة'], workLabel: 'تصوّر إبداعي / ٠١', workTitle: 'تجربة تجذبك إليها.', workBody: 'هوية وتفاعل وقليل من السحر غير المتوقع. لمحة عمّا يمكن أن يكون عليه مشروعك القادم.', contactLabel: 'فصلك القادم', contactTitle: 'لنصنع شيئاً يستحق أن ندور حوله.', contactBody: 'لديك فكرة لعالم جديد؟ لنستكشفه معاً.', cta: 'لنبدأ الحديث', back: 'العودة إلى البداية', note: 'بدايات · تصوّر تفاعلي', demo: 'محتوى توضيحي · تجربة تمرير', explore: 'استكشف الاحتمالات' },
}
const ids = ['universe', 'possibilities', 'work', 'contact']

function App() {
  const [lang, setLang] = useState<'en' | 'ar'>(() => localStorage.getItem('bdaiat-lang') === 'ar' ? 'ar' : 'en')
  const [reduced, setReduced] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches)
  const [active, setActive] = useState(0)
  const root = useRef<HTMLElement>(null)
  const t = copy[lang]
  useEffect(() => {
    document.documentElement.lang = lang
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr'
    document.title = lang === 'ar' ? 'بدايات | عالم من الاحتمالات' : 'Bdaiat — A universe of possibilities'
    localStorage.setItem('bdaiat-lang', lang)
  }, [lang])
  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)')
    const update = () => setReduced(query.matches)
    query.addEventListener('change', update)
    return () => query.removeEventListener('change', update)
  }, [])
  useEffect(() => {
    let frame = 0
    const update = () => {
      frame = 0
      const h = window.innerHeight
      root.current?.style.setProperty('--hero-opacity', String(Math.max(0, 1 - window.scrollY / (h * 0.65))))
      const chapters = root.current?.querySelectorAll<HTMLElement>('.chapter')
      let current = 0
      chapters?.forEach((chapter, index) => {
        const rect = chapter.getBoundingClientRect()
        const p = Math.min(1, Math.max(0, (h - rect.top) / (h * 0.85)))
        const exit = Math.min(1, Math.max(0, rect.bottom / (h * 0.5)))
        const panel = chapter.querySelector<HTMLElement>('.orbit-panel')
        const mobile = window.innerWidth < 760
        const offset = mobile ? 0 : Math.min(window.innerWidth * 0.29, 430) * (index % 2 ? 1 : -1)
        const ease = 1 - Math.pow(1 - p, 3)
        panel?.style.setProperty('--x', `${reduced ? offset : offset * ease}px`)
        panel?.style.setProperty('--y', `${reduced ? 0 : (1 - ease) * 130}px`)
        panel?.style.setProperty('--scale', String(reduced ? 1 : 0.72 + ease * 0.28))
        panel?.style.setProperty('--opacity', String(reduced ? exit : Math.min(1, p * 3) * exit))
        chapter.style.zIndex = mobile || reduced || p > 0.58 ? '3' : '1'
        if (rect.top < h * 0.65) current = index
      })
      setActive(current)
      const max = document.documentElement.scrollHeight - h
      root.current?.style.setProperty('--progress', String(max > 0 ? window.scrollY / max : 0))
    }
    const schedule = () => { if (!frame) frame = requestAnimationFrame(update) }
    update()
    window.addEventListener('scroll', schedule, { passive: true }); window.addEventListener('resize', schedule)
    return () => { cancelAnimationFrame(frame); window.removeEventListener('scroll', schedule); window.removeEventListener('resize', schedule) }
  }, [reduced])
  return <main ref={root} className={`cosmos ${reduced ? 'reduced-motion' : ''}`}>
    <div className="starfield" aria-hidden="true" />
    <div className="moon-stage" aria-hidden="true"><Suspense fallback={<div className="fallback-moon" />}><MoonScene reduced={reduced} /></Suspense></div>
    <header className="navbar">
      <a className="brand" href="#home" aria-label={lang === 'ar' ? 'بدايات — الرئيسية' : 'Bdaiat — Home'}><img src={`${import.meta.env.BASE_URL}logo${lang === 'ar' ? 'Ar' : 'En'}.svg`} alt={lang === 'ar' ? 'بدايات' : 'Bdaiat'} width="143" height="32" /></a>
      <nav aria-label={lang === 'ar' ? 'التنقل الرئيسي' : 'Main navigation'}>{t.nav.map((name, i) => <a key={ids[i]} href={`#${ids[i]}`} className={active === i ? 'current' : ''}>{name}</a>)}</nav>
      <button className="lang-switch" onClick={() => setLang(lang === 'en' ? 'ar' : 'en')} aria-label={lang === 'en' ? 'Switch to Arabic' : 'Switch to English'}>{lang === 'en' ? 'العربية' : 'EN'} <span>↗</span></button>
    </header>
    <section id="home" className="hero">
      <div className="hero-copy"><p className="eyebrow"><span className="status-dot" />{t.eyebrow}</p><h1>{t.title[0]}<br /><em>{t.title[1]}</em></h1></div>
      <div className="hero-bottom"><p>{t.intro}</p><a href="#universe" className="scroll-link">{t.scroll}<span>↓</span></a><span className="coordinate">30° 02′ N &nbsp; 31° 14′ E</span></div>
      <span className="orbital-label" aria-hidden="true">LUNA / 01<br />384,400 KM</span>
    </section>
    <section className="chapter" id="universe"><div className="orbit-panel editorial-panel"><span className="section-index">01 / 04</span><p className="eyebrow">{t.label}</p><h2>{t.heading}</h2><p className="body-copy">{t.body}</p><a className="text-link" href="#possibilities">{t.explore}<span>↗</span></a></div></section>
    <section className="chapter" id="possibilities"><div className="orbit-panel services-panel"><span className="section-index">02 / 04</span><p className="eyebrow">{t.serviceLabel}</p><h2>{t.serviceTitle}</h2><div className="service-list">{t.services.map((s, i) => <div key={s}><span>0{i + 1}</span><h3>{s}</h3><span>↗</span></div>)}</div></div></section>
    <section className="chapter" id="work"><div className="orbit-panel work-panel"><div className="project-art" aria-hidden="true"><span className="project-orbit" /><span className="project-word">beyond<span>®</span></span><small>AN EXPLORATION IN POSSIBILITY</small></div><div className="project-caption"><p className="eyebrow">{t.workLabel}</p><h2>{t.workTitle}</h2><p className="body-copy">{t.workBody}</p><span className="demo-tag">{t.demo}</span></div></div></section>
    <section className="chapter contact-chapter" id="contact"><div className="orbit-panel contact-panel"><span className="section-index">04 / 04</span><p className="eyebrow">{t.contactLabel}</p><h2>{t.contactTitle}</h2><p className="body-copy">{t.contactBody}</p><button className="contact-button" onClick={() => { const dialog = document.querySelector<HTMLDialogElement>('#contact-dialog'); dialog?.showModal() }}>{t.cta}<span>↗</span></button><a className="back-link" href="#home">↑ {t.back}</a></div></section>
    <div className="page-rail" aria-hidden="true"><span>0{active + 1}</span><div><i /></div><span>04</span></div>
    <footer className="site-footer"><span>{t.note}</span><span>© {new Date().getFullYear()} BDAIAT</span></footer>
    <dialog id="contact-dialog"><form method="dialog"><button className="close-dialog" aria-label={lang === 'ar' ? 'إغلاق' : 'Close'}>×</button><p className="eyebrow">{t.demo}</p><h2>{t.cta}</h2><p>{lang === 'ar' ? 'هذه معاينة للتصميم. سنضيف وسيلة التواصل الفعلية في النسخة النهائية.' : 'This is a design preview. Your real contact details or enquiry form will go here.'}</p></form></dialog>
  </main>
}
export default App
