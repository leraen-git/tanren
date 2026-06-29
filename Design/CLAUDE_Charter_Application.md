# TANREN — Prompt d'application de la charte graphique

> **Pour Claude Code.** Ce fichier est un **prompt chirurgical** focalisé sur l'application de l'identité visuelle Tanren (tokens, composants, patterns) à du code. Il ne touche PAS à la logique métier, à la navigation, aux stores, à la DB, ni à l'API.
>
> **Source de vérité visuelle** : les mockups HTML dans `/design/` décrivent l'état visuel cible au pixel près. Quand ce prompt et les mockups divergent, **les mockups gagnent**.

---

## 📋 Ce document contient

1. **Section 0** : Scope — ce que tu dois faire, ce que tu ne dois PAS toucher
2. **Section 1** : Comment utiliser ce prompt selon ton contexte
3. **Section 2** : Tokens du design system (couleurs, typo, spacing)
4. **Section 3** : Spécifications des composants visuels
5. **Section 4** : Règles visuelles non-négociables (11 patterns critiques)
6. **Section 5** : Parité dark/light mode
7. **Section 6** : Vocabulaire forge (copy)
8. **Section 7** : Ordre de build pour minimiser le churn visuel
9. **Section 8** : Checklist avant commit
10. **Section 9** : Index des mockups de référence
11. **Section 10** : Liste red-flag / green-flag de fichiers
12. **Section 11** : Questions à poser avant de démarrer

---

## 0 · Scope et non-goals

### ✅ Dans le scope

- Appliquer les tokens (couleurs, typo, spacing, radii)
- Construire ou refactoriser les composants visuels pour matcher la section 3
- Appliquer les règles de mise en page et les patterns visuels
- Assurer la parité dark + light sur chaque écran
- Matcher la structure de tab bar (5 onglets) sur les écrans de navigation
- Respecter la signature brutaliste : radius 0 par défaut, pas d'ombres, corner accents rouges, typographie majuscule

### ❌ Hors scope — ne touche PAS

- La logique métier, les stores, les hooks
- Les appels API, fetch, axios
- La structure de navigation (routes, params, Expo Router config)
- Le schéma de DB, les modèles, la persistance
- Le flow d'authentification, la gestion de session
- La validation de formulaires, la gestion d'erreur
- Les types TypeScript existants (sauf si une prop visuelle doit être ajoutée)
- La config du package manager, le build, le déploiement
- Les fichiers i18n existants (sauf si nouveaux strings UI)

**Si tu es incertain qu'un changement soit "visuel" ou "fonctionnel", ARRÊTE et demande à l'utilisateur.**

---

## 1 · Comment utiliser ce prompt

### Scénario A — tu appliques la charte à du code existant

1. Lis ce fichier entièrement une fois
2. Lis les 4 fichiers HTML dans `/design/` pour voir l'état visuel cible
3. Lis `CHARTER_CHANGES.md` pour comprendre ce qui a changé vs les anciennes versions (important si le code actuel reflète une version antérieure de la charte)
4. Pour chaque écran, identifie les composants utilisés et refactore-les un par un
5. Suis l'ordre de build de la section 7 pour minimiser le churn visuel entre commits
6. Ne touche jamais aux fichiers hors de `theme/`, `components/`, `app/**/*.tsx` (JSX uniquement, pas la logique)

### Scénario B — tu crées du nouveau code from scratch

1. Applique la section 2 (tokens) en première étape
2. Construis les atoms de la section 3.1 avant tout
3. Puis les molecules, puis les organisms et layout
4. Chaque écran que tu construis DOIT utiliser les composants existants — ne jamais redéfinir un Chip ou un Button inline ad-hoc

---

## 2 · Design tokens (verrouillés — n'introduis PAS de nouveaux tokens)

### 2.1 · Couleurs

**Seulement 3 couleurs de marque + 3 accents sémantiques.** N'invente jamais de nouvelles couleurs. Si tu penses en avoir besoin, utilise une couleur existante ou convertis en opacité.

```ts
// theme/colors.ts
export const brand = {
  iron:       '#000000',  // noir pur
  anvil:      '#FFFFFF',  // blanc pur
  forgeLight: '#E8192C',  // rouge sur fond clair
  forgeDark:  '#FF2D3F',  // rouge sur fond sombre (plus vif pour contraste)
} as const;

export const semantic = {
  greenLight: '#1A7F2C',  // up / done / lipides (light mode)
  greenDark:  '#2BAE43',  // up / done / lipides (dark mode)
  amberLight: '#D98E00',  // flat / warning / glucides (light mode)
  amberDark:  '#E8A900',  // flat / warning / glucides (dark mode)
  // rouge pour down / alert / protéines réutilise forge
} as const;
```

### 2.2 · Theme tokens (dark + light)

```ts
// theme/darkTheme.ts
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

// theme/lightTheme.ts
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

### 2.3 · Typographie

Charge les 3 familles via `expo-font` :
- **Barlow Condensed** (300, 400, 500, 700, 900) — primaire partout
- **Noto Serif JP** (400, 700, 900) — réservé aux kanji 鍛 錬 鍛錬 UNIQUEMENT
- **JetBrains Mono** (400, 700) — réservé aux affichages techniques (rest timer MM:SS, chronos, stepper values)

```ts
// theme/fonts.ts
export const fonts = {
  sans:   'BarlowCondensed-Regular',   // 400
  sansM:  'BarlowCondensed-Medium',    // 500
  sansB:  'BarlowCondensed-Bold',      // 700
  sansX:  'BarlowCondensed-Black',     // 900
  jp:     'NotoSerifJP-Bold',
  jpX:    'NotoSerifJP-Black',
  mono:   'JetBrainsMono-Regular',
  monoB:  'JetBrainsMono-Bold',
} as const;
```

**Règles typo non-négociables :**

- Toutes les valeurs numériques dans l'UI sont en poids `900` (Black)
- Titres et CTAs sont en MAJUSCULES avec letter-spacing `0.04em` minimum
- Labels et captions sont en MAJUSCULES avec letter-spacing `0.16em` à `0.3em`
- Body text (descriptions, helpers) : 14px regular weight, casse normale
- Kanji (`鍛`, `錬`, `鍛錬`) toujours en `Noto Serif JP`. Jamais dans le body text. **Jamais comme numéros de liste.**
- Affichages techniques (chronos, temps écoulés, stepper values) en `JetBrains Mono`

### 2.4 · Spacing + radius

```ts
export const spacing = {
  xs: 4,  sm: 8,  md: 12,  lg: 16,  xl: 20,  xxl: 24,  xxxl: 32,
} as const;

export const radius = {
  none: 0,    // défaut pour TOUT — signature brutaliste
  sm:   2,
  md:   4,    // UNIQUEMENT pour les boutons
  lg:   12,   // UNIQUEMENT pour les bottom-sheet modals
} as const;
```

**Règle radius (critique) :** cards, chips, inputs, hero blocks, containers — **tous radius 0**. Seuls les boutons prennent radius 4, seules les modals prennent radius 12. C'est la signature brutaliste. Si tu arrondis un coin en dehors de boutons/modals, tu casses la marque.

**Règle shadow :** pas d'ombres sur les cards in-app. Les seules ombres autorisées :
- Le shadow du phone frame dans les mockups (c'est juste de la présentation mockup, pas dans l'app)
- Le shadow des bottom-sheet modals (subtil, pour séparer du background)
- Le text-shadow rouge du kanji en AI loading state

### 2.5 · Code couleur des macros

Les macros apparaissent dans Home Nutrition, Diet tab, Recipe modal, meal cards — partout où ils s'affichent.

```ts
// theme/macroColors.ts
export const macroColor = {
  protein: 'accent', // rouge
  carbs:   'amber',
  fat:     'green',
} as const;
```

**Applique à la fois** sur la valeur numérique ET sur la bordure du container. Cohérence critique — les users apprennent les couleurs et identifient les macros à la couleur en 0,5 seconde.

---

## 3 · Spécifications des composants

Chaque spec contient : **nom · usage · props clés · styling critique**. Pour les détails pixel-level, ouvre les fichiers HTML dans `/design/`.

### 3.1 · Atoms

#### `Button`
- Props : `variant: 'primary' | 'ghost' | 'outline' | 'danger'`, `size: 'sm' | 'md' | 'lg'`, `loading?`, `disabled?`, `onPress`, `children`
- Primary : bg accent, texte blanc, hauteur 52px (md), texte en majuscules, letter-spacing 0.04em, font weight 700
- Ghost : bg transparent, color textMute, pas de border, hauteur 44px
- Outline : bg transparent, color = text, border 1px color text
- Danger : comme primary mais pour actions destructives (Delete account)
- Radius : 4px (le seul composant qui prend un radius)

#### `Input`
- Souligné uniquement — pas de box border, pas de background
- Border-bottom : 1px borderStrong quand vide, 1px text quand rempli
- Padding bottom 10px, font size 16px, weight 500
- Font : Barlow Condensed (PAS mono)
- Pas de placeholder text — utilise un label séparé au-dessus

#### `Chip`
- Multi-select filter (muscle groups, dietary restrictions)
- Selected : bg accent, color white, border accent, font weight 700
- Unselected : bg transparent, color textDim, border borderStrong
- Padding : 7px 10px, font size 10px, letter-spacing 0.14em, majuscules
- Utilisé dans les flex-wrap grids des intake forms

#### `FilterChip`
- Même visuel que Chip mais en scroll horizontal
- Utilisé dans History filter rows, Library search filters, Plan Builder day selection
- Placé dans `ScrollView horizontal`

#### `MuscleChip`
- Même visuel que Chip, spécifiquement pour la sélection de muscles dans Workout Builder
- Placé dans `ScrollView horizontal` — **jamais en flex-wrap grid** dans Workout Builder
- Les chips peuvent être en flex-wrap grid UNIQUEMENT dans les intake forms où les items sont générés par l'utilisateur

#### `Toggle`
- Pill 36×20, knob blanc 16×16
- Background : borderStrong en off, accent en on
- Transition smooth 200ms

#### `Stepper`
- Structure : `[−]  VALEUR  [+]`
- Boutons 32×32, border borderStrong, background transparent
- Valeur centrée, font weight 900, size 20px
- Suffixe unité petit (size 11px, font weight 500, color textMute)
- Utilisé exclusivement dans Quick Exercise config

#### `Slider`
- Track 2px bg borderStrong, fill accent
- Thumb 14×14 carré accent avec border 2px bg
- Utilisé dans Diet Intake (score aventure)

#### `CornerAccent`
- Carré absolute-positioned, 10×10 (sm) ou 12×12 (md)
- Background : accent
- Positions : `tl | tr | bl | br`
- Utilisé sur les hero cards (TodayCard, DietHero, HookCard, WarningIcon)

#### `Kanji`
- Props : `char: '鍛' | '錬' | '鍛錬'`, `size: 'xs' | 'sm' | 'md' | 'lg' | 'xl'`
- Toujours font `Noto Serif JP`
- Color : accent (sauf en mode watermark)
- Letter-spacing : -0.05em pour chars seuls, 0.4em pour le stamp "鍛 錬"

#### `CornerKanji` (watermark)
- Absolute-positioned top-right de l'écran
- Font size 48px, opacity 4% (dark) / 5% (light)
- Letter-spacing -0.05em
- `pointerEvents: none` et `userSelect: none`
- Alterne `鍛` (train) et `錬` (refine) entre les écrans — PAS le même char partout

### 3.2 · Molecules

#### `StatsStrip` (Home)
- 3 colonnes égales séparées par des lignes border 1px
- Chaque cellule : grosse valeur (24px, weight 900) + petit label (10px majuscules)
- La valeur "streak" a une variante optionnelle `highlight` en accent color

#### `MacroRow` (Nutrition, Diet)
- 3 cellules en grille, gap 8px
- Chaque cellule a border et valeur colorés par macro (protein=accent, carbs=amber, fat=green)
- Label textMute au-dessus, valeur Black weight, unité textMute petite

#### `MacrosInline` (Meal cards)
- Ligne horizontale : `P 32g · G 68g · L 14g`
- Chaque item coloré selon son macro
- Font weight 700, letter-spacing 0.06em
- PAS de séparateur bullet `·` dans les pills colorés — juste du gap entre items

#### `DayPill` (Reminders, Diet day selector)
- Carré ou pill compact
- Lettre unique (L/M/M/J/V/S/D) pour grids 7 colonnes
- Nom complet du jour pour scroll horizontal (Plan Builder day chips)

#### `DayCell` (Workouts tab plan breakdown)
- Cellule carrée aspect-ratio 1
- 4 états : `done` (border vert + texte vert), `today` (border accent + bg teinté + texte accent), `upcoming` (border neutre), `rest` (italique textGhost, texte em-dash)
- Contenu : label jour (top, 9px) + nom séance ou em-dash (bottom, 9px)

#### `CompareBadge` (Session Recap)
- Pill avec pourcentage : `+8,3%` / `= 0,4%` / `−1,8%`
- Couleurs : up=green, flat=amber, down=accent
- Border 1px matching color, bg teinte 10-15% de la même couleur

#### `StatusBadge` (History)
- "Terminée" (vert) ou "Incomplète" (ambre)
- Même pattern visuel que CompareBadge

#### `DiffBadge` (Library)
- "Débutant" (vert), "Inter" (ambre), "Avancé" (accent)
- Placé en top-right des items de liste exercices

#### `GhostValue` (Active Workout)
- Minuscule caption sous un SetField input
- Format "Dernière · 82,5" — nombre en textMute bold, reste en textGhost
- Font size 10px, letter-spacing 0.1em, majuscules

#### `OBDots` (Onboarding, Intake)
- Rangée de bars de largeur égale (4 au total pour onboarding, 4 pour diet intake)
- Chaque bar 3px de haut
- États : `done` (blanc à 50% opacité), `active` (accent), `upcoming` (border)

#### `HomeTab` (dans l'écran Home)
- PAS la tab bar du bas. C'est le switcher Entraînement/Nutrition en HAUT de l'écran Home
- Active tab : accent color + bar accent 2px dessous
- Inactive tab : textMute color, pas de soulignement

### 3.3 · Organisms

#### `TodayCard` (Home)
- Border 1px accent, CornerAccent rouge top-left
- Contenu : label (accent majuscule tiny) + nom séance (22px Black majuscule) + durée (textMute) + muscle tags + preview exercices (3 max + "+N more") + CTA button full-width

#### `SessionPreviewCard` (Session Preview screen)
- Similaire à TodayCard mais affiche la liste complète des exercices avec **numéros arabes (1, 2, 3)** — PAS kanji 一二三
- Hero meta row : nombre d'exercices / min estimées / total séries
- Footer : boutons "+ Exercice" + "⇅ Réorganiser" en dashed outline

#### `WorkoutCard` (Workouts tab templates list)
- Border 1px border, pas de corner accent (pas un hero)
- Contenu : nom + durée sur la même ligne, puis row muscle chips

#### `ActivePlanCard` (Workouts tab)
- Border 1px accent + CornerAccent tl
- Badge "ACTIF" en fill accent
- Nom plan + meta ("4 séances par semaine · X exercices moyens")
- Grille 7 jours de `DayCell` en dessous

#### `SessionCard` (History)
- Border 1px border
- Title row : nom séance + date
- Meta row : durée · volume · séries (valeurs en bold, séparateurs textMute)
- Muscle chips dessous
- StatusBadge en bottom-right

#### `ExerciseRow` (Workout Builder)
- Flex horizontal avec : drag handle (⋮⋮ textGhost) + **index numérique en chiffre arabe** (accent bold 16px — PAS kanji) + nom (majuscule 12px bold) + params (textMute inline) + chevron edit
- Border 1px border, padding 12px 10px

#### `SetField` (Active Workout)
- Grande cellule rectangulaire avec border 1px borderStrong
- Contenu centré : label (textMute majuscule 10px) + valeur (96-180px Black bold) + unité (textMute 11px) + GhostValue en dessous
- Utilisés côte à côte : SetField pour Reps + SetField pour Charge

#### `SetHistoryRow` (Active Workout)
- Row horizontale de 4 cellules (une par série)
- Chaque cellule : 52×auto, border, petit label num "S1/S2/S3/S4" + valeur comme "80×8" ou "···" ou "—"
- États : `done` (vert), `current` (accent), `upcoming` (neutre muted)

#### `RestTimer` (Rest Timer screen)
- Anneau de progression SVG, stroke 6px, rayon ~108px
- Anneau background : surface2 color
- Anneau progress : accent color, stroke-dasharray animé
- Centre : temps en JetBrains Mono 56px + label "/ target" en dessous
- Glow rouge radial derrière l'anneau (gradient rgba(accent, 0.15))

#### `RestTimerControls` (Rest Timer)
- Layout grid :
  - **Top row** : `[−15s] [+15s] [⏸]` — les 2 premiers sont grands (font 16px, padding 18px), le pause est un petit carré 48×48
  - **Bottom** : bouton `Passer` en pleine largeur, bg accent, majuscule, font 15px
- **N'inclus PAS** de note instructionnelle "Tu peux quitter l'app" (le fonctionnement en background est le défaut, les users n'ont pas besoin qu'on leur dise)

#### `VolumeFeedback` (Active Workout, inline)
- Border 1px borderStrong dashed, padding 12px 14px
- Layout : kanji 鍛 (accent, 18px Noto Serif JP) + bloc texte (titre en accent majuscule bold + sous-titre en textDim)
- Format : "Volume +3,1%" + "vs ta dernière séance sur cet exo"

#### `CoachingTip` (Exercise Detail)
- Border 1px accent dashed, padding 12px 14px
- Layout : kanji 鍛 + bloc texte
- La copy utilise le vocabulaire forge : "Forge +2,5 kg" / "Trempe ton volume" / "Retour à l'enclume"
- Max 1 CoachingTip par écran

#### `ProgressionChart` (Exercise Detail)
- Line chart SVG avec area fill
- Ligne principale : accent color, stroke 2px
- Area fill : accent à 8% opacity sous la ligne
- Points data : cercles, le dernier le plus gros (r=4) et totalement opaque, les anciens plus petits et opacity décroissante
- Grid lines : 1px dashed border à 25%/50%/75% lignes horizontales
- Overlay valeur top-left : grand nombre en accent + unité en textMute + label date en textMute caption

#### `PRHighlight` (Session Recap)
- Border 1px accent, bg rgba(accent, 6%)
- Label "NEW PR" flottant absolute -7px top, 14px left, bg accent avec texte blanc majuscule
- Contenu : nom exercice + valeur PR (ex. "85 kg × 8 reps") en 20px Black

#### `MealCard` (Home Nutrition, Diet tab)
- Border 1px border sur 3 côtés, **border-left 3px accent color**
- Top row : label type (accent tiny majuscule) + valeur cal (grande à droite)
- Nom repas : **17px Black weight MAJUSCULE** — c'est l'upgrade de visibilité par rapport aux itérations précédentes
- MacrosInline en dessous avec pills colorés

#### `RecipeSheet` (Modal)
- Bottom-sheet modal avec handle top (pill borderStrong 40×4)
- Modal header : type + cal + close button
- Body scrollable avec : titre (22px Black) + meta row + MacroRow (colorée) + bouton lien YouTube + liste ingrédients (séparateurs dotted, quantités en JetBrains Mono) + **étapes numérotées en chiffres arabes (1, 2, 3)** — PAS kanji

#### `AILoadingState` (AI Plan/Diet generation)
- Layout vertical centré
- Kanji 鍛 à 96px (in-app) ou 520px (App Store screenshot), accent color, animation pulse
- Label "Forgeage en cours" en accent majuscule
- Titre "L'IA construit ton plan"
- Description avec vocabulaire forge
- 3 dots en bas, animés en séquence (delays 0s, 0.2s, 0.4s)

#### `ShareCard` (Session Sharing)
- Aspect ratio 9:16
- Layout : kanji 鍛 錬 top-left (11px accent, letter-spacing 0.4em) + **nom séance GRAND (22px Black majuscule)** — c'est le titre, PAS un générique "Séance terminée" + date (9px majuscule textMute) + stats line en bas (3 stats en flex-row, 1 seul séparateur horizontal en dessous) + logo line TANREN/tanren.app tout en bas
- Background : photo user avec gradient overlay (top transparent → bottom 55% noir pour lisibilité stats)

#### `FeatureCard` (Explore screen)
- Border 1px border (neutre si utilisée, accent si new/non-essayée)
- Si `new` : bg ghostBg teinté + badge "NEW" (9px majuscule bg accent) + CTA "Essayer ›" accent à droite
- Si `tried` : check mark vert à droite
- Layout : icon square 36×36 (border) + bloc title/desc + action droite

### 3.4 · Layout components

#### `Screen`
- Wrapper root pour chaque vue full-screen
- Applique les theme tokens, l'overlay vignette (subtle red radial gradient top) et le CornerKanji optionnel
- Props : `showKanji?: boolean` (défaut true), `kanjiChar?: '鍛' | '錬'` (alterner entre écrans)

#### `ScreenHeader`
- Barre du haut avec : lien back (textMute majuscule caption, "‹ Retour") + titre centré (optionnel) + slot action droit
- Pas de border bottom sur ce header — utilise le whitespace naturel

#### `TabBar` (bottom navigation)
- Exactement **5 tabs** dans cet ordre : **Home · Training · Historique · Diet · Profil**
- Icônes (monochromes, stroke 2px) :
  - Home : maison outline
  - Training : deux haltères avec une barre
  - Historique : horloge outline avec aiguilles
  - Diet : bouclier-cœur outline (similaire à Apple Health)
  - Profil : buste personne
- Tab active : accent color sur icon + label
- Tab inactive : textMute color
- Background : surface1, border-top 1px border
- **Cachée sur** : modals, Workout Builder, Plan Builder, Intake, Active Session, Rest Timer, Recap, Share, AI Plan Generator, Exercise Detail, Delete Account, Guest Upgrade
- **Visible sur** : Home, Workouts tab, History tab, Diet tab (no plan + active), Profile tab, Library (list view), Explore

---

## 4 · Règles visuelles (patterns non-obvious)

Ces règles ont cassé les itérations précédentes. Applique-les toutes sans exception.

### 4.1 · PAS de kanji japonais comme numéros de liste

Utilise **des chiffres arabes** pour toute numérotation :
- Étapes de recette : `1`, `2`, `3` (font Barlow Condensed Black, accent color)
- Exercices dans Session Preview : `1`, `2`, `3`
- Sections Privacy : `01`, `02`, `03`
- Features Diet : `01`, `02`, `03`, `04`
- Benefits Guest : `01`, `02`, `03`

Les kanji `鍛` et `錬` et `鍛錬` sont **réservés** à :
1. Watermark corner (top-right de l'écran)
2. Stamp header (avant titres comme dans Recap, Privacy intro)
3. Accent inline (VolumeFeedback, CoachingTip, Share card kanji)

**Jamais un kanji comme nombre. Jamais.**

### 4.2 · Groupes musculaires dans Workout Builder = scroll horizontal

Dans Workout Builder, les chips de groupes musculaires sont dans `<ScrollView horizontal>` — jamais en flex-wrap grid.

```tsx
<ScrollView horizontal showsHorizontalScrollIndicator={false}>
  {muscleGroups.map(group => <MuscleChip key={group} ... />)}
</ScrollView>
```

Même pattern appliqué à :
- Filter chips dans History (période + muscle)
- Filter chips dans Library (groupes musculaires)
- Day chips dans Plan Builder

Les flex-wrap grids sont acceptables UNIQUEMENT dans les intake forms (Diet Intake "repas préférés") où les items sont générés par l'utilisateur et non-bornés.

### 4.3 · Plan Builder — structure (critique)

**Pas de toggles.** Deux blocs :

**Block 1 — "Jours d'entraînement"**
- Chips jours scrollables horizontalement : `Lun` `Mar` `Mer` `Jeu` `Ven` `Sam` `Dim`
- Tap toggle l'état `selected` (bg accent quand selected)

**Block 2 — "Séance par jour"**
- Liste de rows, une par jour sélectionné
- Chaque row : day-tag (accent majuscule à gauche, 42px de large) + nom séance (majuscule bold) OU "Choisir une séance" (italique textGhost) + chevron ›
- Taper la row ouvre un modal picker de séance

Les jours non-sélectionnés N'APPARAISSENT PAS dans Block 2. Absence d'un jour = jour de repos. Pas de placeholder UI "Repos".

### 4.4 · Code couleur macros (applique partout)

Protein = accent (rouge). Carbs = amber. Fat = green.

Applique à :
- Cellules MacroRow (border + text color de la valeur)
- Pills MacrosInline (text color)
- Partout où tu affiches P/G/L values

Ne change PAS la convention couleur même si un écran individuel "rend mieux" avec d'autres couleurs. Cohérence de marque > préférence esthétique d'un seul écran.

### 4.5 · Meal cards ont une bordure gauche rouge 3px

Le look flat précédent était invisible. Maintenant :

```tsx
<View style={{
  borderWidth: 1,
  borderColor: theme.border,
  borderLeftWidth: 3,
  borderLeftColor: theme.accent,
  padding: 14,
  paddingLeft: 16,
}}>
  {/* ... */}
</View>
```

Le nom du repas est **17px, Black weight, MAJUSCULE** — pas 14px regular. C'est un signature visibility lift.

### 4.6 · Layout des contrôles Rest Timer

```
┌──────────┬──────────┬──────┐
│   −15s   │   +15s   │  ⏸   │  ← top row (gros −15s/+15s, petit carré pause)
└──────────┴──────────┴──────┘
┌─────────────────────────────┐
│          PASSER             │  ← skip button, pleine largeur, bg accent
└─────────────────────────────┘
```

- `−15s` et `+15s` sont les actions primaires : large, font size 16px+, padding 18px
- `⏸` (pause) est secondaire : petit carré 48×48, font 13px, color textMute
- `Passer` (skip) est l'action de dernier recours : button pleine largeur accent, padding 16px, majuscule
- **Pas de note** "Tu peux quitter l'app" (le run en background est le défaut, les users n'ont pas besoin qu'on leur dise)

### 4.7 · Active Workout — position du bouton "Valider la série"

Place le bouton de validation **immédiatement après** le VolumeFeedback component, avec `marginTop: 16px`.

```tsx
<View>
  <VolumeFeedback percent={3.1} />
  <Button variant="primary" style={{ marginTop: 16 }}>
    Valider la série
  </Button>
  <View style={{ flex: 1 }} />  {/* Spacer pour ne rien pousser au bas */}
</View>
```

PAS `marginTop: 'auto'` (qui pousserait le bouton au bas de l'écran). Le bouton doit paraître immédiat et atteignable, pas au bord.

### 4.8 · Structure Share Card (v2)

```
┌─────────────────────────────────┐
│ 鍛 錬                           │  ← petit kanji stamp top-left (11px accent)
│ PUSH DAY                        │  ← nom séance = GRAND TITRE (22px Black majuscule)
│ Ven 18 avr · 1h12               │  ← date petite
│                                 │
│   [ zone photo composition ]   │  ← centre libre pour photo user
│                                 │
│ ─────────────────────────────── │  ← fin divider
│ Volume   Séries   Records       │  ← stats sur UNE ligne horizontale
│ 12 450   18       2             │
│                                 │
│ TANREN             tanren.app   │  ← ligne brand minuscule tout en bas
└─────────────────────────────────┘
```

- Le titre est le **nom de la séance** (dynamique). Ne hardcode PAS "Séance terminée" — ça a été rejeté.
- Les stats sont sur UNE ligne (flex-row, space-between) avec un thin divider au-dessus
- La photo remplit toute la card en background, avec une subtile gradient overlay (transparent en haut → 55% noir en bas pour lisibilité stats)

### 4.9 · Tab bar du bas = 5 tabs (pas 4)

Ordre : **Home · Training · Historique · Diet · Profil**

Ne skip jamais Diet. Ne renomme jamais "Training" en "Séances" (on a utilisé "Training" pour la cohérence de marque, même si c'est un anglicisme — c'est un choix conscient). Ne merge jamais Diet dans un autre onglet.

### 4.10 · Radius 0 par défaut

Cards, chips, inputs, hero blocks, day cells, meal cards, list items — tous `borderRadius: 0`.

Seules exceptions :
- Composant `Button` : `borderRadius: 4`
- Bottom-sheet modals : `borderTopLeftRadius: 12, borderTopRightRadius: 12` (seulement top corners)
- Toggle knobs : cercles (pas rectangles)
- Placeholder avatar profil : carré par défaut (pas cercle — reste brutaliste)

### 4.11 · Hiérarchie d'usage des kanji

Max 1 stamp kanji par écran. Tiers d'usage :

**Tier 1 — Toujours présent** :
- Watermark CornerKanji top-right (opacity 4-5%) sur les écrans principaux

**Tier 2 — Présent quand pertinent** :
- Stamp header `鍛 錬` (20px accent letter-spacing 0.4em) sur Recap, Diet Hero, Privacy intro, Guest upgrade hero, Share card

**Tier 3 — Accent inline** :
- Petit 鍛 dans VolumeFeedback, CoachingTip, items de liste AI suggestion

**Tier 4 — Hero visual** :
- AILoadingState kanji 96px+ pulsant (rare, dédié)

Ne mélange jamais deux stamps Tier 2+ sur le même écran. Choisis-en un.

---

## 5 · Parité dark + light mode

Chaque écran doit fonctionner dans les deux modes. Règles :

1. Utilise les theme tokens exclusivement via `useTheme()` — ne hardcode jamais de valeurs hex dans le code du composant
2. Teste chaque composant nouveau ou modifié dans les deux thèmes avant de commiter
3. Le rouge accent diffère entre les thèmes : `#E8192C` (light) vs `#FF2D3F` (dark). La variante dark est plus vive pour le contraste sur noir. Ne les unifie pas.
4. Green et amber ont aussi des variantes différentes par thème (voir section 2.2)
5. Borders, surfaces, text colors — tous viennent des theme tokens

```tsx
// Usage correct
import { useTheme } from '@/hooks/useTheme';
const { tokens } = useTheme();
<View style={{ borderColor: tokens.border, backgroundColor: tokens.surface1 }} />

// Incorrect
<View style={{ borderColor: '#222', backgroundColor: '#0A0A0A' }} />
```

---

## 6 · Vocabulaire forge (règles de copy)

Utilise ces expressions françaises avec parcimonie — max 1 métaphore forge par écran :

| Français | Contexte | Ne remplace JAMAIS par |
|---|---|---|
| "Forgeage en cours" | AI loading state | "Génération en cours" |
| "Forge +2,5 kg" | Coaching tip quand ça progresse | "Ajoute +2,5 kg" |
| "Trempe ton volume" | Coaching tip quand stagnation | "Essaie un deload" |
| "Retour à l'enclume" | Coaching tip quand régression | "Récupération" |
| "Une rep après l'autre" | Tagline (splash, marketing) | "Rep après rep" |

Copy interdite : journey, parcours, wellness, mindful, holistic, badge, score, points, mission, challenge. Ça casse la voix de marque.

**Tutoiement partout** ("tu", "ton", "ta"). Jamais de vouvoiement. Même dans les erreurs : "Ton mot de passe est trop court" pas "Votre mot de passe...".

---

## 7 · Ordre de build (minimiser le churn visuel)

Si tu appliques à du code existant, refactore dans cet ordre :

### Phase 1 — Foundation (pas de changement visible encore)

1. Crée `theme/colors.ts`, `theme/darkTheme.ts`, `theme/lightTheme.ts`, `theme/fonts.ts` selon section 2
2. Crée `hooks/useTheme.ts` qui fournit `{ tokens, scheme }` et auto-détecte le color scheme système
3. Installe les fonts via `expo-font` (3 familles)
4. Commit : `feat(theme): design tokens + useTheme hook`

### Phase 2 — Atoms (parité visuelle unit-level)

5. Build/refactor atoms dans cet ordre : `Button`, `Input`, `Chip`, `FilterChip`, `MuscleChip`, `Toggle`, `Stepper`, `Slider`, `CornerAccent`, `Kanji`, `CornerKanji`
6. Remplace tous les usages existants de button/input/chip à travers l'app pour utiliser ces atoms
7. Commit : `refactor(ui): atoms + migration atoms globale`

### Phase 3 — Molecules

8. Build/refactor `StatsStrip`, `MacroRow`, `MacrosInline`, `DayPill`, `DayCell`, `CompareBadge`, `StatusBadge`, `DiffBadge`, `GhostValue`, `OBDots`, `HomeTab`
9. Commit : `refactor(ui): molecules`

### Phase 4 — Layout

10. Crée/refactor `Screen`, `ScreenHeader`, `TabBar`
11. Migre chaque écran existant pour utiliser le wrapper `Screen` + `ScreenHeader`
12. Vérifie que `TabBar` a les 5 bonnes tabs avec Diet
13. Commit : `refactor(ui): layout primitives + tab bar 5 onglets`

### Phase 5 — Organisms + écrans

14. Refactor les écrans un par un, du plus trafiqué au moins trafiqué :
    - Home (Training tab + Nutrition tab avec macros colorées)
    - Active Workout (SetField, SetHistoryRow, VolumeFeedback, bouton validate positionné correctement)
    - Session Recap (stats grid, PRHighlight, liste CompareBadge)
    - Rest Timer (timer + contrôles selon 4.6)
    - Session Preview (hero meta + liste exercices avec chiffres arabes)
    - Workouts tab (ActivePlanCard avec grille DayCell)
    - History tab (filters + liste SessionCard)
    - Exercise Library (search + liste + détail avec ProgressionChart + CoachingTip)
    - Workout Builder (scroll horizontal muscle chips)
    - Plan Builder (day chips horizontaux + liste d'assignation, pas de toggles)
    - AI Plan Generator (prompt + AILoadingState)
    - Diet tab (no plan + active avec macros colorées)
    - Diet Intake (4 steps)
    - Reminders (toggles + time pickers)
    - Profile (avatar + stats + sections)
    - Explore, Privacy, Guest Upgrade, Delete Account (moins critiques)
    - Share Card (structure selon 4.8)
15. Commit par écran : `refactor(ui/<écran>): application charte tanren`

### Phase 6 — Polish

16. Teste chaque écran en dark + light
17. Vérifie que tous les CornerKanji alternent entre 鍛 et 錬
18. Audit des hardcoded colors, radii, fonts restants
19. Audit des kanji japonais restants utilisés comme numéros de liste (doit être zéro)
20. Commit : `polish(ui): audit parité dark/light + conformité charte`

---

## 8 · Checklist avant commit (tous visuels)

Pour chaque PR, vérifie :

- [ ] Toutes les couleurs viennent de theme tokens (pas de hex hardcodé)
- [ ] Tous les radii sont 0 sauf buttons (4) et modals (12)
- [ ] Toutes les fonts viennent de `theme/fonts.ts` (pas de system fonts hardcodées)
- [ ] Dark + light testés et fonctionnels
- [ ] Aucun kanji japonais utilisé comme numéro de liste
- [ ] Les muscle groups dans les builders sont en scroll horizontal, pas en wrap
- [ ] Les meal cards ont une border-left rouge 3px
- [ ] Les macros sont colorées (P=rouge, C=ambre, L=vert)
- [ ] La tab bar du bas a 5 onglets avec Diet inclus (où applicable)
- [ ] Le watermark kanji est présent et alterne 鍛/錬
- [ ] Pas de vocabulaire wellness dans la copy
- [ ] Tutoiement dans toute la copy
- [ ] Métrique uniquement (kg, cm, virgule décimales, espace milliers)

---

## 9 · Index des mockups de référence

Ouvre ces fichiers dans `/design/` pour voir l'état visuel cible pixel-près :

| Écran | Fichier | Section |
|---|---|---|
| Onboarding (step 3 Mensurations) | `Tanren_Core_Flow_v2.html` | 03 |
| Home (Entraînement tab) | `Tanren_Core_Flow_v2.html` | 04 |
| Home (Nutrition tab) | `Tanren_Core_Flow_v2.html` | 04 |
| Active Workout | `Tanren_Core_Flow_v2.html` | 10 |
| Rest Timer | `Tanren_Core_Flow_v2.html` | 11 |
| Session Recap | `Tanren_Core_Flow_v2.html` | 12 |
| Session Sharing (v2) | `Tanren_Core_Flow_v2.html` | 13 |
| Workouts tab | `Tanren_Lot2_Data_Tabs.html` | 05 |
| History | `Tanren_Lot2_Data_Tabs.html` | 14 |
| Exercise Library (list) | `Tanren_Lot2_Data_Tabs.html` | 15 |
| Exercise Detail | `Tanren_Lot2_Data_Tabs.html` | 15 |
| Profile | `Tanren_Lot2_Data_Tabs.html` | 19 |
| Workout Builder | `Tanren_Lot3_Creation_Diet.html` | 06 |
| Plan Builder | `Tanren_Lot3_Creation_Diet.html` | 07 |
| AI Plan Generator | `Tanren_Lot3_Creation_Diet.html` | 08 |
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

---

## 10 · NE TOUCHE PAS

**Fichiers red-flag — ne jamais modifier dans le cadre de l'application de la charte :**

```
apps/api/**                  # Backend intouché
packages/shared-schemas/**   # Contrats de données
**/stores/*.ts               # État Zustand
**/db/**                     # Modèles WatermelonDB
**/hooks/use{Health,Session,Sync,Auth}.ts   # Hooks logique métier
**/api/*.ts                  # Wrappers fetch backend
**/utils/format.ts           # Déjà verrouillé (kg, date, timer formatters)
**/locales/fr.ts             # Ajoute/update les strings uniquement pour NOUVELLE copy UI, jamais les strings métier
**/types/**                  # Types partagés
```

**Fichiers green-flag — fine à modifier :**

```
**/theme/**                  # Tous les theme tokens
**/components/atoms/**       # Construis tous les atoms ici
**/components/molecules/**
**/components/organisms/**
**/components/forge/**       # Composants signature marque
**/components/layout/**      # Screen, ScreenHeader, TabBar
**/app/**/*.tsx              # Fichiers écran — JSX uniquement, PAS les fonctions de logique métier en haut du fichier
```

---

## 11 · Questions à poser avant de démarrer

Demande à l'utilisateur (Ramy) si l'un de ces points n'est pas clair :

- Le code existant utilise-t-il déjà des theme tokens, ou les couleurs sont-elles hardcodées ?
- Quels écrans sont déjà construits vs à construire ? (Détermine refactor vs create)
- Les 3 fonts sont-elles déjà chargées via `expo-font` ? (Sinon c'est l'étape 1)
- Le hook `useTheme()` est-il déjà en place, ou faut-il le créer ?
- La tab bar du bas à 5 onglets est-elle déjà structurée, ou est-elle à 4 onglets actuellement ?

---

*Applique la charte. Garde la logique métier intouchée. Ship le brand brutaliste.*

*Tanren · Une rep après l'autre.*
