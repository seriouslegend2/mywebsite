# mywebsite

Personal portfolio for **Edara Sri Sai Kaushal** (Kaushal Edara).

Live at: <https://seriouslegend2.github.io/mywebsite/>

## Stack

- Plain **HTML / CSS / vanilla JS** (ES modules). No build step.
- Fonts: **Instrument Serif** (display) + **Space Grotesk** (body) + **JetBrains Mono** (mono), via Google Fonts.
- Smooth scroll via **Lenis** loaded from CDN as an ES module.
- Hosted on **GitHub Pages** via the workflow in `.github/workflows/pages.yml` — every push to `main` redeploys.

### Why no framework?

- One `index.html`, one `style.css`, one `main.js` — easier to read and tweak than a build pipeline.
- Ships ~zero JS; Lenis is the only runtime dependency and it lazy-loads from CDN.
- GitHub Pages serves it directly. No `base` path mismatches, no SSG quirks.

## Local dev

Any static file server. Easiest:

```bash
cd ~/Documents/ai-cache/mywebsite
python -m http.server 4000
# then visit http://localhost:4000/
```

Or:

```bash
npx serve .
```

## Structure

```
index.html              # full markup, sections 01–05 + CTA + footer
assets/
  style.css             # all styles — paper-cream + ink + tomato palette
  main.js               # Lenis, IntersectionObserver reveals, tilt, magnetic buttons
  images/               # avatar, project covers, favicon
.github/workflows/
  pages.yml             # auto-deploy on push to main
.nojekyll               # disable Jekyll so /assets/* paths serve cleanly
```

## Deploy

- Pushed to `main` → workflow runs → GitHub Pages publishes the repo root.
- If Pages hasn't been enabled, do it once at **Settings → Pages → Source: GitHub Actions**.

## Credits

Designed and built by Kaushal Edara — no templates, no shadcn, no glass morphism.
