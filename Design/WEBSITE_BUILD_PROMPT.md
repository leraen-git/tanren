# TANREN — Site web · Build Prompt

> **Pour Claude Code.** Ce document est un prompt complet pour construire le site marketing de Tanren depuis zéro. Le site est en français, hébergé sur Vercel, branché à Resend pour la waitlist beta.
>
> **Ground rules** :
> - Repo dédié : `tanren-web` (nouveau, pas dans le monorepo Tanren)
> - Stack : Astro 4 + TypeScript + Tailwind CSS 3 + Vercel adapter
> - Le mockup visuel cible se trouve dans `_design/website-mockup.html` (à committer dès le début pour référence pixel-perfect)
> - Quand le mockup et ce prompt divergent, **le mockup gagne pour le visuel**, ce prompt gagne pour la structure technique
> - Run `npm run build` après chaque batch significatif pour vérifier qu'il n'y a pas de régression
> - Si tu trouves quelque chose d'ambigu ou de bloquant, STOP et liste tes questions avant de procéder

---

## Table of contents

- [0 · Contexte produit & charte](#0--contexte-produit--charte)
- [1 · Stack technique](#1--stack-technique)
- [2 · Setup initial](#2--setup-initial)
- [3 · Arborescence complète](#3--arborescence-complète)
- [4 · Design tokens & charte](#4--design-tokens--charte)
- [5 · Composants à créer](#5--composants-à-créer)
- [6 · Pages & routes](#6--pages--routes)
- [7 · Waitlist API endpoint](#7--waitlist-api-endpoint)
- [8 · SEO & meta tags](#8--seo--meta-tags)
- [9 · Files `.well-known/`](#9--files-well-known)
- [10 · Déploiement Vercel](#10--déploiement-vercel)
- [11 · Validation finale](#11--validation-finale)

---

## 0 · Contexte produit & charte

**Tanren** est une application mobile de musculation française, en beta fermée. Le site web est un hub central qui sert trois objectifs :
1. Crédibilité de marque (investisseurs, presse, futurs partenaires)
2. Conversion vers la waitlist beta (inscription pour obtenir un accès)
3. Documentation publique (mentions légales, philosophie produit)

**Étymologie** : Tanren (鍛錬) est un mot japonais signifiant "forger, discipliner par la répétition". L'identité visuelle repose sur cette métaphore : l'enclume, le marteau, l'acier chauffé.

**Logo officiel** : Forge-Spark Mark — un cercle (enclume) avec un cœur rouge (acier chauffé), barres blanches (axes marteau/enclume), étincelles rouges diagonales. Le SVG canonique se trouve dans le mockup (`<svg viewBox="0 0 200 200">...`). Ne JAMAIS utiliser un logo haltère ou un autre logo — c'est le Forge-Spark exclusivement.

**Cible** : tous niveaux. Pas seulement les sportifs sérieux. L'IA s'adapte au niveau de l'utilisateur (débutant, intermédiaire, avancé).

**Ton de copy** :
- Tutoiement systématique
- Pas de vocabulaire wellness ("journey", "transformation", "beast mode")
- Vocabulaire forge à dose homéopathique (max 1-2 occurrences par page, sinon ça devient kitsch)
- Métrique uniquement (kg, cm, virgule décimale, espace milliers : `2 335 kcal`, `+4,8 %`)
- Direct et factuel, pas marketing

**Couleurs** :
- Forge dark : `#FF2D3F` (mode dark)
- Forge light : `#E8192C` (mode light)
- Iron : `#0A0A0A`, `#141414`
- Anvil : `#FFFFFF`, `#F5F5F5`
- Green : `#22c55e` (séries validées, progression positive)
- Amber : `#f59e0b` (progression flat)

**Typographie** :
- Barlow Condensed (Google Fonts) — 400 / 500 / 700 / 900 + italiques 400 / 900
- Noto Serif JP (Google Fonts) — 700 / 900 — RÉSERVÉ aux kanji 鍛 / 錬 / 鍛錬

---

## 1 · Stack technique

```yaml
Framework:    Astro 4.x (latest stable)
Language:     TypeScript (strict mode)
Styling:      Tailwind CSS 3.x + custom CSS variables for theme tokens
Adapter:      @astrojs/vercel (serverless mode)
Deployment:   Vercel
Forms:        Astro server actions + Resend Node SDK
Email:        Resend (domain send.tanren.fr déjà vérifié)
Audience:     Resend Audiences (créer un audience "Tanren Waitlist" via dashboard)
Analytics:    Aucune au lancement (pas de Plausible, pas de Vercel Analytics)
Fonts:        Google Fonts via @fontsource (self-hosted, pas de CDN externe)
Icons:        SVG inline (pas d'icon library)
```

**Pourquoi pas de framework UI (React/Vue/Svelte)** : Astro produit du HTML statique par défaut, c'est ce qu'on veut pour ce site marketing. Aucune interactivité complexe ne le justifie. Le seul JS nécessaire est :
- Toggle dark/light mode (10 lignes vanilla)
- Soumission du formulaire waitlist (server action Astro, pas besoin de React)

**Versions à pin dans `package.json`** :
```json
{
  "dependencies": {
    "astro": "^4.16.0",
    "@astrojs/vercel": "^7.8.0",
    "@astrojs/tailwind": "^5.1.0",
    "tailwindcss": "^3.4.0",
    "resend": "^4.0.0",
    "@fontsource/barlow-condensed": "^5.1.0",
    "@fontsource/noto-serif-jp": "^5.1.0"
  }
}
```

---

## 2 · Setup initial

### 2.1 · Créer le repo

```bash
# Sur ta machine, dans le dossier où tu mets tes projets
mkdir tanren-web
cd tanren-web
git init
```

Crée le repo `tanren-web` sur GitHub (privé pour l'instant), puis :

```bash
git remote add origin git@github.com:<ton-username>/tanren-web.git
```

### 2.2 · Initialiser Astro

```bash
npm create astro@latest -- --template minimal --typescript strict --install --git --no-houston .
```

Réponses au CLI :
- "Where should we create your new project?" → `.` (dossier actuel)
- "How would you like to start your new project?" → `Empty`
- "Install dependencies?" → `Yes`
- "Initialize a new git repository?" → `No` (déjà fait)
- "Do you plan to write TypeScript?" → `Yes`
- "How strict should TypeScript be?" → `Strict`

### 2.3 · Ajouter les intégrations

```bash
npx astro add tailwind --yes
npx astro add vercel --yes
```

Quand Astro demande de modifier `astro.config.mjs`, accepter.

### 2.4 · Installer les dépendances supplémentaires

```bash
npm install resend
npm install @fontsource/barlow-condensed @fontsource/noto-serif-jp
```

### 2.5 · Committer le mockup de référence

Le fichier `Tanren_Website_v3.html` (que l'utilisateur fournira) doit être copié dans `_design/website-mockup.html` du repo dès le début. Il sert de **source de vérité visuelle** — tu DOIS l'ouvrir et t'en inspirer pour chaque composant.

```bash
mkdir _design
# L'utilisateur copie le fichier HTML dans ce dossier manuellement
```

### 2.6 · Variables d'environnement

Crée `.env.example` à la racine :

```bash
# Resend
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxx
RESEND_AUDIENCE_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
RESEND_FROM_EMAIL=Tanren <noreply@send.tanren.fr>
RESEND_REPLY_TO=support@tanren.fr

# Site
PUBLIC_SITE_URL=https://tanren.fr
```

Crée aussi un `.env.local` avec les vraies valeurs (à garder dans `.gitignore`, vérifier que c'est bien ignoré).

**À récupérer** :
- `RESEND_API_KEY` : déjà créé dans le dashboard Resend
- `RESEND_AUDIENCE_ID` : créer un nouvel audience dans Resend → Audiences → "New Audience" → nom "Tanren Waitlist" → copier l'ID

### 2.7 · Ajouter `.gitignore`

Vérifier que ces lignes sont présentes :

```
.env
.env.local
.env.*.local
node_modules/
dist/
.vercel/
.astro/
```

---

## 3 · Arborescence complète

```
tanren-web/
├── _design/
│   └── website-mockup.html              # Source de vérité visuelle (copié au setup)
├── public/
│   ├── favicon.svg                       # Forge-Spark mark vectoriel
│   ├── favicon-32.png
│   ├── favicon-192.png
│   ├── apple-touch-icon.png              # 180x180
│   ├── og-image.png                      # 1200x630
│   ├── robots.txt
│   ├── sitemap.xml                       # Généré par Astro
│   └── .well-known/
│       ├── apple-app-site-association    # iOS universal links (sans extension)
│       └── assetlinks.json               # Android app links
├── src/
│   ├── components/
│   │   ├── layout/
│   │   │   ├── TopBar.astro
│   │   │   ├── Footer.astro
│   │   │   └── ThemeToggle.astro
│   │   ├── hero/
│   │   │   ├── Hero.astro
│   │   │   ├── ForgeSparkMark.astro
│   │   │   └── PhoneShowcase.astro
│   │   ├── phones/
│   │   │   ├── ActiveWorkoutPhone.astro
│   │   │   ├── AIGeneratorPhone.astro
│   │   │   ├── NutritionPhone.astro
│   │   │   └── LibraryPhone.astro
│   │   ├── sections/
│   │   │   ├── TrustStrip.astro
│   │   │   ├── Features.astro
│   │   │   ├── FeatureRow.astro
│   │   │   ├── WhyTanren.astro
│   │   │   ├── EtymologyBlock.astro
│   │   │   └── WaitlistForm.astro
│   │   └── icons/
│   │       └── (SVG icons inline as Astro components)
│   ├── layouts/
│   │   └── Base.astro                    # Layout principal avec <head>, theme script, etc.
│   ├── pages/
│   │   ├── index.astro                   # Home
│   │   ├── privacy.astro                 # Politique de confidentialité
│   │   ├── cgu.astro                     # Conditions générales
│   │   ├── cookies.astro                 # Politique cookies
│   │   ├── mentions-legales.astro
│   │   └── api/
│   │       └── waitlist.ts               # Endpoint POST /api/waitlist
│   ├── styles/
│   │   └── global.css                    # Tokens CSS, fonts, base styles
│   ├── lib/
│   │   ├── resend.ts                     # Client Resend wrapper
│   │   └── validators.ts                 # Validation Zod du formulaire
│   └── env.d.ts
├── astro.config.mjs
├── tailwind.config.mjs
├── tsconfig.json
├── package.json
├── .env.example
├── .gitignore
├── README.md
└── vercel.json                           # Config Vercel (rewrites pour .well-known)
```

---

## 4 · Design tokens & charte

### 4.1 · `src/styles/global.css`

```css
@import '@fontsource/barlow-condensed/400.css';
@import '@fontsource/barlow-condensed/500.css';
@import '@fontsource/barlow-condensed/700.css';
@import '@fontsource/barlow-condensed/900.css';
@import '@fontsource/barlow-condensed/400-italic.css';
@import '@fontsource/barlow-condensed/900-italic.css';
@import '@fontsource/noto-serif-jp/700.css';
@import '@fontsource/noto-serif-jp/900.css';

@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    /* Brand tokens (theme-independent) */
    --forge-dark: #FF2D3F;
    --forge-light: #E8192C;
    --green: #22c55e;
    --amber: #f59e0b;
  }

  html[data-theme="dark"] {
    /* Site theme tokens */
    --bg: #0A0A0A;
    --bg-2: #141414;
    --bg-3: #1F1F1F;
    --bg-soft: rgba(255, 255, 255, 0.02);
    --text: #FFFFFF;
    --text-mute: #888;
    --text-dim: #555;
    --text-ghost: #333;
    --border: rgba(255, 255, 255, 0.08);
    --border-strong: rgba(255, 255, 255, 0.16);
    --grid: rgba(255, 255, 255, 0.04);
    --accent: var(--forge-dark);
    --accent-glow: rgba(255, 45, 63, 0.25);
    --frame-border: #2a2a2a;

    /* App-internal tokens (inside phone screens) */
    --app-bg: #000000;
    --app-bg-soft: #0A0A0A;
    --app-text: #FFFFFF;
    --app-text-mute: #888888;
    --app-text-dim: #555555;
    --app-text-ghost: #444444;
    --app-border: rgba(255, 255, 255, 0.08);
    --app-border-soft: rgba(255, 255, 255, 0.04);
    --app-divider: rgba(255, 255, 255, 0.10);
    --phone-frame: #1a1a1a;
  }

  html[data-theme="light"] {
    --bg: #FFFFFF;
    --bg-2: #F5F5F5;
    --bg-3: #EBEBEB;
    --bg-soft: rgba(0, 0, 0, 0.02);
    --text: #0A0A0A;
    --text-mute: #666;
    --text-dim: #888;
    --text-ghost: #BBB;
    --border: rgba(0, 0, 0, 0.10);
    --border-strong: rgba(0, 0, 0, 0.18);
    --grid: rgba(0, 0, 0, 0.04);
    --accent: var(--forge-light);
    --accent-glow: rgba(232, 25, 44, 0.18);
    --frame-border: #DDD;

    --app-bg: #FFFFFF;
    --app-bg-soft: #FAFAFA;
    --app-text: #0A0A0A;
    --app-text-mute: #666666;
    --app-text-dim: #999999;
    --app-text-ghost: #BBBBBB;
    --app-border: rgba(0, 0, 0, 0.10);
    --app-border-soft: rgba(0, 0, 0, 0.05);
    --app-divider: rgba(0, 0, 0, 0.10);
    --phone-frame: #DDDDDD;
  }

  body {
    font-family: 'Barlow Condensed', sans-serif;
    background: var(--bg);
    color: var(--text);
    transition: background 0.25s ease, color 0.25s ease;
  }

  /* Background grid */
  body::before {
    content: '';
    position: fixed;
    inset: 0;
    background-image:
      linear-gradient(var(--grid) 1px, transparent 1px),
      linear-gradient(90deg, var(--grid) 1px, transparent 1px);
    background-size: 48px 48px;
    pointer-events: none;
    z-index: 0;
  }
}
```

### 4.2 · `tailwind.config.mjs`

```js
import type { Config } from 'tailwindcss';

export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Barlow Condensed', 'sans-serif'],
        serif: ['Noto Serif JP', 'serif'],
      },
      colors: {
        bg: 'var(--bg)',
        'bg-2': 'var(--bg-2)',
        'bg-3': 'var(--bg-3)',
        'bg-soft': 'var(--bg-soft)',
        text: 'var(--text)',
        'text-mute': 'var(--text-mute)',
        'text-dim': 'var(--text-dim)',
        'text-ghost': 'var(--text-ghost)',
        border: 'var(--border)',
        'border-strong': 'var(--border-strong)',
        accent: 'var(--accent)',
        'forge-dark': '#FF2D3F',
        'forge-light': '#E8192C',
        green: '#22c55e',
        amber: '#f59e0b',
      },
      letterSpacing: {
        'tanren-tight': '-0.01em',
        'tanren-normal': '0.04em',
        'tanren-wide': '0.12em',
        'tanren-wider': '0.16em',
        'tanren-widest': '0.32em',
      },
    },
  },
  plugins: [],
} satisfies Config;
```

**Important** : ne pas se reposer 100% sur Tailwind. Beaucoup de styles Tanren sont trop spécifiques (les phones, les set cards avec border verte/rouge, les pills horizontaux, etc.) et seront mieux écrits en CSS classique avec les variables. Tailwind est utilisé pour le scaffolding général (padding, margin, grid layouts, typography sizing) mais les composants signature ont leur propre CSS.

---

## 5 · Composants à créer

### 5.1 · `Base.astro` (layout principal)

```astro
---
interface Props {
  title: string;
  description: string;
  ogImage?: string;
  noIndex?: boolean;
}

const { title, description, ogImage = '/og-image.png', noIndex = false } = Astro.props;
const siteUrl = import.meta.env.PUBLIC_SITE_URL ?? 'https://tanren.fr';
const fullOgImage = ogImage.startsWith('http') ? ogImage : `${siteUrl}${ogImage}`;
---
<!doctype html>
<html lang="fr" data-theme="dark">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>{title}</title>
  <meta name="description" content={description} />
  {noIndex && <meta name="robots" content="noindex,nofollow" />}

  <!-- Favicons -->
  <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
  <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32.png" />
  <link rel="apple-touch-icon" href="/apple-touch-icon.png" />

  <!-- OG / Twitter -->
  <meta property="og:type" content="website" />
  <meta property="og:title" content={title} />
  <meta property="og:description" content={description} />
  <meta property="og:image" content={fullOgImage} />
  <meta property="og:url" content={Astro.url.href} />
  <meta property="og:site_name" content="Tanren" />
  <meta property="og:locale" content="fr_FR" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content={title} />
  <meta name="twitter:description" content={description} />
  <meta name="twitter:image" content={fullOgImage} />

  <!-- Theme init script: avoid flash of wrong theme -->
  <script is:inline>
    const stored = localStorage.getItem('tanren-theme');
    const prefers = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    const theme = stored ?? prefers;
    document.documentElement.setAttribute('data-theme', theme);
  </script>
</head>
<body>
  <slot />
</body>
</html>
```

**Important** : le script `is:inline` dans `<head>` doit s'exécuter AVANT le rendu du body pour éviter un flash blanc → noir au chargement. Pas de `defer`, pas de `async`, pas dans `<body>`.

### 5.2 · `ThemeToggle.astro`

Position fixed top-right, bouton rond avec icône soleil/lune. Le toggle bascule `data-theme` et persiste en `localStorage`. Voir le mockup pour le visuel exact.

```astro
---
---
<button
  type="button"
  id="theme-toggle"
  class="theme-toggle"
  aria-label="Basculer thème"
>
  <svg class="theme-icon-dark" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
  </svg>
  <svg class="theme-icon-light" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <circle cx="12" cy="12" r="5"/>
    <line x1="12" y1="1" x2="12" y2="3"/>
    <line x1="12" y1="21" x2="12" y2="23"/>
    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
    <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
    <line x1="1" y1="12" x2="3" y2="12"/>
    <line x1="21" y1="12" x2="23" y2="12"/>
    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
    <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
  </svg>
</button>

<style>
  .theme-toggle {
    position: fixed;
    top: 24px;
    right: 24px;
    z-index: 100;
    background: var(--bg-2);
    border: 1px solid var(--border);
    width: 48px;
    height: 48px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 0.2s;
    box-shadow: 0 4px 12px rgba(0,0,0,0.2);
  }
  .theme-toggle:hover {
    border-color: var(--accent);
    transform: scale(1.05);
  }
  .theme-toggle svg { width: 20px; height: 20px; color: var(--text); }
  :global(html[data-theme="dark"]) .theme-icon-light { display: none; }
  :global(html[data-theme="light"]) .theme-icon-dark { display: none; }
</style>

<script>
  const toggle = document.getElementById('theme-toggle');
  toggle?.addEventListener('click', () => {
    const html = document.documentElement;
    const current = html.getAttribute('data-theme');
    const next = current === 'dark' ? 'light' : 'dark';
    html.setAttribute('data-theme', next);
    localStorage.setItem('tanren-theme', next);
  });
</script>
```

### 5.3 · `ForgeSparkMark.astro`

Composant SVG du logo, paramétrable en taille et avec/sans glow.

```astro
---
interface Props {
  size?: number;
  glow?: boolean;
}
const { size = 100, glow = true } = Astro.props;
const glowId = `glow-${Math.random().toString(36).slice(2, 9)}`;
---
<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" width={size} height={size}>
  {glow && (
    <defs>
      <radialGradient id={glowId} cx="50%" cy="50%" r="50%">
        <stop offset="0%" stop-color="#FF2D3F" stop-opacity="0.5"/>
        <stop offset="60%" stop-color="#FF2D3F" stop-opacity="0"/>
      </radialGradient>
    </defs>
  )}
  {glow && <circle cx="100" cy="100" r="80" fill={`url(#${glowId})`}/>}
  <circle cx="100" cy="100" r="72" fill="none" stroke="currentColor" stroke-width="6"/>
  <circle cx="100" cy="100" r="14" fill="#FF2D3F"/>
  <rect x="92" y="20" width="16" height="50" fill="currentColor"/>
  <rect x="92" y="130" width="16" height="50" fill="currentColor"/>
  <rect x="20" y="92" width="50" height="16" fill="currentColor"/>
  <rect x="130" y="92" width="50" height="16" fill="currentColor"/>
  <line x1="148" y1="52" x2="135" y2="65" stroke="#FF2D3F" stroke-width="4" stroke-linecap="square"/>
  <line x1="52" y1="148" x2="65" y2="135" stroke="#FF2D3F" stroke-width="4" stroke-linecap="square"/>
</svg>
```

### 5.4 · Composants de phones

**Critique** : les 4 composants phones (`ActiveWorkoutPhone`, `AIGeneratorPhone`, `NutritionPhone`, `LibraryPhone`) doivent être copiés **fidèlement** depuis le mockup `_design/website-mockup.html`. Chaque phone est un composant Astro qui :

1. Wrapper `.phone` avec props `position` (`left`, `center`, `right`, `solo`) qui contrôle le transform
2. Status bar simulée (heure + icônes)
3. Contenu spécifique de l'écran avec toutes les classes CSS du mockup
4. CSS scoped au composant (utiliser `<style>` Astro, pas `<style is:global>`)

**Pattern à suivre pour chacun** :
```astro
---
interface Props {
  position?: 'left' | 'center' | 'right' | 'solo';
}
const { position = 'solo' } = Astro.props;
---
<div class={`phone ${position}`}>
  <div class="app">
    <!-- status bar -->
    <!-- contenu spécifique -->
  </div>
</div>

<style>
  /* Tous les styles spécifiques au phone (.phone, .app, .aw-*, etc.) */
</style>
```

**Couleurs à respecter strictement** :
- Tous les éléments à l'intérieur des phones utilisent `var(--app-*)` pour suivre le thème
- Les couleurs sémantiques (rouge `--forge-dark`, vert, ambre) restent fixes dans les deux thèmes
- Le `border` du phone utilise `var(--phone-frame)`

### 5.5 · Composants de sections

`TrustStrip.astro` — 4 items horizontaux avec icône SVG + label + sublabel
`Features.astro` — wrapper qui contient 4 `FeatureRow`
`FeatureRow.astro` — props : `eyebrow`, `title`, `body`, `bullets` (array), `phone` (slot pour le composant phone), `reverse` (boolean)
`WhyTanren.astro` — 4 cards en grid avec icône + titre + body
`EtymologyBlock.astro` — kanji 鍛錬 en grand + pronounce + titre + body
`WaitlistForm.astro` — formulaire HTML avec email, plateforme (pills), niveau (pills), fréquence (pills), submit. Voir [section 7](#7--waitlist-api-endpoint) pour l'intégration backend.

### 5.6 · Hero

Le composant `Hero.astro` orchestre :
- Corner accents (top-left, top-right)
- Watermark kanji 鍛 (très grande opacité 0.04)
- Logo `ForgeSparkMark` 100px avec glow
- Eyebrow "Beta fermée · sur invitation"
- H1 monumental "Forge ta force." / *"Une rep après l'autre."* (italique rouge)
- Kanji 鍛錬 sous le titre
- Subtitle (copy fournie en section 6)
- CTA primaire (rouge, "Rejoindre la waitlist") + secondaire (border, "Voir les fonctionnalités")
- Microcopy "Accès limité · Tous les niveaux · Aucun engagement"
- `PhoneShowcase` avec les 3 phones en éventail (gauche : ActiveWorkout, centre : AIGenerator, droite : Nutrition)

---

## 6 · Pages & routes

### 6.1 · Home `/` — `src/pages/index.astro`

Structure :
```
<Base title="..." description="...">
  <ThemeToggle />
  <TopBar />
  <Hero />
  <TrustStrip />
  <Features id="features" />        <!-- 4 feature rows -->
  <WhyTanren id="why" />            <!-- 4 cards -->
  <EtymologyBlock />
  <WaitlistForm id="waitlist" />
  <Footer />
</Base>
```

**Meta** :
- Title : `Tanren — Forge ta force, une rep après l'autre.`
- Description : `Application de musculation française. IA qui s'adapte à ton niveau, suivi de séance, 600+ exercices. Sans publicité, sans bullshit. Beta fermée.`

**Copy précise** (à reprendre du mockup, ne pas réinventer) :

Hero subtitle : *"L'application de musculation française qui s'adapte à toi grâce à l'IA. Que tu débutes ou que tu pousses fort depuis des années — l'app construit ton plan, suit ta progression et ajuste tes repas."*

Features section subtitle : *"L'IA s'adapte à toi. Que tu attaques tes premières séries ou que tu vises un nouveau record, l'app suit ton rythme et ajuste ton plan, ta nutrition et tes charges."*

Les 4 features (titre + body + bullets) sont littéralement copiées du mockup. Ne pas paraphraser.

### 6.2 · Pages légales

**Important** : les contenus légaux ne doivent PAS être inventés. Crée des templates structurés mais demande à l'utilisateur de remplir avec ses vrais infos avant publication. Marque les sections à compléter avec `[À COMPLÉTER : ...]`.

#### `/privacy` — Politique de confidentialité

Sections obligatoires RGPD :
- Identité du responsable de traitement
- Données collectées (email pour la waitlist, niveau, fréquence)
- Finalité du traitement (envoi d'invitation beta uniquement)
- Base légale (consentement explicite via le formulaire)
- Durée de conservation
- Droits de l'utilisateur (accès, rectification, effacement, opposition)
- DPO / contact (`contact@tanren.fr`)
- Sous-traitants (Resend pour l'envoi, Vercel pour l'hébergement)

#### `/cgu` — Conditions générales d'utilisation

Sections :
- Objet et acceptation
- Description du service (waitlist, future app)
- Inscription à la waitlist
- Propriété intellectuelle
- Responsabilité
- Loi applicable et juridiction (droit français)

#### `/cookies` — Politique cookies

Mention :
- Aucun cookie d'analyse au lancement
- Seulement `localStorage` pour le thème (pas un cookie, mais bon de mentionner)
- Si analytics ajoutés plus tard, mise à jour de la page

#### `/mentions-legales`

Obligatoires en France pour tout site collectant des données :
- Nom de l'entité éditrice
- Forme juridique (SAS, SARL, auto-entrepreneur, etc.) `[À COMPLÉTER]`
- Adresse `[À COMPLÉTER]`
- SIRET / SIREN `[À COMPLÉTER]`
- Email contact
- Directeur de publication `[À COMPLÉTER]`
- Hébergeur : Vercel Inc., 440 N Barranca Ave #4133, Covina, CA 91723, US

**Toutes ces pages utilisent le même `Base.astro` avec `noIndex={false}` (sauf si l'utilisateur préfère que les pages légales soient `noindex`).**

### 6.3 · TopBar — liens nav

```html
<nav>
  <a href="#features">Fonctionnalités</a>
  <a href="#why">Pourquoi</a>
  <a href="/#waitlist">Contact</a>
  <button onclick="document.getElementById('waitlist').scrollIntoView({behavior:'smooth'})">Rejoindre</button>
</nav>
```

Sur les pages légales, les liens `#features` et `#why` doivent rediriger vers `/#features` et `/#why` (page accueil + ancre).

### 6.4 · Footer — liens

```
Produit          Légal                    Contact
Fonctionnalités  Mentions légales         contact@tanren.fr
Pourquoi Tanren  Conditions               support@tanren.fr
Press kit        Confidentialité
                 Cookies
```

---

## 7 · Waitlist API endpoint

### 7.1 · Validation Zod

Crée `src/lib/validators.ts` :

```ts
import { z } from 'zod';

export const waitlistSchema = z.object({
  email: z.string().email({ message: 'Email invalide' }).max(254),
  platform: z.enum(['ios', 'android'], {
    errorMap: () => ({ message: 'Plateforme invalide' }),
  }),
  level: z.enum(['debutant', 'intermediaire', 'avance'], {
    errorMap: () => ({ message: 'Niveau invalide' }),
  }),
  frequency: z.enum(['2', '3', '4', '5', '6+'], {
    errorMap: () => ({ message: 'Fréquence invalide' }),
  }),
});

export type WaitlistInput = z.infer<typeof waitlistSchema>;
```

```bash
npm install zod
```

### 7.2 · Resend wrapper

Crée `src/lib/resend.ts` :

```ts
import { Resend } from 'resend';

const apiKey = import.meta.env.RESEND_API_KEY;
if (!apiKey) {
  throw new Error('RESEND_API_KEY is required');
}

export const resend = new Resend(apiKey);

export const RESEND_AUDIENCE_ID = import.meta.env.RESEND_AUDIENCE_ID;
export const RESEND_FROM = import.meta.env.RESEND_FROM_EMAIL ?? 'Tanren <noreply@send.tanren.fr>';
export const RESEND_REPLY_TO = import.meta.env.RESEND_REPLY_TO ?? 'support@tanren.fr';
```

### 7.3 · API endpoint

Crée `src/pages/api/waitlist.ts` :

```ts
import type { APIRoute } from 'astro';
import { waitlistSchema } from '../../lib/validators';
import { resend, RESEND_AUDIENCE_ID, RESEND_FROM, RESEND_REPLY_TO } from '../../lib/resend';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const parsed = waitlistSchema.safeParse(body);

    if (!parsed.success) {
      return new Response(JSON.stringify({
        ok: false,
        error: parsed.error.issues[0]?.message ?? 'Données invalides',
      }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    const { email, platform, level, frequency } = parsed.data;

    // 1. Add to Resend Audience
    const contactResult = await resend.contacts.create({
      email,
      audienceId: RESEND_AUDIENCE_ID,
      unsubscribed: false,
      // Custom fields not natively supported by Resend Audiences API
      // We'll prefix the firstName with metadata as a workaround
      firstName: `[${platform}|${level}|${frequency}]`,
    });

    if (contactResult.error) {
      // Resend returns 'already_exists' as an error — treat as success (idempotent)
      const isDuplicate = contactResult.error.message?.toLowerCase().includes('already');
      if (!isDuplicate) {
        console.error('[waitlist] Resend contact error:', contactResult.error);
        return new Response(JSON.stringify({
          ok: false,
          error: 'Impossible de t\'inscrire. Réessaie dans un instant.',
        }), { status: 500, headers: { 'Content-Type': 'application/json' } });
      }
    }

    // 2. Send confirmation email
    const emailResult = await resend.emails.send({
      from: RESEND_FROM,
      replyTo: RESEND_REPLY_TO,
      to: email,
      subject: 'Ta demande d\'accès Tanren · 鍛錬',
      html: confirmationEmailHtml({ email, level }),
    });

    if (emailResult.error) {
      // Log but don't fail — the contact is in the audience, that's what matters
      console.error('[waitlist] Resend email error:', emailResult.error);
    }

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('[waitlist] Unexpected error:', err);
    return new Response(JSON.stringify({
      ok: false,
      error: 'Erreur serveur. Réessaie dans un instant.',
    }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
};

function confirmationEmailHtml({ email, level }: { email: string; level: string }): string {
  const levelLabels: Record<string, string> = {
    debutant: 'Débutant',
    intermediaire: 'Intermédiaire',
    avance: 'Avancé',
  };

  return `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Tanren · Demande d'accès</title>
</head>
<body style="margin:0;padding:0;background:#0A0A0A;font-family:Helvetica,Arial,sans-serif;color:#FFF;">
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background:#0A0A0A;padding:40px 20px;">
    <tr>
      <td align="center">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="560" style="max-width:560px;">
          <!-- Logo / Header -->
          <tr>
            <td align="center" style="padding-bottom:32px;">
              <div style="font-size:11px;color:#FF2D3F;letter-spacing:0.32em;text-transform:uppercase;font-weight:500;">鍛錬 · Tanren</div>
            </td>
          </tr>

          <!-- Title -->
          <tr>
            <td align="center" style="padding-bottom:24px;">
              <h1 style="margin:0;font-size:36px;font-weight:900;line-height:1.1;text-transform:uppercase;color:#FFF;letter-spacing:-0.01em;">
                Demande<br>bien reçue.
              </h1>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:24px 0;border-top:1px solid rgba(255,255,255,0.08);border-bottom:1px solid rgba(255,255,255,0.08);">
              <p style="margin:0 0 16px;font-size:16px;line-height:1.6;color:#CCC;">
                Salut,
              </p>
              <p style="margin:0 0 16px;font-size:16px;line-height:1.6;color:#CCC;">
                On a bien enregistré ta demande d'accès à la beta fermée de Tanren. Profil noté : <strong style="color:#FFF;">${levelLabels[level] ?? level}</strong>.
              </p>
              <p style="margin:0 0 16px;font-size:16px;line-height:1.6;color:#CCC;">
                On revient vers toi dès qu'une place se libère. Ça peut prendre quelques jours, parfois quelques semaines — la beta est volontairement limitée pour qu'on puisse écouter chaque retour.
              </p>
              <p style="margin:0;font-size:16px;line-height:1.6;color:#CCC;">
                En attendant, frappe l'acier pendant qu'il est chaud.
              </p>
            </td>
          </tr>

          <!-- Sign-off -->
          <tr>
            <td style="padding-top:32px;">
              <p style="margin:0;font-size:14px;color:#888;font-style:italic;">
                — L'équipe Tanren
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td align="center" style="padding-top:48px;font-size:11px;color:#555;letter-spacing:0.06em;">
              <div style="margin-bottom:8px;">Tanren · Construite en France · Hébergée en Europe</div>
              <div>
                Tu reçois cet email parce que tu as demandé un accès sur tanren.fr.<br>
                Pour te désinscrire : <a href="mailto:support@tanren.fr?subject=Désinscription" style="color:#888;text-decoration:underline;">support@tanren.fr</a>
              </div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}
```

### 7.4 · Configuration Astro pour SSR

Dans `astro.config.mjs`, vérifier :

```js
import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';
import vercel from '@astrojs/vercel/serverless';

export default defineConfig({
  output: 'hybrid', // static by default, SSR for routes that need it
  adapter: vercel(),
  integrations: [tailwind()],
  site: 'https://tanren.fr',
});
```

`output: 'hybrid'` = pages statiques par défaut, mais l'API route `/api/waitlist` peut être dynamique grâce à `export const prerender = false`. C'est plus efficient que `output: 'server'` qui rendrait tout dynamique.

### 7.5 · Frontend du formulaire

Le composant `WaitlistForm.astro` doit :

1. Rendre le HTML du formulaire (copy fidèle du mockup)
2. Avoir des pills cliquables (boutons type="button" avec classe `.active` togglable)
3. Soumettre via fetch JS vers `/api/waitlist`
4. Afficher les états : idle / loading / success / error
5. En succès : remplacer le formulaire par un message "Demande reçue. Tu vas recevoir un email de confirmation."

```astro
<form id="waitlist-form" novalidate>
  <!-- ... champs ... -->
  <button type="submit" class="form-submit">Forger mon accès</button>
</form>

<div id="waitlist-success" hidden>
  <h3>Demande reçue.</h3>
  <p>On revient vers toi rapidement. Vérifie ta boîte mail dans quelques minutes pour la confirmation.</p>
</div>

<script>
  const form = document.getElementById('waitlist-form') as HTMLFormElement;
  const success = document.getElementById('waitlist-success');
  // ... gestion des pills (toggle .active, dataset.value)
  // ... submit handler avec fetch POST /api/waitlist
  // ... gestion errors et success state
</script>
```

---

## 8 · SEO & meta tags

### 8.1 · Meta de base (déjà dans `Base.astro`)

Couvre title, description, OG, Twitter cards, canonical (à ajouter).

### 8.2 · `robots.txt`

Crée `public/robots.txt` :

```
User-agent: *
Allow: /

Sitemap: https://tanren.fr/sitemap.xml
```

### 8.3 · Sitemap

Astro a une intégration officielle :

```bash
npx astro add sitemap
```

Configuration dans `astro.config.mjs` :

```js
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  // ...
  integrations: [tailwind(), sitemap()],
});
```

Le sitemap sera auto-généré à `/sitemap-index.xml` au build.

### 8.4 · OG image

Le fichier `public/og-image.png` (1200×630) est fourni dans le social kit. Il est référencé par défaut dans `Base.astro`.

### 8.5 · `lang="fr"` et `og:locale`

Déjà géré dans `Base.astro`. Important pour le SEO français.

---

## 9 · Files `.well-known/`

Ces fichiers sont nécessaires pour les universal links iOS et app links Android. **Critique** pour les testeurs Play Store actuels.

### 9.1 · Apple App Site Association (préparation iOS)

Créer `public/.well-known/apple-app-site-association` (sans extension) :

```json
{
  "applinks": {
    "apps": [],
    "details": [
      {
        "appID": "[TEAMID].[BUNDLE_ID_IOS]",
        "paths": [
          "/app/*",
          "/invite/*",
          "/share/*"
        ]
      }
    ]
  }
}
```

**À remplir par l'utilisateur quand iOS sera prêt** :
- `[TEAMID]` : Apple Developer Team ID (10 caractères, sur developer.apple.com → Membership)
- `[BUNDLE_ID_IOS]` : valeur de `ios.bundleIdentifier` du `app.json` Tanren

**Pour l'instant** : laisser des placeholders explicites comme `XXXXXXXXXX.fr.tanren.app` et documenter dans le README qu'il faut les remplacer avant le premier build TestFlight.

### 9.2 · Android App Links

Créer `public/.well-known/assetlinks.json` :

```json
[
  {
    "relation": ["delegate_permission/common.handle_all_urls"],
    "target": {
      "namespace": "android_app",
      "package_name": "[ANDROID_PACKAGE]",
      "sha256_cert_fingerprints": [
        "[SHA256_UPLOAD_KEY]",
        "[SHA256_APP_SIGNING_KEY]"
      ]
    }
  }
]
```

**À remplir** :
- `[ANDROID_PACKAGE]` : valeur exacte de `android.package` du `app.json` Tanren
- `[SHA256_UPLOAD_KEY]` : Play Console → ton app → Setup → App integrity → Upload key certificate → SHA-256
- `[SHA256_APP_SIGNING_KEY]` : Play Console → même endroit → App signing key certificate → SHA-256

### 9.3 · Configuration Vercel pour servir les fichiers `.well-known/`

Le fichier AASA doit être servi avec `Content-Type: application/json` malgré l'absence d'extension. Crée `vercel.json` à la racine :

```json
{
  "headers": [
    {
      "source": "/.well-known/apple-app-site-association",
      "headers": [
        {
          "key": "Content-Type",
          "value": "application/json"
        }
      ]
    },
    {
      "source": "/.well-known/assetlinks.json",
      "headers": [
        {
          "key": "Content-Type",
          "value": "application/json"
        }
      ]
    }
  ]
}
```

**Vérifier après déploiement** :
```bash
curl -I https://tanren.fr/.well-known/apple-app-site-association
# Doit retourner Content-Type: application/json
```

---

## 10 · Déploiement Vercel

### 10.1 · Push initial sur GitHub

```bash
git add .
git commit -m "feat: initial Tanren website (Astro + Tailwind + Resend)"
git push -u origin main
```

### 10.2 · Connecter à Vercel

1. Sur [vercel.com](https://vercel.com), login avec GitHub
2. "Add New" → "Project"
3. Import le repo `tanren-web`
4. Framework Preset : Vercel détecte Astro automatiquement
5. Root Directory : `.`
6. Build Command : `npm run build` (déjà détecté)
7. Output Directory : `dist` (déjà détecté)

**Avant de cliquer Deploy**, ajouter les Environment Variables :

| Variable | Valeur |
|----------|--------|
| `RESEND_API_KEY` | (depuis Resend dashboard) |
| `RESEND_AUDIENCE_ID` | (créer un audience "Tanren Waitlist" et copier l'ID) |
| `RESEND_FROM_EMAIL` | `Tanren <noreply@send.tanren.fr>` |
| `RESEND_REPLY_TO` | `support@tanren.fr` |
| `PUBLIC_SITE_URL` | `https://tanren.fr` |

Pour chaque var, cocher "Production", "Preview", "Development".

Cliquer "Deploy".

### 10.3 · Connecter le domaine

1. Vercel → Project → Settings → Domains
2. "Add Domain" → `tanren.fr`
3. Vercel demande d'ajouter ces records DNS chez Squarespace :
   - Type `A`, name `@`, value `76.76.21.21`
   - Type `CNAME`, name `www`, value `cname.vercel-dns.com`
4. Aller dans Squarespace → Domains → `tanren.fr` → DNS Settings → Add Record
5. Ajouter les deux records exactement comme indiqué
6. Retour Vercel → cliquer "Refresh" sur la vérif domaine → ça doit passer en quelques minutes
7. Vercel provisionne automatiquement le SSL Let's Encrypt

**Vérification** :
```bash
curl -I https://tanren.fr
# 200 OK avec headers Vercel
```

### 10.4 · Test de la waitlist en production

1. Aller sur tanren.fr → remplir le formulaire avec une vraie adresse email à toi
2. Soumettre
3. Vérifier dans Resend dashboard → Audiences → "Tanren Waitlist" : le contact doit apparaître
4. Vérifier la boîte mail : tu dois recevoir l'email de confirmation
5. Vérifier les headers Resend dans Resend → Emails : SPF: PASS, DKIM: PASS

Si SPF ou DKIM échouent, il y a un problème DNS à corriger avant d'aller plus loin.

---

## 11 · Validation finale

Avant de considérer le site comme prêt à être partagé publiquement :

### Visuel
- [ ] Le site rend exactement comme `_design/website-mockup.html` (test côte à côte)
- [ ] Toggle dark/light fonctionne et persiste après reload
- [ ] Les 4 phones (Active Workout, AI Generator, Nutrition, Library) suivent le thème
- [ ] Pas de flash blanc → noir au chargement initial (script inline `<head>` OK)
- [ ] Responsive sur mobile (375px), tablet (768px), desktop (1280px)
- [ ] Hero, features rows, why cards, etymology, waitlist tous bien centrés

### Fonctionnel
- [ ] Soumettre le formulaire avec une adresse valide → ajoute le contact dans Resend Audience
- [ ] L'email de confirmation arrive avec SPF + DKIM PASS
- [ ] Soumettre 2x avec la même adresse → pas d'erreur (idempotent grâce à la gestion `already_exists`)
- [ ] Soumettre avec une adresse invalide → message d'erreur affiché sans reload de page
- [ ] Toutes les pills (plateforme, niveau, fréquence) togglables
- [ ] CTA "Rejoindre la waitlist" du hero scroll smooth vers `#waitlist`
- [ ] Liens nav `#features`, `#why`, `#waitlist` fonctionnent

### Pages
- [ ] `/` (home) — ✓
- [ ] `/privacy` — contenu RGPD complet ou TODO clairement marqués
- [ ] `/cgu` — contenu ou TODO
- [ ] `/cookies` — contenu ou TODO
- [ ] `/mentions-legales` — placeholders pour SIRET, etc.
- [ ] Toutes les pages légales accessibles depuis le footer

### SEO
- [ ] `robots.txt` accessible à `/robots.txt`
- [ ] `sitemap-index.xml` accessible et liste les pages publiques
- [ ] Meta title + description par page
- [ ] OG image visible quand on partage le lien sur Twitter/Slack/iMessage (test avec [opengraph.xyz](https://www.opengraph.xyz/))

### Universal links
- [ ] `https://tanren.fr/.well-known/apple-app-site-association` retourne du JSON avec Content-Type correct
- [ ] `https://tanren.fr/.well-known/assetlinks.json` retourne du JSON avec Content-Type correct
- [ ] Les placeholders `[TEAMID]`, `[ANDROID_PACKAGE]`, etc. sont documentés dans le README pour remplacement avant build mobile

### Performance
- [ ] Lighthouse mobile : Performance 95+, Accessibility 95+, Best Practices 100, SEO 100
- [ ] First Contentful Paint < 1s
- [ ] Pas de console errors

### Sécurité
- [ ] Headers de sécurité par défaut Vercel actifs (HSTS, etc.)
- [ ] Pas de leak de secrets dans le client (vérifier `view-source:` ne contient pas de RESEND_API_KEY)
- [ ] Rate limiting sur `/api/waitlist` (à ajouter si abus, pas critique au lancement)

---

## Commit sequence recommandée

```
chore: bootstrap Astro + Tailwind + Vercel adapter
chore: add design tokens, fonts, base layout
feat(components): TopBar, ThemeToggle, Footer
feat(components): ForgeSparkMark logo SVG
feat(components): 4 phones (ActiveWorkout, AIGenerator, Nutrition, Library)
feat(components): Hero with PhoneShowcase
feat(components): TrustStrip, Features, FeatureRow
feat(components): WhyTanren, EtymologyBlock
feat(home): full home page
feat(api): waitlist endpoint with Resend Audience + confirmation email
feat(form): WaitlistForm with submit handler
feat(pages): legal pages (privacy, cgu, cookies, mentions-legales)
feat(seo): meta tags, sitemap, robots.txt, OG image
feat(deeplinks): .well-known/ files with placeholders
chore: vercel.json for content-type headers
docs: README with deployment instructions and TODOs
```

**STOP HERE** — l'utilisateur valide en local (`npm run dev`), push, déploie sur Vercel, configure le domaine, teste end-to-end. Une fois la waitlist confirmée fonctionnelle, le site est prêt à être partagé.

---

## Annexe — Notes importantes

### Sur Resend Audiences

Resend Audiences ne supporte **pas nativement** les custom fields à l'inscription. C'est pourquoi on prefix le `firstName` avec `[platform|level|frequency]` comme workaround. Quand tu prioriseras les invitations, tu pourras parser ces tags depuis le dashboard Resend.

Alternative à considérer plus tard : passer à un vrai stockage (Postgres sur Railway, Supabase) si la waitlist dépasse quelques centaines d'inscrits et que tu veux faire de l'analyse fine.

### Sur le ton de la copy

Si Claude Code se prend à inventer de la copy "marketing" qui sonne forcée — faux témoignages, claims grandiloquents, etc. — STOP. La copy doit rester :
- Sobre
- Factuelle
- Avec une touche forge minimaliste
- Sans superlatifs ("le meilleur", "incroyable", "révolutionnaire")

Le ton Tanren, c'est : *"Je sais ce que je propose, tu sais ce que tu cherches, on perd pas de temps."*

### Sur les pages légales

Si l'utilisateur n'a pas encore les infos juridiques (SIRET, forme juridique de l'entité éditrice), créer les pages avec des placeholders `[À COMPLÉTER]` clairement marqués en gras rouge. **Ne pas inventer** des numéros, des adresses, des noms.

Pour la première mise en ligne, l'utilisateur peut soit :
- Soumettre tel quel avec les TODO visibles (pas idéal mais acceptable pour une beta privée)
- Reporter ces pages et mettre un placeholder "Page à venir" temporaire
- Compléter immédiatement avant déploiement

À la discrétion de l'utilisateur.

---

*Site web · Tanren · Une rep après l'autre.*
