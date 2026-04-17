# CLAUDE.md — Branding Section (Tanren v1.0)

> Drop-in replacement for the "Project" and any naming/design sections of your existing CLAUDE.md. Paste near the top of the file so it sets the tone for every subsequent dev decision.

---

## Project

**Tanren** (鍛錬) — a mobile strength training app.

- **Name:** Tanren (pronounced *tan-ren*, /ˈtan.ɾen/)
- **Etymology:** Japanese — *forging through intense, repeated training*. Composed of 鍛 (tan, "to forge / hammer metal") and 錬 (ren, "to refine / temper through repetition"). Originates in martial traditions and bladesmithing — a katana is *tanren*-ed: folded, hammered, heated, cooled, thousands of times.
- **Tagline / Moto:** *Built rep by rep.*
- **Descriptive baseline:** Eat. Train. Rest.
- **Positioning:** Strength training app for committed practitioners. Gym/muscu classique ADN.

Replace any legacy references (`FitTrack`, `Sisu`) with `Tanren` everywhere: app name, bundle ID, package names, copy, env vars, documentation. Suggested bundle ID: `app.tanren` or `com.tanren.app`.

---

## Brand identity (non-negotiable design constraints)

### Color palette

Strict three-color system. Do not introduce additional brand colors.

| Token | Hex (light) | Hex (dark) | Usage |
|---|---|---|---|
| `color.bg.primary` | `#FFFFFF` | `#000000` | Main background |
| `color.text.primary` | `#000000` | `#FFFFFF` | Main text |
| `color.accent` | `#E8192C` | `#FF2D3F` | PRs, CTAs, active states, logo |
| `color.text.secondary` | `#888888` | `#888888` | Timestamps, captions |
| `color.border` | `#CCCCCC` | `#222222` | Dividers, card outlines |
| `color.surface.raised` | `#F7F7F7` | `#111111` | Cards, modals |

**Color naming convention** internal to the brand: black is "iron", white is "anvil", red is "forge". Use these names in design comments and storybook descriptions to reinforce the brand metaphor across the team.

**Semantic colors** (volume comparison only):

| Token | Hex | Usage |
|---|---|---|
| `color.semantic.up` | `#1A7F2C` | Volume increased vs last session |
| `color.semantic.flat` | `#D98E00` | Volume matched vs last session |
| `color.semantic.down` | `#E8192C` / `#FF2D3F` | Volume decreased vs last session |

### Units & locale (France launch)

Tanren launches in France first. All weights, distances, and measurements use the **metric system**, no exceptions.

| Measurement | Unit | Display format | Example |
|---|---|---|---|
| Weight (load) | kilograms | `XXX kg` (no decimal if whole, 1 decimal otherwise) | `100 kg`, `82.5 kg` |
| Bodyweight | kilograms | `XX.X kg` (always 1 decimal) | `78.4 kg` |
| Volume / tonnage | kilograms | `X XXX kg` (space as thousands separator, French convention) | `12 450 kg` |
| Plate weights | kilograms | Standard Olympic disc set: `20 / 15 / 10 / 5 / 2.5 / 1.25 kg` | — |
| Bar weight | kilograms | Olympic bar = `20 kg`, women's bar = `15 kg` | — |
| Height | centimeters | `XXX cm` | `178 cm` |
| Distance (warm-up walk, etc.) | meters / kilometers | `X.X km` above 1 km, `XXX m` below | `2.4 km`, `400 m` |
| Time (rest, session) | minutes / seconds | `M:SS` for rest timer, `H:MM` for total session | `2:30`, `1:24` |
| Date format | French | `DD/MM/YYYY` or `DD MMM YYYY` | `15/04/2026`, `15 avr. 2026` |
| First day of week | Monday | Heatmap and calendar always start on Monday | — |
| Decimal separator | comma (in user-facing UI text only) | `82,5 kg` in prose copy; `82.5` in inputs/code | — |
| Thousands separator | space (French standard) | `12 450 kg` not `12,450 kg` or `12.450 kg` | — |

**Locale code:** `fr-FR` everywhere — `Intl.NumberFormat('fr-FR')`, `date-fns/locale/fr`, `i18n` keys default to French.

**No imperial units anywhere in the UI.** Even as a "user preference toggle" — defer that until international expansion. Keeping the app metric-only at launch removes a whole category of locale bugs and reinforces the gym-classique-FR positioning.

**Database storage:** still store all weights as `Float` in kilograms (canonical SI unit), regardless of display. This way future imperial support is just a display-layer conversion, not a data migration.

### Typography

- **Single typeface:** Barlow Condensed
- **Weights in use:** Bold (headers, numbers, PRs), Medium (buttons, labels), Regular (body), Light (captions — sparingly)
- **ALL CAPS** for headers, CTAs, labels; never for body
- **Numbers always bold** — weights, reps, sets, PRs
- **Tracking:** +0.04em for all-caps labels; +0.12em for the wordmark TANREN (wider than usual to evoke the architectural weight of forged steel)
- **Italic** reserved exclusively for the moto. Do not use italic anywhere in UI chrome.

### Secondary mark — kanji 鍛錬

- May appear as a watermark, packaging detail, or oversized background graphic in marketing
- Use Noto Serif JP (free Google Font) when rendering 鍛錬
- Always paired with the romanization TANREN nearby — never standalone in user-facing contexts
- In small sizes (< 32 px), omit the kanji entirely; the wordmark is sufficient

### Logo & splash

The logo is composed of three elements:
1. **Forge-spark mark** — a circular geometric symbol: outer ring (anvil), red core (heated steel), vertical/horizontal bars (hammer + anvil axes), red diagonal sparks (impact)
2. **Wordmark** — TANREN in Barlow Condensed Bold, tracking +0.12em
3. **Optional kanji stamp** — 鍛錬 in Noto Serif JP, red

**Splash screen rules:**
- Black background (`#000000`)
- 24px or 40px grid overlay at `#1A1A1A`
- Centered forge-spark mark with radial red glow (`#FF2D3F` @ 30-40% opacity, animated subtle pulse, 3s ease-in-out)
- TANREN wordmark below the mark, white, Barlow Condensed Bold, tracking +0.16em
- Kanji 鍛錬 below the wordmark, small, in red
- Moto *Built rep by rep.* below in italic red
- Baseline `EAT.  TRAIN.  REST.` anchored at bottom 60px in grey, all caps, tracking +0.4em

**Sizing:**
- App icon: 60×60 px minimum (drops glow effect below 120×120)
- Wordmark in marketing: 96 px width minimum
- Below 60 px: use the forge-spark mark alone, no wordmark, no kanji

**SVG mark assets:** stored in `/assets/brand/logo/` as `mark-dark.svg`, `mark-light.svg`, `wordmark-dark.svg`, `wordmark-light.svg`, `lockup-dark.svg`, `lockup-light.svg`.

---

## Voice & copy rules

Tanren speaks like a training partner who respects the user. **Direct, informed, never condescending. Never performative, never cute.**

### Always use

Reps · PR · Working sets · Warm-up sets · Volume · Tonnage · 1RM · RPE · Deload · Hypertrophy block · Strength block · Superset · Drop set · AMRAP · Disque (20 / 15 / 10 / 5 / 2.5 / 1.25 kg)

### Forge-themed vocabulary (use sparingly, for flavor)

The forge metaphor is the brand's DNA — surface it occasionally to reinforce identity, but never as the dominant tone. Overuse turns into kitsch and undermines the no-fluff voice.

- "Forge a new PR." — milestone copy
- "Temper your volume across the week." — programming hint
- "47 days at the anvil." — consistency milestone
- "Hammered." — minimal post-set confirmation (optional alternative to "Logged.")

**Frequency rule:** at most 1 forge-themed phrase per screen. Most copy stays neutral and gym-vernacular.

### Never use

Wellness · Journey · Transformation · Crushing it · Leveling up · Beast mode · Grind (as verb) · Score · Points · Badges · Level up · "Goals unlocked" · Katana / samurai / dojo references (cliché)

### No emojis in UI

Do not render emojis anywhere in the app.

### Copy examples

| Bad | Good |
|---|---|
| "Great job crushing that workout! 💪" | "Session logged. Volume +4.2% vs last week." |
| "Ready to start your fitness journey?" | "Choose a program. Start today." |
| "Oh no, you missed a workout!" | "Last session: 3 days ago." |
| "Keep going, champion!" | "2 sessions this week. Target: 4." |
| "You're on fire! 🔥" | "Current streak: 12 days." |
| "Welcome to your samurai path!" | "Welcome. Choose your program." |
| "You lifted 27,500 lbs today!" | "Volume: 12 450 kg." |
| "New PR: 225!" | "Nouveau PR : 102,5 kg." |

---

## Product scope (three pillars)

Tanren exists around three pillars. Any feature proposal must map to one of these:

1. **EAT** — nutrition tracking tuned to strength goals: protein, calories, basic macros. No recipe library, no barcode-scanning grocery workflow.
2. **TRAIN** — workout planning, logging, progression. The core. Custom workouts, exercise library, set/rep/rest timer, guided beginner programs, session history, long-term progression.
3. **REST** — sleep duration, deload weeks, session spacing. Minimal. Does not attempt to be Oura or Whoop.

### Explicitly out of scope

- Cardio-specific tracking (GPS runs, cycling routes)
- Meditation, breathwork, mindfulness
- Yoga, pilates, mobility as standalone features
- Social feed, friend leaderboards, public profile sharing beyond PR export
- Wellness score, readiness score, composite "health" metrics
- Gamification: points, badges, medals, levels

---

## UI/UX principles

- **Numbers carry meaning** — weights, reps, volume are always the most prominent typographic element on any screen
- **Red is signal, not decoration** — red is reserved for PRs, active states, destructive actions, and the logo. A red element must mean something
- **Black/white contrast is absolute** — no gradients on primary backgrounds, no off-whites, no softening
- **Reward consistency visually** — heatmap, streaks, long-term graphs are the core reward mechanism, never badges or points
- **Respect the user's competence** — do not explain what a deadlift is unless they ask. Do not gate features behind "experience level" questionnaires
- **Industrial, not friendly** — sharp dividers, Barlow Condensed caps. Visual language is Rogue Fitness / Eleiko, not Calm / Headspace
- **The forge metaphor lives in micro-interactions** — e.g. a subtle red flash when logging a PR (the moment of impact). Don't spell it out.

---

## Naming conventions in code

- App name: `Tanren`
- Bundle ID: `app.tanren` (suggested, to verify availability)
- Package name: `@tanren/app`, `@tanren/api`, `@tanren/db`
- Database name: `tanren_dev`, `tanren_prod`
- Env var prefix: `TANREN_*` (e.g. `TANREN_API_URL`, `TANREN_CLERK_KEY`)
- Deep link scheme: `tanren://`
- Splash asset names: `splash-dark.png`, `splash-light.png`
- Brand asset folder: `/assets/brand/` with subfolders `logo/`, `splash/`, `icons/`, `kanji/`

---

## Checklist for any new screen or feature

Before merging a PR that adds or modifies UI:

- [ ] Uses only colors from the palette table above
- [ ] Uses only Barlow Condensed (and Noto Serif JP for kanji if applicable)
- [ ] All numbers are bold
- [ ] All weights in **kg**, no `lbs` anywhere in the UI
- [ ] Numbers use French formatting: comma decimal in copy (`82,5 kg`), space thousands separator (`12 450 kg`)
- [ ] Dates use French format `DD/MM/YYYY` and start week on Monday
- [ ] Locale is `fr-FR` for any `Intl.NumberFormat` or date formatting call
- [ ] No emojis in UI strings
- [ ] Copy passes the "performative motivation" sniff test (see examples)
- [ ] Forge-themed copy ≤ 1 instance per screen
- [ ] Feature maps to one of the three pillars (EAT / TRAIN / REST)
- [ ] Red is used only for signal, not decoration
- [ ] No badges, points, or gamification hooks introduced
- [ ] Dark mode parity: every color has a dark-mode equivalent from the palette

---

*Tanren · 鍛錬 · Built rep by rep.*
