# TANREN — Checklist d'audit visuel (par écran)

> **Usage** : relance ce checklist après avoir refactor chaque écran, avant de commiter. Chaque case non cochée = régression de charte à corriger.

---

## Instructions

Pour chaque écran refactorisé, ouvre :
1. L'écran en dark mode
2. L'écran en light mode
3. Le mockup HTML correspondant dans `/design/`

Puis parcours la checklist ci-dessous. Si quelque chose ne matche pas, fixe avant de commiter.

---

## ✅ Checklist générale (applicable à tous les écrans)

### Tokens et couleurs

- [ ] Aucune couleur hex hardcodée dans le fichier (toutes viennent de `useTheme()`)
- [ ] Pas de couleur "custom" introduite (seulement les 3 brand + 3 semantic)
- [ ] Dark mode utilise `#FF2D3F` pour l'accent, light utilise `#E8192C`
- [ ] Les textes gris utilisent bien la bonne hiérarchie : `text` > `textDim` > `textMute` > `textGhost`

### Typographie

- [ ] Toutes les valeurs numériques affichées sont en weight `900` (Black)
- [ ] Les titres et CTAs sont en MAJUSCULES avec letter-spacing ≥ `0.04em`
- [ ] Les labels et captions sont en MAJUSCULES avec letter-spacing ≥ `0.16em`
- [ ] Le body text est en regular weight, casse normale
- [ ] Les kanji 鍛 錬 鍛錬 utilisent `Noto Serif JP` (jamais Barlow)
- [ ] Les chronos, elapsed times, stepper values utilisent `JetBrains Mono`

### Radius et shadows

- [ ] Toutes les cards, chips, inputs ont `borderRadius: 0`
- [ ] Seuls les boutons ont `borderRadius: 4`
- [ ] Seules les bottom-sheet modals ont `borderTopLeftRadius: 12` (top corners uniquement)
- [ ] Aucune ombre sur les cards in-app
- [ ] Le text-shadow rouge sur kanji 鍛 est uniquement sur AILoadingState

### Parité dark/light

- [ ] L'écran rendu en dark mode matche le mockup HTML dark
- [ ] L'écran rendu en light mode matche le mockup HTML light
- [ ] Pas de texte illisible dans l'un des modes (contraste OK)
- [ ] Les borders sont visibles dans les deux modes

---

## ✅ Checklist par pattern (applicable si le pattern est présent sur l'écran)

### Si l'écran affiche des macros (P/G/L)

- [ ] Protéines = couleur accent (rouge)
- [ ] Glucides = couleur amber
- [ ] Lipides = couleur green
- [ ] La couleur est appliquée **à la fois** à la valeur numérique ET à la bordure du container
- [ ] Les `MacrosInline` pills sont colorés aussi (pas tous en gris)
- [ ] Pas de séparateur `·` entre les pills colorés (juste du gap)

### Si l'écran affiche des meal cards

- [ ] Border-left de 3px en couleur accent (rouge)
- [ ] Border des 3 autres côtés en couleur border (neutre)
- [ ] Le nom du repas est en **17px Black weight MAJUSCULE**
- [ ] Le label type (Petit-déj / Déjeuner / ...) est en 10px accent uppercase

### Si l'écran est une tab principale (Home, Training, History, Diet, Profile)

- [ ] La tab bar du bas est visible
- [ ] Elle a **5 onglets** : Home · Training · Historique · Diet · Profil
- [ ] L'onglet Diet est bien présent (souvent oublié)
- [ ] "Séances" n'est plus utilisé (c'est "Training" maintenant)
- [ ] L'onglet actif est en couleur accent
- [ ] Les icônes sont monochromes, stroke 2px

### Si l'écran est une modal / builder / intake / active session

- [ ] La tab bar du bas est **cachée**
- [ ] Le header écran a le back link (`‹ Retour`) avec textMute
- [ ] Le titre est centré et en majuscules

### Si l'écran est Workout Builder

- [ ] Les muscle chips sont dans `<ScrollView horizontal>`
- [ ] Pas de `flexWrap` sur leur container
- [ ] Les chips ont un `flexShrink: 0` pour éviter la compression
- [ ] Scrollbar cachée (`showsHorizontalScrollIndicator={false}`)

### Si l'écran est Plan Builder

- [ ] **Pas de toggles** on/off
- [ ] Block 1 = chips jours scrollables (Lun, Mar, ..., Dim)
- [ ] Block 2 = liste d'assignation, **seulement pour les jours sélectionnés**
- [ ] Les jours non-sélectionnés ne sont pas affichés dans Block 2
- [ ] Pas de placeholder UI "Repos" pour les jours non-sélectionnés

### Si l'écran est Rest Timer

- [ ] Layout des contrôles en 2 rows
- [ ] Top row : `−15s` (large) + `+15s` (large) + `⏸` (petit carré 48×48)
- [ ] Bottom row : `Passer` en pleine largeur, bg accent
- [ ] **Pas de note** "Tu peux quitter l'app"
- [ ] Le MM:SS central est en JetBrains Mono

### Si l'écran est Active Workout

- [ ] Les SetField pour Reps et Charge sont côte à côte
- [ ] La valeur est en 96-180px Black weight
- [ ] Les GhostValue ("Dernière · 82,5") sont sous chaque SetField
- [ ] Le bouton "Valider la série" a `marginTop: 16` (pas `auto`)
- [ ] Un spacer `flex: 1` vient après le bouton (pas avant)

### Si l'écran est Session Recap ou Recipe Modal

- [ ] Les étapes numérotées sont en **chiffres arabes** (1, 2, 3...)
- [ ] **PAS de kanji japonais** (一 二 三) comme numéros
- [ ] Le font des numéros est Barlow Condensed Black (pas Noto Serif JP)

### Si l'écran est Session Preview

- [ ] La liste des exercices utilise des chiffres arabes (1, 2, 3)
- [ ] Le hero card a un `CornerAccent` rouge top-left
- [ ] Les boutons "+ Exercice" et "⇅ Réorganiser" sont en dashed outline

### Si l'écran est Privacy, Guest Upgrade, Diet no-plan

- [ ] Les sections/benefits numérotés utilisent `01`, `02`, `03` (format 2 chiffres)
- [ ] Font : Barlow Condensed Black, color accent
- [ ] Pas de kanji japonais comme numéros

### Si l'écran est Share Card

- [ ] Le titre est le **nom de la séance** (ex: "PUSH DAY")
- [ ] Le titre n'est PAS "Séance terminée"
- [ ] Les stats sont sur **une seule ligne horizontale** (flex-row)
- [ ] Un fin divider au-dessus de la ligne stats
- [ ] Le kanji 鍛 錬 est en top-left (petit, 11px)
- [ ] Photo user en background avec gradient overlay

### Si l'écran utilise un CornerKanji (watermark)

- [ ] Position : top-right, ~80-140px du top
- [ ] Font : Noto Serif JP Black
- [ ] Opacity : 0.04 (dark) ou 0.05 (light)
- [ ] `pointerEvents: 'none'` et `userSelect: 'none'`
- [ ] Alterne entre `鍛` et `錬` (pas le même partout)

### Si l'écran affiche du vocabulaire forge

- [ ] Max **1 métaphore forge** par écran
- [ ] Utilise les phrases exactes : "Forgeage en cours", "Forge +2,5 kg", "Trempe ton volume", "Retour à l'enclume"
- [ ] Pas de "génération en cours" à la place de "forgeage en cours"
- [ ] Tutoiement partout ("tu", "ton", "ta", "tes")
- [ ] Pas de vouvoiement ("vous", "votre", "vos")

### Si l'écran affiche de la copy nutrition ou workout

- [ ] Métrique uniquement : kg, cm, km (jamais lbs, inches, feet)
- [ ] Décimales avec **virgule** (`82,4`, pas `82.4`)
- [ ] Milliers avec **espace** (`12 450`, pas `12,450`)
- [ ] Dates au format `DD/MM/YYYY` (`18/04/2026`, pas `04/18/2026`)
- [ ] Monday = premier jour de semaine (dans les calendriers/heatmaps)

---

## 🚨 Red flags — stop si tu vois ça

Si pendant ton audit tu remarques UN des éléments suivants, **arrête et demande à l'utilisateur** avant de commiter :

- [ ] ❌ Un élément avec radius arrondi en dehors de buttons/modals (tu as cassé le brutalisme)
- [ ] ❌ Une nouvelle couleur introduite (rose, violet, bleu, gradient...) qui n'est pas dans les tokens
- [ ] ❌ Un kanji japonais utilisé comme numéro de liste (régression charte)
- [ ] ❌ Les toggles réapparus dans Plan Builder (régression charte)
- [ ] ❌ Un bouton "Valider la série" collé au bas de l'écran (régression Fitts's Law)
- [ ] ❌ Des meal cards plates sans border rouge gauche (régression visibilité)
- [ ] ❌ 4 onglets dans la tab bar au lieu de 5 (Diet oublié)
- [ ] ❌ "Séance terminée" comme titre Share Card au lieu du nom séance
- [ ] ❌ Un emoji utilisé dans l'UI (🔥 ⚡ 💪 — interdits)
- [ ] ❌ Du vocabulaire wellness (journey, mindful, holistic, badge, score...)
- [ ] ❌ Une ombre (shadow) sur une card in-app
- [ ] ❌ Une couleur hardcodée en hex dans un style (tout doit venir des tokens)

---

## 📋 Commit message template (à suivre)

Après audit réussi, commite avec ce format :

```
refactor(ui/<écran>): apply tanren charter

- Theme tokens migration (no hardcoded colors)
- Macros color coding (P=red, C=amber, F=green) [si applicable]
- Meal cards border-left rouge + titre 17px Black [si applicable]
- Tab bar 5 onglets avec Diet [si applicable]
- Muscle chips scroll horizontal [si applicable]
- Plan Builder refondu (chips + list) [si applicable]
- Rest Timer controls layout [si applicable]
- Active Workout bouton valider repositionné [si applicable]
- Kanji numbers → arabic numerals [si applicable]
- Share Card titre = nom séance [si applicable]
- Dark + light mode tested ✓

Ref: /design/<fichier>.html section <X>
```

---

*Applique la charte. Audit chaque écran. Ship propre.*

*Tanren · Une rep après l'autre.*
