# TANREN — Master Build Prompt

> **For Claude Code**. This is the single source of truth for building the Tanren mobile app.
> Place this file as `CLAUDE.md` at the monorepo root. Read top-to-bottom before every session.
>
> **Update policy** : this file is authoritative over any older prompt, older mockup, or older decision. If you find a conflict between this file and another doc in the repo, this file wins.

---

## 0 · How to use this file

**You are Claude Code.** You will scaffold a production React Native + Node.js/Fastify monorepo for Tanren. Rules :

1. Read sections 1–4 once to understand the product. Then follow section 10 (Build Sequence) step by step.
2. The mockups in `/design/` are the visual source of truth. When in doubt about pixel-level styling, open the HTML mockup for that screen and match it.
3. Never introduce technology not listed in section 3. If you think you need Redux, Styled Components, Clerk, or anything else — stop and ask the user.
4. All user-facing text is French (`fr-FR`). All internal code (variables, functions, comments, commits) is English.
5. Tutoiement everywhere ("tu", never "vous"). Metric only. Monday = first day of week.
6. No emojis in UI. No wellness vocabulary. Max 1 "forge" metaphor per screen.

---

## 1 · Product Overview

**Tanren** (鍛錬 · *tan-ren*, Japanese for "forging through repeated training") is a mobile strength training app for the French market. Three pillars : **EAT · TRAIN · REST**. Tagline : *Une rep après l'autre*.

### 1.1 · In scope for V1

- Workout tracking (sessions, sets, reps, weight, rest timer)
- Custom workout templates + weekly plans
- AI-generated workout plans (via Claude API)
- AI-generated 7-day diet plans (via Claude API)
- Exercise library (685+ exercises)
- Session history + per-exercise progression charts
- Apple HealthKit / Android Health Connect : **workout write + bodyweight read only**
- Shareable session cards (9:16 image export)
- Local reminders (workouts / meals / hydration)

### 1.2 · Explicitly out of V1 scope

GPS cardio, running, walking, meditation, yoga, mobility. Social feed, friends, leaderboards. Wellness/readiness scores. Gamification (badges/points/levels). Sleep tracking. Apple Watch companion. All of these are V2+.

### 1.3 · Locale rules (non-negotiable)

| Aspect | Value |
|---|---|
| Language | French only (`fr-FR`) |
| Weight | kg, 1 decimal max (`82,4 kg`) |
| Volume/tonnage | kg, no decimal (`12 450 kg`) |
| Distance | km |
| Height | cm, no decimal (`178 cm`) |
| Decimal separator | virgule `,` |
| Thousands separator | espace `12 450` |
| Date format | `DD/MM/YYYY` |
| First day of week | Monday |
| Tone | tutoiement |

---

## 2 · Brand System (locked)

### 2.1 · Colors

**Only 3 brand colors + 3 semantic accents. Do not introduce new colors.**

```ts
// packages/theme/src/colors.ts
export const brand = {
  iron:       '#000000',  // pure black
  anvil:      '#FFFFFF',  // pure white
  forgeLight: '#E8192C',  // red on light backgrounds
  forgeDark:  '#FF2D3F',  // red on dark backgrounds (brighter for contrast)
} as const;

export const semantic = {
  // Volume/trend indicators
  greenLight: '#1A7F2C',  // up / done / protein (light mode)
  greenDark:  '#2BAE43',
  amberLight: '#D98E00',  // flat / warning / carbs (light mode)
  amberDark:  '#E8A900',
  // red reuses forge
} as const;

// Macro color coding (used in Diet, Home Nutrition, Recipe Modal)
export const macroColor = {
  protein: 'forge',   // red
  carbs:   'amber',
  fat:     'green',
} as const;
```

### 2.2 · Theme tokens

```ts
// packages/theme/src/tokens.ts
export const darkTheme = {
  bg:            '#000000',
  text:          '#FFFFFF',
  textDim:       '#AAAAAA',
  textMute:      '#888888',
  textGhost:     '#555555',
  accent:        '#FF2D3F',
  border:        '#222222',
  borderStrong:  '#333333',
  surface1:      '#0A0A0A',
  surface2:      '#141414',
  ghostBg:       'rgba(255,255,255,0.03)',
  green:         '#2BAE43',
  amber:         '#E8A900',
  overlay:       'rgba(0,0,0,0.72)',
  kanjiOpacity:  0.04,
} as const;

export const lightTheme = {
  bg:            '#FFFFFF',
  text:          '#000000',
  textDim:       '#555555',
  textMute:      '#888888',
  textGhost:     '#BBBBBB',
  accent:        '#E8192C',
  border:        '#E5E5E5',
  borderStrong:  '#CCCCCC',
  surface1:      '#FAFAFA',
  surface2:      '#F3F3F3',
  ghostBg:       'rgba(0,0,0,0.025)',
  green:         '#1A7F2C',
  amber:         '#D98E00',
  overlay:       'rgba(255,255,255,0.85)',
  kanjiOpacity:  0.05,
} as const;
```

### 2.3 · Typography

```ts
export const fonts = {
  sans:  'BarlowCondensed-Regular',   // 400
  sansM: 'BarlowCondensed-Medium',    // 500
  sansB: 'BarlowCondensed-Bold',      // 700
  sansX: 'BarlowCondensed-Black',     // 900
  jp:    'NotoSerifJP-Bold',          // kanji only (watermarks, logo)
  jpX:   'NotoSerifJP-Black',         // kanji only (large displays)
  mono:  'JetBrainsMono-Regular',     // timers, stepper values
  monoB: 'JetBrainsMono-Bold',
} as const;
```

**Typography rules :**
- All numeric values in UI are always `900` (Black) weight
- Headers and CTAs are UPPERCASE with letter-spacing `0.04em` min
- Labels and captions are UPPERCASE with letter-spacing `0.16em–0.3em`
- Body text is `14px` regular weight
- Rest timer uses JetBrains Mono for the `MM:SS` display
- Kanji (`鍛` / `錬` / `鍛錬`) uses Noto Serif JP ONLY. Never in body text.

### 2.4 · Spacing, radius, shadows

```ts
export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 24, xxxl: 32 };

export const radius = {
  none: 0,    // default everywhere (brutalist)
  sm: 2,
  md: 4,      // ONLY for buttons
  lg: 12,     // ONLY for bottom-sheet modals
};
```

**Cards, chips, inputs, hero blocks = `radius: 0`.** Only buttons and modals have radius. This is non-negotiable — it's the brutalist signature.

No shadows on cards. Only the phone frame in mockups has shadows.

### 2.5 · Forge signature system

These are the brand markers. Use them consistently, not decoratively.

| Element | Where | Rule |
|---|---|---|
| **Corner kanji** (top-right, 48px, 4–5% opacity) | Main screens | Alternate `鍛` (train) and `錬` (refine) per screen |
| **Red corner accent** (12×12 square top-left of card) | Hero cards, Today card, Diet hero, Delete warning | Signals "main card of this screen" |
| **Kanji stamp** (`鍛 錬`, 0.4em letter-spacing, red) | Recap, Privacy intro, Guest upgrade, Share card | 1 per screen max |
| **Vignette radial red** (top, 3–4% opacity) | Every full screen | Replaces grid pattern — subtle atmosphere |

**Do NOT use Japanese kanji numbers (一 二 三) as list markers.** Use arabic numerals (`01 02 03` for lists, `1 2 3` for exercise ordering). Japanese kanji is reserved for 鍛, 錬, 鍛錬 as brand ideograms — not as numbers.

### 2.6 · Forge vocabulary (copy)

Max 1 forge metaphor per screen. Use sparingly for impact.

| French | Context | Bad substitute |
|---|---|---|
| "Forgeage en cours" | AI loading state | "Génération en cours" |
| "Forge +2,5 kg" | Coaching tip when progressing | "Ajoute +2,5 kg" |
| "Trempe ton volume" | Coaching tip when flat | "Essaie un deload" |
| "Retour à l'enclume" | Coaching tip when regressing | "Récupération" |
| "Une rep après l'autre" | Tagline | "Rep après rep" |

**Never** : journey, parcours, wellness, mindful, holistic, badge, score, points, streak rewards. *"Streak"* is kept because it's technical and universal in fitness.

---

## 3 · Tech Stack

### 3.1 · Frontend

```
React Native       0.76+
Expo SDK           52+ (Dev Client, NOT Expo Go)
Expo Router        file-based routing
TypeScript         strict mode
Zustand            global state (no Redux, no Context for global)
WatermelonDB       offline-first local DB with sync
React Hook Form    forms (v7)
Zod                validation schemas (shared with backend)
Reanimated 3       animations
React Native SVG   charts, logo, custom icons
expo-apple-authentication + @react-native-google-signin/google-signin
  → provider-agnostic auth (NO Clerk, NO Supabase Auth, NO Firebase)
expo-notifications       local reminders
react-native-health      iOS HealthKit
react-native-health-connect  Android Health Connect
expo-image               optimized image rendering
expo-font                custom fonts
```

### 3.2 · Backend

```
Node.js            20+ LTS
Fastify            4+ (NOT Express)
PostgreSQL         16
Prisma ORM         5+
Redis              7 (caching + rate limiting)
JWT                self-hosted sessions (jsonwebtoken)
@anthropic-ai/sdk  Claude API for plan + diet generation
bcrypt             (only for guest→email migration passwords, if added V2)
argon2id           password hashing (if ever added)
zod                validation
pino               structured logging
```

### 3.3 · Infra

```
Hosting (API)   : Fly.io or Railway (start simple, scale later)
PostgreSQL      : Neon or Supabase (just the DB, not their auth)
Redis           : Upstash
CDN for assets  : Cloudflare R2 or Bunny CDN
Monitoring      : Sentry (already free tier on Expo)
```

---

## 4 · Monorepo Structure

Use **Turborepo**. Layout :

```
tanren/
├── CLAUDE.md                         # this file
├── README.md                         # human-facing
├── turbo.json
├── package.json                      # workspaces
├── pnpm-workspace.yaml               # use pnpm
│
├── apps/
│   ├── mobile/                       # Expo app
│   │   ├── app/                      # Expo Router (file-based routes)
│   │   │   ├── _layout.tsx           # root : fonts, providers, theme
│   │   │   ├── (auth)/               # sign-in flow
│   │   │   │   ├── _layout.tsx
│   │   │   │   ├── index.tsx         # sign-in screen
│   │   │   │   └── email-otp.tsx     # OTP code entry
│   │   │   ├── (onboarding)/         # 4-step onboarding
│   │   │   │   ├── _layout.tsx
│   │   │   │   ├── consent.tsx       # step 0
│   │   │   │   ├── profile.tsx       # step 1
│   │   │   │   ├── training.tsx      # step 2
│   │   │   │   └── measurements.tsx  # step 3
│   │   │   ├── (tabs)/               # main tab navigator
│   │   │   │   ├── _layout.tsx       # 5 tabs : Home, Training, History, Diet, Profile
│   │   │   │   ├── index.tsx         # Home
│   │   │   │   ├── training.tsx      # Workouts tab
│   │   │   │   ├── history.tsx
│   │   │   │   ├── diet.tsx
│   │   │   │   └── profile.tsx
│   │   │   ├── session/
│   │   │   │   ├── preview/[id].tsx  # before-start preview
│   │   │   │   ├── active/[id].tsx   # active workout
│   │   │   │   ├── recap/[id].tsx
│   │   │   │   └── share/[id].tsx
│   │   │   ├── workout/
│   │   │   │   ├── new.tsx
│   │   │   │   └── [id].tsx
│   │   │   ├── plan/
│   │   │   │   ├── new.tsx
│   │   │   │   ├── ai.tsx            # AI generator
│   │   │   │   └── [id].tsx
│   │   │   ├── exercise/
│   │   │   │   ├── library.tsx
│   │   │   │   ├── [id].tsx          # detail
│   │   │   │   └── quick.tsx         # quick start
│   │   │   ├── diet/
│   │   │   │   ├── intake.tsx        # 4-step form
│   │   │   │   └── meal/[id].tsx     # recipe modal
│   │   │   └── settings/
│   │   │       ├── reminders.tsx
│   │   │       ├── privacy.tsx
│   │   │       ├── explore.tsx
│   │   │       └── delete-account.tsx
│   │   ├── components/
│   │   │   ├── atoms/                # Button, Input, Chip, Toggle, Stepper, Slider
│   │   │   ├── molecules/            # StatsStrip, MacroRow, DayPill, DayCell
│   │   │   ├── organisms/            # TodayCard, WorkoutCard, SessionCard, RestTimer
│   │   │   ├── forge/                # CornerKanji, CornerAccent, VolumeFeedback, CoachingTip
│   │   │   └── layout/               # Screen, TabBar, ScreenHeader
│   │   ├── hooks/                    # useHealth, useSession, useSync, useTheme
│   │   ├── stores/                   # Zustand : sessionStore, planStore, profileStore
│   │   ├── db/                       # WatermelonDB schema + models + adapters
│   │   ├── api/                      # Fetch wrappers to backend
│   │   ├── locales/                  # fr.ts
│   │   ├── theme/                    # tokens, dark, light
│   │   ├── utils/                    # format, date, math
│   │   └── assets/                   # fonts, SVG logos
│   │
│   └── api/                          # Fastify backend
│       ├── src/
│       │   ├── server.ts
│       │   ├── routes/
│       │   │   ├── auth.ts           # JWT, Apple/Google verify, email OTP, guest
│       │   │   ├── profile.ts
│       │   │   ├── workouts.ts
│       │   │   ├── plans.ts
│       │   │   ├── sessions.ts
│       │   │   ├── diet.ts
│       │   │   ├── exercises.ts
│       │   │   ├── ai.ts             # plan + diet generation via Claude
│       │   │   └── sync.ts           # WatermelonDB pull/push
│       │   ├── services/             # anthropic, auth, encryption
│       │   ├── db/                   # prisma client
│       │   └── types/                # shared zod schemas
│       ├── prisma/
│       │   ├── schema.prisma
│       │   ├── migrations/
│       │   └── seed.ts               # 685 exercises
│       └── package.json
│
├── packages/
│   ├── shared-schemas/               # Zod schemas used both mobile AND api
│   │   └── src/
│   │       ├── session.ts
│   │       ├── plan.ts
│   │       ├── diet.ts
│   │       └── index.ts
│   └── eslint-config/
│
└── design/                           # reference mockups (HTML)
    ├── Tanren_Core_Flow_v2.html
    ├── Tanren_Lot2_Data_Tabs.html
    ├── Tanren_Lot3_Creation_Diet.html
    ├── Tanren_Lot4_Missing_Screens.html
    ├── Tanren_Health_Prompts.html
    └── Tanren_Login.html
```

---

## 5 · Design System — Components

Each component below has : **name · purpose · reference mockup · key props**.

### 5.1 · Atoms

| Name | Props | Notes |
|---|---|---|
| `Button` | `variant: 'primary' \| 'ghost' \| 'outline' \| 'danger'` · `size: 'sm' \| 'md' \| 'lg'` · `loading?` | Primary = red fill, white text. Ghost = transparent, muted text. Outline = border accent, bg transparent. Danger = red fill for destructive. Height 52px default. |
| `Input` | `label?` · `value` · `onChange` · `placeholder?` · `error?` · `unit?` | Underlined only (no border box). Border bottom color changes from borderStrong → text when filled. |
| `Chip` | `selected: boolean` · `onPress` · `children` | Multi-select filter. Bg surface2 default, accent when selected. |
| `FilterChip` | `active: boolean` · `label` | Horizontal-scroll filter rows (History, Library, Plan builder days). |
| `MuscleChip` | `selected: boolean` · `label` | Same pattern as FilterChip, placed in horizontally scrollable row (`ScrollView horizontal`) in Workout Builder. |
| `Toggle` | `value: boolean` · `onChange` | 36×20 rounded pill, white knob. |
| `Stepper` | `value` · `min` · `max` · `step` · `unit?` · `onChange` | Used in Quick Exercise config. `−` button + value + `+` button. |
| `CornerAccent` | `position: 'tl' \| 'tr' \| 'bl' \| 'br'` · `size?: 'sm' \| 'md'` | 10×10 (sm) or 12×12 (md) red square, absolutely positioned. |
| `CornerKanji` | `char: '鍛' \| '錬'` · no other props | Top-right of screen, 48px, theme-aware opacity (4–5%). |

### 5.2 · Molecules

| Name | Props | Notes |
|---|---|---|
| `StatsStrip` | `week: number` · `target: number` · `streak: number` · `prCount: number` | 3 columns separated by 1px borders. Home screen. |
| `MacroRow` | `protein: number` · `carbs: number` · `fat: number` · `unit?: 'g'` | 3 cells with COLOR CODING : protein=red, carbs=amber, fat=green. Both value AND border inherit macro color. |
| `MacrosInline` | Same macros | Horizontal mini-display for meal cards. Format : `P 32g · G 68g · L 14g` with each element colored. |
| `DayPill` | `label` · `active?` · `onPress?` · `sublabel?` | 1 character (L/M/M/J/V/S/D) OR full day name. Used in Reminders, Diet day selector, Plan Builder chips row. |
| `DayCell` | `day: 'Lun'\|...` · `workoutName?: string` · `status: 'done' \| 'today' \| 'upcoming' \| 'rest'` | Square cell in plan 7-day breakdown (Workouts tab > Active plan). |
| `CompareBadge` | `direction: 'up' \| 'flat' \| 'down'` · `value: number` (percent) | Auto-colored : up=green, flat=amber, down=red. |
| `StatusBadge` | `status: 'done' \| 'incomplete'` | History session cards. |
| `DiffBadge` | `level: 'beg' \| 'int' \| 'adv'` | Library exercise cards. beg=green, int=amber, adv=red. |
| `GhostValue` | `label: string` · `value: string \| number` | Small "Dernière · 82,5" under input. textGhost color. |
| `OBDots` | `total: number` · `current: number` (0-indexed) | Progress dots top of onboarding/intake screens. |
| `HomeTab` | `icon` · `label` · `active: boolean` · `onPress` | Tabs Entraînement/Nutrition visible inside Home screen (not the bottom tab bar). |

### 5.3 · Organisms

| Name | Purpose | Reference |
|---|---|---|
| `TodayCard` | Red-bordered hero card with workout name, duration, muscle tags, compact exercise preview, red CTA button | Home (Training tab) |
| `WorkoutCard` | Template card in Workouts list : name, muscle chips, estimated duration | Workouts tab |
| `ActivePlanCard` | Plan with 7-day grid breakdown, Active badge | Workouts tab |
| `SessionCard` | Past session with meta (duration/volume/series), muscle chips, status badge | History tab |
| `ExerciseRow` | Builder row with drag handle, numeric index (arabic), name, inline params, edit chevron | Workout Builder |
| `SetField` | Big 48px value + unit + small ghost value. Used 2× side by side (reps + kg) | Active Workout |
| `SetHistoryRow` | Small cells showing S1/S2/S3/S4 status (done=green, current=red, upcoming=ghost) | Active Workout |
| `RestTimer` | SVG circular progress ring + center MM:SS in JetBrains Mono + controls | Rest Timer screen |
| `RestTimerControls` | Top row : `−15s`, `+15s` (large, 18px, bold), `⏸` (small 48×48 square). Bottom : `Passer` full-width red | Rest Timer |
| `VolumeFeedback` | Dashed border box + 鍛 kanji + "Volume +3,1%" + subtitle | During Active Workout |
| `CoachingTip` | Dashed red border + 鍛 kanji + forge-language tip ("Forge +2,5 kg") | Exercise Detail |
| `ProgressionChart` | SVG line chart with area fill, red line, data points with decreasing opacity | Exercise Detail |
| `PRHighlight` | Banner with "NEW PR" label, exercise, achievement | Session Recap |
| `ShareCard` | 9:16 composition : kanji top-left + workout name large + stats line at bottom | Session Sharing |
| `MealCard` | Red left border (3px), type label, big meal name (17px uppercase), price/cal, colored macros-inline | Home Nutrition, Diet tab |
| `RecipeSheet` | Bottom-sheet modal : title, prep meta, colored macros, YouTube link, ingredients dot-list, numbered steps (arabic) | Meal tap |
| `AILoadingState` | Big pulsing 鍛 kanji (96px) + "Forgeage en cours" + desc + bouncing dots | AI Plan/Diet generation |
| `FeatureCard` | Icon square + title + desc + either green check (tried) or red NEW badge + "Essayer ›" | Explore screen |

### 5.4 · Layout components

| Name | Props | Notes |
|---|---|---|
| `Screen` | `children` · `theme?: 'dark' \| 'light'` · `showKanji?: boolean` · `showVignette?: boolean` | Root wrapper. Applies bg color, vignette overlay, optional corner kanji. |
| `ScreenHeader` | `title?` · `onBack?` · `rightAction?` | Top bar with back link, centered title, right action slot. |
| `TabBar` | — (auto from Expo Router) | **5 tabs** : Home · Training · Historique · Diet · Profil. Visible on main navigation screens only — hidden on modals, builders, intake, active session, rest timer, recap. |

---

## 6 · Key design decisions (from mockup iterations)

These are decisions taken during design iteration. They override any earlier prompt or doc.

### 6.1 · Home screen has inner tabs

The Home tab shows **Entraînement** (default) and **Nutrition** as two internal tabs below the greeting + stats strip. Auto-switches to Nutrition once today's workout is marked `done`. Nutrition tab hidden entirely if no active diet plan exists.

### 6.2 · Bottom tab bar = 5 tabs

`Home · Training · Historique · Diet · Profil` — not 4. Icons :
- Home : house outline
- Training : two dumbbells
- Historique : clock outline
- Diet : shield-heart outline (same silhouette as Apple Health)
- Profil : person bust

### 6.3 · No Japanese numbers as list markers

List numbering uses **arabic numerals** (`01, 02, 03` for benefit lists, `1, 2, 3` for exercise ordering). Japanese kanji `鍛 錬` is reserved for the brand ideogram in 3 specific contexts : corner watermark, stamp headers, accent in VolumeFeedback/CoachingTip.

### 6.4 · Muscle groups = horizontal scroll row

In Workout Builder, muscle group chips are in a `ScrollView horizontal` (not a flex-wrap grid). Same pattern used for Filter chips in History, Library, and Plan Builder day chips. Only the intake-form preferences keep flex-wrap grids (because items are user-generated, not a fixed set).

### 6.5 · Plan Builder structure

Two blocks, in this order :
1. **"Jours d'entraînement"** : horizontal scrollable chips (Lun/Mar/Mer/Jeu/Ven/Sam/Dim). Tap to toggle selected.
2. **"Séance par jour"** : list of rows, one per selected day. Each row : day tag (left, red uppercase) + workout name (or "Choisir une séance" if empty) + chevron. Tap → opens workout picker modal.

Unselected days simply don't appear in the second block. No toggle widget. No "rest" placeholder — absence of day = rest.

### 6.6 · Macro color coding

Everywhere macros appear (Home Nutrition, Diet tab, Meal cards, Recipe modal) :
- **Protein = red (accent)** — it's the macro users track most in strength training
- **Carbs = amber**
- **Fat = green**

Both the macro value AND the container border take the color. Consistency critical.

### 6.7 · Meal cards have red left border

3px red left border (same pattern as `day-theme` block). Title is 17px Black weight UPPERCASE. This is the big visibility upgrade vs the earlier design that was too flat.

### 6.8 · Rest Timer controls

Layout :
```
┌──────────┬──────────┬─────┐
│  −15s    │  +15s    │  ⏸  │    ← top row (big -15s/+15s, small pause 48×48)
└──────────┴──────────┴─────┘
┌────────────────────────────┐
│        PASSER              │    ← skip button, full width, red fill
└────────────────────────────┘
```

No "quit app" notification hint. No pause-as-main-action. The timer running in background IS the default behavior — no instruction needed.

### 6.9 · Active Workout button placement

"Valider la série" button is at `margin-top: 16px` after the volume feedback, not `margin-top: auto`. It should feel immediate, not pushed to bottom of screen. Screen content still fills naturally via a flex-1 spacer below the button if needed.

### 6.10 · Share Card v2 structure

```
┌─────────────────────────────┐
│ 鍛 錬                       │   ← kanji stamp, top-left, small red
│ PUSH DAY                    │   ← workout NAME as title (not "Séance terminée")
│ Ven 18 avr · 1h12           │   ← date + duration small
│                             │
│    [ photo composition ]    │   ← center freely for photo
│                             │
│ Volume  Séries  Records     │   ← stats in ONE horizontal line
│ 12 450  18      2           │     at bottom, semi-transparent bar
│ ─────────────────────────── │
│ TANREN            tanren.fr│
└─────────────────────────────┘
```

---

## 7 · Data Model (Prisma schema outline)

```prisma
// apps/api/prisma/schema.prisma

model User {
  id              String    @id @default(cuid())
  provider        Provider  // APPLE | GOOGLE | EMAIL | GUEST
  providerUserId  String?   // e.g. Apple sub, Google sub
  email           String?   @unique // encrypted at rest
  name            String?   // encrypted at rest
  createdAt       DateTime  @default(now())
  lastSeenAt      DateTime  @default(now())
  deletedAt       DateTime? // soft delete, hard-wipe after 30 days

  profile         Profile?
  plans           Plan[]
  workouts        Workout[]
  sessions        Session[]
  dietPlan        DietPlan?
  reminders       ReminderSettings?
  healthSync      HealthSyncQueue[]
}

enum Provider { APPLE GOOGLE EMAIL GUEST }

model Profile {
  id          String  @id @default(cuid())
  userId      String  @unique
  user        User    @relation(fields: [userId], references: [id], onDelete: Cascade)
  gender      Gender  // MALE | FEMALE
  level       Level   // BEGINNER | INTERMEDIATE | ADVANCED
  goal        Goal    // WEIGHT_LOSS | MUSCLE_GAIN | MAINTENANCE
  weeklyTarget Int    @default(3)  // 1-7
  heightCm    Int?
  weightKg    Decimal? @db.Decimal(5,1)  // 82.4
  age         Int?
  birthDate   DateTime?
  updatedAt   DateTime @updatedAt
}

model Exercise {
  id          String   @id @default(cuid())
  nameFr      String
  slug        String   @unique
  primaryMuscle   MuscleGroup
  secondaryMuscles MuscleGroup[]
  equipment   Equipment
  difficulty  Level
  descriptionFr String? @db.Text
  formCues    String[] // form points, French
  imagePath   String?
  videoUrl    String?
}

enum MuscleGroup {
  CHEST BACK SHOULDERS BICEPS TRICEPS
  QUADRICEPS HAMSTRINGS GLUTES CALVES CORE
  FULL_BODY
}

enum Equipment {
  BARBELL DUMBBELL CABLE MACHINE
  BODYWEIGHT KETTLEBELL BAND OTHER
}

model Workout {
  id              String   @id @default(cuid())
  userId          String
  user            User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  name            String
  muscleGroups    MuscleGroup[]
  estimatedMinutes Int
  exercises       WorkoutExercise[]
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
}

model WorkoutExercise {
  id          String    @id @default(cuid())
  workoutId   String
  workout     Workout   @relation(fields: [workoutId], references: [id], onDelete: Cascade)
  exerciseId  String
  exercise    Exercise  @relation(fields: [exerciseId], references: [id])
  orderIndex  Int
  defaultSets Int       @default(3)
  defaultReps Int       @default(10)
  defaultWeightKg Decimal @default(0) @db.Decimal(5,1)
  defaultRestSec Int    @default(90)
}

model Plan {
  id            String   @id @default(cuid())
  userId        String
  user          User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  name          String
  isActive      Boolean  @default(false)  // one active plan per user (enforced app-side)
  daysPerWeek   Int
  assignments   PlanDayAssignment[]
  generatedByAI Boolean  @default(false)
  aiPromptText  String?  @db.Text
  createdAt     DateTime @default(now())
}

model PlanDayAssignment {
  id          String   @id @default(cuid())
  planId      String
  plan        Plan     @relation(fields: [planId], references: [id], onDelete: Cascade)
  dayOfWeek   Int      // 1=Monday, 7=Sunday
  workoutId   String
  workout     Workout  @relation(fields: [workoutId], references: [id])

  @@unique([planId, dayOfWeek])
}

model Session {
  id              String    @id @default(cuid())
  userId          String
  user            User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  workoutId       String?   // null if quick exercise (no template)
  workout         Workout?  @relation(fields: [workoutId], references: [id])
  startedAt       DateTime
  endedAt         DateTime?
  durationSec     Int?
  totalVolumeKg   Decimal?  @db.Decimal(10,1)
  status          SessionStatus  // IN_PROGRESS | DONE | ABANDONED
  sets            SessionSet[]
  healthSyncedAt  DateTime? // timestamp when pushed to HealthKit
  createdAt       DateTime  @default(now())
}

enum SessionStatus { IN_PROGRESS DONE ABANDONED }

model SessionSet {
  id          String   @id @default(cuid())
  sessionId   String
  session     Session  @relation(fields: [sessionId], references: [id], onDelete: Cascade)
  exerciseId  String
  exercise    Exercise @relation(fields: [exerciseId], references: [id])
  setIndex    Int
  reps        Int
  weightKg    Decimal  @db.Decimal(5,1)
  restSec     Int?
  isPR        Boolean  @default(false)
  completedAt DateTime
}

model DietPlan {
  id            String   @id @default(cuid())
  userId        String   @unique
  user          User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  dailyCalories Int
  proteinG      Int
  carbsG        Int
  fatG          Int
  hydrationL    Decimal  @db.Decimal(3,1)
  intakeDataJson Json    // full intake form answers
  daysJson      Json     // 7-day meal structure
  generatedAt   DateTime @default(now())
  regenerationsThisWeek Int @default(0)
}

model ReminderSettings {
  id                  String   @id @default(cuid())
  userId              String   @unique
  user                User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  workoutEnabled      Boolean  @default(false)
  workoutTime         String?  // "18:00"
  workoutBeforeMin    Int      @default(15)  // 0, 15, or 30
  workoutDays         Int[]    // [1,2,4,5]
  mealEnabled         Boolean  @default(false)
  mealBreakfastTime   String?  @default("08:00")
  mealLunchTime       String?  @default("12:30")
  mealSnackTime       String?  @default("16:00")
  mealDinnerTime      String?  @default("20:00")
  hydrationEnabled    Boolean  @default(false)
  hydrationIntervalMin Int     @default(90)  // 60, 90, or 120
  hydrationActiveFrom String   @default("07:00")
  hydrationActiveTo   String   @default("22:00")
}

model HealthSyncQueue {
  id          String    @id @default(cuid())
  userId      String
  user        User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  sessionId   String?
  operation   HealthOp  // PUBLISH_WORKOUT | READ_BODYWEIGHT
  payload     Json
  attempts    Int       @default(0)
  status      QueueStatus // PENDING | DONE | FAILED
  lastError   String?
  createdAt   DateTime  @default(now())
  completedAt DateTime?
}

enum HealthOp { PUBLISH_WORKOUT READ_BODYWEIGHT }
enum QueueStatus { PENDING DONE FAILED }
```

---

## 8 · i18n (French strings)

All user-facing strings live in `apps/mobile/locales/fr.ts`. Examples :

```ts
export const fr = {
  common: {
    back:     '‹ Retour',
    cancel:   'Annuler',
    save:     'Enregistrer',
    delete:   'Supprimer',
    continue: 'Continuer',
    skip:     'Passer',
    close:    'Fermer',
    edit:     'Éditer',
    activate: 'Activer',
    actif:    'Actif',
  },
  home: {
    greetingMorning: (name: string) => `Salut ${name}.`,
    greetingAfternoon: (name: string) => `Salut ${name}.`,
    greetingEvening:   (name: string) => `Salut ${name}.`,
    timeMorning:   'Matin',
    timeAfternoon: 'Après-midi',
    timeEvening:   'Soir',
    statsWeek:   'Semaine',
    statsStreak: 'Streak',
    statsPR:     'PR récents',
    tabTraining:  'Entraînement',
    tabNutrition: 'Nutrition',
    todayLabel: (time: string) => `Aujourd'hui · ${time}`,
    durationEst: (min: number) => `Durée estimée · ${min} min`,
    startSession: 'Commencer la séance',
    noPlanTitle: "Crée ton plan\nd'entraînement",
    noPlanDesc:  'Manuellement ou avec l\'IA, en fonction de ton niveau et tes objectifs.',
    createPlan:  'Créer un plan',
    generateAI:  "Générer avec l'IA",
    quickStart:  'Commence juste un exercice →',
    weeklyMore:  'Cette semaine',
  },
  session: {
    seriesInProgress: (n: number, total: number) => `Série ${n} / ${total}`,
    validateSet:      'Valider la série',
    reps:             'Reps',
    load:             'Charge',
    lastSet:          (v: string) => `Dernière · ${v}`,
    volumeDelta:      (p: string) => `Volume ${p}`,
    volumeCompare:    'vs ta dernière séance sur cet exo',
    completeWorkout:  'Terminer la séance',
  },
  rest: {
    label:        'Repos',
    addTime:      '+15s',
    subTime:      '−15s',
    pause:        'Pause',
    skip:         'Passer',
    nextSet:      'Prochaine série',
    targetSet:    (reps: number, kg: string) => `${kg} kg × ${reps}`,
  },
  recap: {
    title:    'Séance\nterminée',
    volume:   'Volume',
    duration: 'Durée',
    series:   'Séries',
    records:  'Records',
    newPR:    'NEW PR',
    compareTitle: 'Comparaison par exercice',
    saveShare:   'Sauvegarder & partager',
    addMore:     'Ajouter des exercices',
  },
  diet: {
    tab:         'Nutrition',
    dailyTarget: 'Objectif quotidien',
    hydration:   'Hydratation',
    protein:     'Protéines',
    carbs:       'Glucides',
    fat:         'Lipides',
    mealBreakfast: 'Petit-déj',
    mealLunch:     'Déjeuner',
    mealSnack:     'Collation',
    mealDinner:    'Dîner',
    mealDessert:   'Dessert',
    noPlanTitle: 'Ton plan\nnutrition',
    noPlanDesc:  'Un plan de 7 jours, personnalisé selon tes objectifs et tes préférences alimentaires.',
    buildPlan:   'Construire mon plan',
    restorePlan: 'Restaurer un plan précédent',
    featureCalories: {
      title: 'Calories & macros calculés',
      desc:  'Formule Mifflin-St Jeor adaptée à ton profil',
    },
    featurePlan: {
      title: 'Plan 7 jours construit autour de tes goûts',
      desc:  'Tu choisis jusqu\'à 5 plats préférés',
    },
    featureSnacks: {
      title: 'Alternatives snacks équivalentes',
      desc:  'Macros similaires, variations en saveur',
    },
    featureSupplements: {
      title: 'Suppléments evidence-based',
      desc:  'Dose, timing et raison scientifique',
    },
  },
  ai: {
    title:       'Forge ton plan',
    subtitle:    'Basé sur ton profil et tes préférences',
    yourProfile: 'Ton profil',
    describe:    'Décris ce que tu veux',
    pickSuggestion: 'Ou pioche une suggestion',
    generate:    'Générer le plan',
    loadingLabel: 'Forgeage en cours',
    loadingTitle: "L'IA construit\nton plan",
    loadingDesc:  "On analyse ton profil, on choisit les exercices, on équilibre les volumes. Patience, on forge du solide.",
  },
  coaching: {
    forgeUp:   (kg: string) => `Forge +${kg} kg`,
    forgeUpDesc: (kg: string, reps: number) =>
      `Tu as progressé sur les 3 dernières séances. Tente ${kg} kg × ${reps} à la prochaine.`,
    temperFlat: 'Trempe ton volume',
    temperFlatDesc: 'Tu stagnes depuis 3 séances. Un deload d\'une semaine pourrait relancer la machine.',
    returnToAnvil: "Retour à l'enclume",
    returnToAnvilDesc: 'Deux séances en baisse. Récupération insuffisante ? Regarde ton sommeil et ton intensité.',
  },
  share: {
    title:        'Partager ta séance',
    preview:      'Aperçu 9:16',
    toolPhoto:    'Photo',
    toolCamera:   'Caméra',
    toolRemove:   'Retirer',
    share:        'Partager',
    finish:       'Terminer sans partager',
    brand:        'TANREN',
    url:          'tanren.fr',
  },
  deleteAccount: {
    step:           'Étape 2 / 2',
    title:          'Suppression\ndéfinitive',
    description:    'Cette action est irréversible. Ton compte et toutes tes données seront supprimés dans les 30 jours.',
    impactTitle:    'Ce qui sera supprimé',
    confirmHint:    'Saisis le mot SUPPRIMER en majuscules pour confirmer.',
    confirmWord:    'SUPPRIMER',
    ctaDelete:      'Supprimer mon compte',
    ctaCancel:      'Annuler',
  },
} as const;
```

---

## 9 · Formatting utilities (centralize these)

```ts
// apps/mobile/utils/format.ts

/** 82.4 → "82,4" · 12450 → "12 450" · 1200000 → "1,2M" */
export function formatKg(n: number | null | undefined): string {
  if (n == null) return '—';
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace('.', ',') + 'M';
  if (n >= 1000) {
    return new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 })
      .format(n)
      .replace(/\u202F|\u00A0/g, ' ');
  }
  return n.toFixed(n % 1 === 0 ? 0 : 1).replace('.', ',');
}

/** 45 → "45 min" · 72 → "1h12" · 60 → "1h" */
export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h${String(m).padStart(2, '0')}` : `${h}h`;
}

/** 90 → "01:30" · 65 → "01:05" */
export function formatTimer(totalSec: number): string {
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

/** new Date(2026,3,18) → "18/04/2026" */
export function formatDate(d: Date): string {
  return d.toLocaleDateString('fr-FR');
}

/** new Date(2026,3,18) → "Ven 18 avr" */
export function formatDateShort(d: Date): string {
  const day = new Intl.DateTimeFormat('fr-FR', { weekday: 'short' }).format(d);
  const month = new Intl.DateTimeFormat('fr-FR', { month: 'short' }).format(d);
  return `${capitalize(day.replace('.', ''))} ${d.getDate()} ${month.replace('.', '')}`;
}

export function formatCm(n: number): string { return `${n} cm`; }
export function formatKcal(n: number): string { return `${formatKg(n)} kcal`; }
export function formatGrams(n: number): string { return `${n}g`; }
export function formatPct(n: number, withSign = true): string {
  const abs = Math.abs(n).toFixed(1).replace('.', ',');
  if (!withSign) return `${abs}%`;
  if (n > 0.1) return `+${abs}%`;
  if (n < -0.1) return `−${abs}%`;
  return `= ${abs}%`;
}

function capitalize(s: string) { return s.charAt(0).toUpperCase() + s.slice(1); }
```

---

## 10 · Build Sequence (follow in order)

Execute each step in sequence. Don't skip. Commit after each step with a message like `step X: <short summary>`.

### Step 1 · Monorepo setup
- Init pnpm workspace with Turborepo
- Create `apps/mobile`, `apps/api`, `packages/shared-schemas`, `packages/eslint-config`
- TypeScript strict everywhere
- Shared ESLint config + Prettier
- Commit

### Step 2 · Mobile app skeleton
- `pnpm create expo-app apps/mobile --template blank-typescript`
- Install : expo-router, zustand, react-hook-form, zod, reanimated, react-native-svg, expo-font, expo-notifications, @react-native-async-storage/async-storage
- Configure Dev Client (not Expo Go)
- Create folder structure per section 4
- Install 3 fonts (Barlow Condensed, Noto Serif JP, JetBrains Mono)
- Commit

### Step 3 · Design system
- Create `theme/tokens.ts` with darkTheme + lightTheme from section 2.2
- Create `hooks/useTheme.ts` that auto-detects system color scheme
- Build atoms : Button, Input, Chip, FilterChip, MuscleChip, Toggle, Stepper, CornerAccent, CornerKanji
- Build molecules : StatsStrip, MacroRow, MacrosInline, DayPill, DayCell, CompareBadge, StatusBadge, DiffBadge, GhostValue, OBDots, HomeTab
- Build layout : Screen, ScreenHeader, TabBar (5 tabs)
- Create `utils/format.ts` per section 9
- Create `locales/fr.ts` per section 8
- Storybook-like visual test screen in `app/dev/components.tsx` that renders every component
- Commit

### Step 4 · Backend skeleton
- `cd apps/api && pnpm init`
- Install : fastify, @fastify/cors, @fastify/jwt, @fastify/rate-limit, prisma, @prisma/client, redis, zod, @anthropic-ai/sdk, pino
- Create `src/server.ts` with health check route
- Prisma init with `DATABASE_URL` env var
- Copy schema from section 7 to `prisma/schema.prisma`
- Run `prisma migrate dev --name init`
- Seed script : 685 exercises (use curated list OR import from public dataset)
- Commit

### Step 5 · Auth flow (mobile + api)
- Backend : `POST /auth/apple/verify`, `POST /auth/google/verify`, `POST /auth/email/send-otp`, `POST /auth/email/verify-otp`, `POST /auth/guest`, `POST /auth/refresh`, `POST /auth/logout`
- JWT with 15min access token + 30day refresh token. Store refresh in Redis with userId key.
- Mobile : `(auth)/index.tsx` + `(auth)/email-otp.tsx` screens — mockup reference `design/Tanren_Login.html`
- Encryption service : AES-256-GCM for email + name at rest in DB
- Commit

### Step 6 · Onboarding (4 steps)
- Mobile : `(onboarding)/consent.tsx` + `profile.tsx` + `training.tsx` + `measurements.tsx`
- Mockup ref : `design/Tanren_Core_Flow_v2.html` section 03
- POST /profile on completion
- Commit

### Step 7 · Home screen
- `(tabs)/index.tsx` with inner tabs Entraînement / Nutrition
- TodayCard organism
- StatsStrip molecule
- Empty state (no plan)
- Pull to refresh
- Mockup ref : section 04 of Core Flow v2
- Commit

### Step 8 · Exercise library + detail
- Mobile : `exercise/library.tsx` with search + FilterChip rows
- Mobile : `exercise/[id].tsx` with tabs chart Max/Volume/Reps + ProgressionChart SVG + CoachingTip
- Backend : `GET /exercises?search=&muscle=` + `GET /exercises/:id`
- Mockup ref : `design/Tanren_Lot2_Data_Tabs.html` section 15
- Commit

### Step 9 · Workout builder
- Mobile : `workout/new.tsx` + `workout/[id].tsx`
- Inputs : name (text), muscle groups (MuscleChip row horizontal scroll), duration (5 presets)
- Exercise rows with add/edit/delete/reorder
- Mockup ref : `design/Tanren_Lot3_Creation_Diet.html` section 06
- Backend : `POST /workouts`, `PATCH /workouts/:id`, `DELETE /workouts/:id`
- Commit

### Step 10 · Plan builder
- Mobile : `plan/new.tsx` + `plan/[id].tsx`
- Block 1 : horizontal scrollable day chips (Lun-Dim)
- Block 2 : list of rows per selected day, each with day-tag + workout picker chevron
- Mockup ref : section 07 of Lot 3
- Backend : `POST /plans`, `POST /plans/:id/activate`
- Commit

### Step 11 · AI plan generator
- Mobile : `plan/ai.tsx` with profile chips + textarea + suggestion list
- AILoadingState organism with pulsing 鍛 kanji (Reanimated)
- Backend : `POST /ai/generate-plan` calling Claude API with structured output (Zod schema)
- Rate limit : max 3 generations/day for registered users, 0 for guests
- Mockup ref : section 08 of Lot 3
- Commit

### Step 12 · Session flow
- Preview : `session/preview/[id].tsx` — read workout template, show exercise list, allow edit before start (mockup section 09 Lot 4)
- Active : `session/active/[id].tsx` — SetField × 2, SetHistoryRow, VolumeFeedback, "Valider la série" at `margin-top: 16px` (mockup section 10 Core Flow)
- Rest : overlay or modal on top of active screen — RestTimer with controls per section 6.8
- Recap : `session/recap/[id].tsx` — stats grid, PRHighlight, CompareBadge list
- Share : `session/share/[id].tsx` — ShareCard with kanji top-left + workout name + stats line bottom
- Session heartbeat : auto-save every 30s to local DB (WatermelonDB)
- Commit

### Step 13 · History tab
- Mobile : `(tabs)/history.tsx` with dual filter rows + SessionCard list
- Backend : `GET /sessions?period=&muscle=`
- Mockup ref : section 14 of Lot 2
- Commit

### Step 14 · Diet tab + intake + plan
- Mobile : `(tabs)/diet.tsx` — 2 states (no plan + active plan)
- Intake : `diet/intake.tsx` — 4-step form
- Recipe modal : `diet/meal/[id].tsx` — bottom sheet
- Backend : `POST /ai/generate-diet` calling Claude API
- Day selector, macros with COLOR CODING (P=red, C=amber, F=green), MealCard with red left border
- Mockup ref : sections 17, 18 of Lot 3 + section 17b of Lot 4
- Commit

### Step 15 · Profile + settings
- Mobile : `(tabs)/profile.tsx` — avatar, stats, sections (personal, training, settings, privacy)
- Settings screens : `settings/explore.tsx`, `settings/privacy.tsx`, `settings/reminders.tsx`, `settings/delete-account.tsx`
- Reminders : local notifications via expo-notifications
- Delete account : 2-step confirmation with `SUPPRIMER` text input
- Mockup refs : section 19 of Lot 2, sections 20/21/22/23 of Lot 3 and Lot 4
- Commit

### Step 16 · HealthKit / Health Connect
- Install react-native-health (iOS) + react-native-health-connect (Android)
- Facade pattern : `services/health.ts` with `.ios.ts` + `.android.ts` adapters
- 2 prompts only : Publish Sessions (after first session save) + Read Bodyweight (profile creation)
- Pre-prompt component with benefit list
- Sync queue : HealthSyncQueue table + background retry with exponential backoff
- Reference doc : `design/Tanren_Health_Implementation_Prompt.md`
- Commit

### Step 17 · Offline sync (WatermelonDB)
- Create WatermelonDB models matching Prisma schema
- Sync adapter : `POST /sync/pull` + `POST /sync/push` to backend
- Last-write-wins conflict resolution (timestamp-based)
- Pull on app foreground, push after any local mutation
- Commit

### Step 18 · Session sharing (image export)
- Use `react-native-view-shot` to capture ShareCard as PNG
- Share via native share sheet (expo-sharing)
- 9:16 aspect ratio, resolution 1080×1920
- Commit

### Step 19 · Guest mode
- Local-only for guests (no sync, no AI generation)
- Upgrade prompt screen (mockup section 23 Lot 4) triggers on AI feature tap
- Migration : guest data moved to authenticated account on sign-in
- Commit

### Step 20 · Polish + testing
- All screens in dark + light mode verified
- E2E happy-path test : sign in → onboard → create plan → start session → complete → share
- Accessibility : VoiceOver labels on all interactive elements
- Performance : FlatList virtualization for History, Library
- Error boundaries + Sentry integration
- Final commit for V1

---

## 11 · Mockup reference index

| Screen | File | Section |
|---|---|---|
| Splash + Login | `Tanren_Login.html` | — |
| Onboarding (consent → measurements) | `Tanren_Core_Flow_v2.html` | 03 |
| Home (Entraînement tab) | `Tanren_Core_Flow_v2.html` | 04 |
| Home (Nutrition tab) | `Tanren_Core_Flow_v2.html` | 04 |
| Active Workout | `Tanren_Core_Flow_v2.html` | 10 |
| Rest Timer | `Tanren_Core_Flow_v2.html` | 11 |
| Session Recap | `Tanren_Core_Flow_v2.html` | 12 |
| Session Sharing | `Tanren_Core_Flow_v2.html` | 13 |
| Workouts tab (plan + templates) | `Tanren_Lot2_Data_Tabs.html` | 05 |
| History | `Tanren_Lot2_Data_Tabs.html` | 14 |
| Exercise Library (list) | `Tanren_Lot2_Data_Tabs.html` | 15 |
| Exercise Detail (chart + tip) | `Tanren_Lot2_Data_Tabs.html` | 15 |
| Profile | `Tanren_Lot2_Data_Tabs.html` | 19 |
| Workout Builder | `Tanren_Lot3_Creation_Diet.html` | 06 |
| Plan Builder | `Tanren_Lot3_Creation_Diet.html` | 07 |
| AI Plan Generator (prompt + loading) | `Tanren_Lot3_Creation_Diet.html` | 08 |
| Diet tab (no plan + active) | `Tanren_Lot3_Creation_Diet.html` | 17 |
| Diet Intake | `Tanren_Lot3_Creation_Diet.html` | 18 |
| Reminders | `Tanren_Lot3_Creation_Diet.html` | 20 |
| Session Preview | `Tanren_Lot4_Missing_Screens.html` | 09 |
| Recipe Modal | `Tanren_Lot4_Missing_Screens.html` | 17b |
| Quick Exercise | `Tanren_Lot4_Missing_Screens.html` | 16 |
| Explore | `Tanren_Lot4_Missing_Screens.html` | 21 |
| Privacy | `Tanren_Lot4_Missing_Screens.html` | 22 |
| Guest Upgrade | `Tanren_Lot4_Missing_Screens.html` | 23 |
| Delete Account | `Tanren_Lot4_Missing_Screens.html` | 19b |
| Health Prompts | `Tanren_Health_Prompts.html` | — |

---

## 12 · Non-obvious rules (easy to miss)

These catch most first-time mistakes :

1. **No Japanese kanji as numbers.** Numbers are arabic. Kanji `鍛 錬` is ONLY the brand ideogram.
2. **Muscle groups are horizontal-scroll chips**, never a wrap grid (except in intake forms where items are user-generated).
3. **Plan Builder has no toggles.** Day chips (tap to toggle) + list of selected days with workout picker.
4. **Tab bar is 5 tabs**, including Diet. Hidden on modals/builders/active session.
5. **Meal cards have a 3px red left border** and a 17px uppercase title. Not flat.
6. **Macros use 3 colors** : P=red, C=amber, F=green. Both the value AND the container.
7. **Rest timer has no "quit app" hint.** `-15s` and `+15s` are big. `⏸` is small (48×48). `Passer` is full-width red on second row.
8. **Share card title is the workout name**, not "Séance terminée".
9. **"Valider la série" button** sits `margin-top: 16px`, not at screen bottom.
10. **All CSS-equivalent radius is 0** except buttons (4) and modals (12).
11. **Tutoiement** everywhere. Even errors : "Ton mot de passe est trop court" not "Votre mot de passe...".
12. **Metric only** : no lbs, no inches, no feet. No US date format.
13. **One forge metaphor per screen max.** Don't stack.
14. **No emojis in UI.** Ever.
15. **No wellness vocabulary** : no "journey", no "mindful", no "holistic", no "badge", no "score".
16. **Guest mode is local-only.** No sync, no AI, no HealthKit writes. Data migrates on sign-in.
17. **Health integration scope** : workout WRITE + bodyweight READ. That's it. No sleep, no HR (HR opt-in via Settings only).
18. **No new colors.** 3 brand + 3 semantic. End of list.

---

## 13 · Questions to ask before starting

If any of these are not clear, ask the user before writing code :

- Is the Expo Router navigation structure (5 tabs + nested stacks) agreed on ?
- Do we have Apple Developer + Google Play Console accounts ready for auth config ?
- Is the DATABASE_URL / REDIS_URL / ANTHROPIC_API_KEY list complete in `.env.example` ?
- Do we want Sentry from day 1 or later ?
- Is the 685-exercise dataset sourced (or do we need to curate) ?
- Should AI-generated content be cached per user (Redis) to reduce Claude API costs ?

---

## 14 · Data layer

### Current: tRPC + React Query + MMKV persist

All data flows through tRPC procedures. React Query caches responses.
MMKV persister (`apps/mobile/src/lib/queryPersister.ts`) persists the cache
across app kills for instant cold-launch UI.

### Screens consume via `src/data/*` hooks

Screens MUST use the domain hooks (`useProfile`, `useActivePlan`, etc.),
not `trpc.X.useQuery` directly. This is an abstraction barrier that allows
swapping the data layer without touching screens.

See: `apps/mobile/src/data/useProfile.ts` (and siblings)

### Mutations MUST use invalidation helpers

Every mutation's `onSuccess` calls a `useInvalidateX` helper from
`src/lib/invalidation.ts`. Adding a new consumer of a shared query =
update the helper once, all mutations benefit.

### Scale path

Up to ~100k users: current stack works without changes.

Beyond that, or if offline-first becomes critical:
1. Introduce WatermelonDB for local DB
2. Implement a sync engine (bidirectional, last-write-wins)
3. Modify `src/data/*` hooks to observe WatermelonDB collections
4. Screens unchanged

### Branch & deploy policy

- Single branch: `main`. Railway auto-deploys on push.
- No feature branches unless risky migration.
- After every push: `railway logs --tail` for 60s.
- See `DEPLOY.md` for full runbook.

---

*Tanren . Built rep by rep.*
