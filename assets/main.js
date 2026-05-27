// =============================================================
// Kaushal Edara — portfolio interactions
// no build step. one file. vanilla JS modules.
// =============================================================

// --------- 1. Lenis smooth scroll (loaded from CDN) -----------
const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches

if (!prefersReduced) {
  // Lenis 1.x ESM build from jsDelivr
  import('https://cdn.jsdelivr.net/npm/lenis@1.1.18/dist/lenis.mjs')
    .then(({ default: Lenis }) => {
      const lenis = new Lenis({
        duration: 1.05,
        easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
        smoothWheel: true,
      })
      const raf = (time) => {
        lenis.raf(time)
        requestAnimationFrame(raf)
      }
      requestAnimationFrame(raf)

      // nav anchor links should use lenis scrollTo for snap
      document.querySelectorAll('a[href^="#"]').forEach((a) => {
        a.addEventListener('click', (e) => {
          const href = a.getAttribute('href')
          if (!href || href === '#') return
          const target = document.querySelector(href)
          if (!target) return
          e.preventDefault()
          lenis.scrollTo(target, { offset: -20 })
        })
      })
    })
    .catch(() => {
      // graceful fallback: native smooth scroll already set in CSS
    })
}

// --------- 2. Reveal-on-scroll via IntersectionObserver -------
const revealEls = document.querySelectorAll('.reveal')
if (revealEls.length && 'IntersectionObserver' in window) {
  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (e.isIntersecting) {
          e.target.classList.add('in')
          io.unobserve(e.target)
        }
      }
    },
    { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
  )
  revealEls.forEach((el) => io.observe(el))
} else {
  revealEls.forEach((el) => el.classList.add('in'))
}

// --------- 3. Hover tilt on [data-tilt] cards -----------------
if (!prefersReduced && window.matchMedia('(pointer: fine)').matches) {
  const tiltEls = document.querySelectorAll('[data-tilt]')
  tiltEls.forEach((el) => {
    el.style.transformStyle = 'preserve-3d'
    el.style.transition = 'transform 0.2s cubic-bezier(.2,.7,.2,1)'
    el.addEventListener('mousemove', (e) => {
      const r = el.getBoundingClientRect()
      const x = (e.clientX - r.left) / r.width - 0.5
      const y = (e.clientY - r.top) / r.height - 0.5
      const rx = (-y * 4).toFixed(2)
      const ry = (x * 5).toFixed(2)
      el.style.transform = `perspective(900px) rotateX(${rx}deg) rotateY(${ry}deg) translateY(-4px)`
    })
    el.addEventListener('mouseleave', () => {
      el.style.transform = ''
    })
  })
}

// --------- 4. Magnetic primary CTA buttons --------------------
if (!prefersReduced && window.matchMedia('(pointer: fine)').matches) {
  document.querySelectorAll('.btn--primary, .nav__cta').forEach((btn) => {
    btn.style.transition = 'transform 0.18s cubic-bezier(.2,.7,.2,1)'
    btn.addEventListener('mousemove', (e) => {
      const r = btn.getBoundingClientRect()
      const x = (e.clientX - r.left - r.width / 2) / r.width
      const y = (e.clientY - r.top - r.height / 2) / r.height
      btn.style.transform = `translate(${x * 10}px, ${y * 8}px)`
    })
    btn.addEventListener('mouseleave', () => {
      btn.style.transform = ''
    })
  })
}

// --------- 5. Footer year auto-fill ---------------------------
const yrEl = document.getElementById('yr')
if (yrEl) yrEl.textContent = new Date().getFullYear()

// --------- 6. Console easter egg ------------------------------
console.log(
  '%c hi 👋 you opened devtools. ',
  'background:#111;color:#F5EFE4;padding:6px 10px;font-family:JetBrains Mono,monospace;border-radius:4px;'
)
console.log(
  '%c want to talk? kaushaledaracloudmail@gmail.com ',
  'background:#E54B2B;color:#fff;padding:6px 10px;font-family:JetBrains Mono,monospace;border-radius:4px;'
)
