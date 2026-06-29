# Tanren — Website Revamp Patch v4

> **Pour Claude Code · à exécuter dans le repo `tanren-web` (Astro, déployé Vercel sur tanren.fr)**

---

## 🎯 Objectif

Refondre intégralement le site `tanren.fr` pour refléter la réalité produit actuelle : **8 fonctionnalités majeures** non documentées sur le site v3 sont à intégrer avec une présentation des 16 écrans réels de l'app.

Le site v3 actuellement déployé sous-vend largement le produit : il ne montre que 4 features alors que l'app gère désormais Coach IA texte libre, génération multi-étapes, recettes complètes, liste de courses auto, partage social 9:16, comparaison Avant/Après, stats long terme avec heatmap, et système de rappels.

**Le mockup HTML de référence pixel-perfect est dans `Tanren_Website_v4.html`** — utilise-le comme source de vérité visuelle absolue. Reproduis chaque écran téléphone, chaque texte, chaque proportion, chaque accent rouge.

---

## ⚠️ Contraintes non-négociables

### Charte (à ne JAMAIS enfreindre)
- **Logo** : Forge-Spark Mark uniquement (anvil ring + red core + hammer bars + sparks). Le SVG inline est dans le mockup HTML. **Pas de dumbbell logo.**
- **Palette stricte** : `#FF2D3F` (forge dark mode) / `#E8192C` (forge light mode) / `#0A0A0A`-`#141414` (iron) / `#FFFFFF` (anvil). Aucune autre couleur d'accent — le vert (`#4ADE80`) et l'amber (`#F59E0B`) sont réservés aux indicateurs nutritionnels (P/G/L) et de progression (validé/à pousser), jamais comme couleur de marque.
- **Typo** : Barlow Condensed (display + UI), Barlow (body), JetBrains Mono (mono/labels), Noto Serif JP (kanji uniquement).
- **Brutalisme** : aucun `border-radius > 4px` sur les boutons, aucun > 12px sur les modales, **aucune ombre**. Bordures fines, accents rouges, corner marks.
- **Watermarks kanji** : 鍛 et 錬 alternés à 6-8% d'opacité dans les sections, jamais comme bullet point ou numéro de liste.
- **Numéros de section/liste** : chiffres arabes uniquement (`01`, `02`, `1.1`…). Jamais de kanji comme numéro.
- **Tagline officielle** : "Une rep après l'autre" / "Built rep by rep."
- **Tutoiement systématique.**

### Infrastructure (à conserver telle quelle)
- Domaine `tanren.fr` (Squarespace)
- Email transactionnel Resend sur `send.tanren.fr`
- Mailboxes iCloud+ sur `tanren.fr` (`ramy@`, `contact@`, `support@`)
- Waitlist Resend Audiences (formulaire actuel à conserver)
- Fichiers AASA / `assetlinks.json` actuels à laisser intacts (deep linking iOS/Android)
- Déploiement Vercel sur la branche `main`

---

## 📋 Plan de refonte — Stratégie de patch

### Étape 1 — Audit du repo existant

```bash
# Liste tous les composants Astro existants
find src/components -name "*.astro" | head -30

# Liste les pages actuelles
find src/pages -name "*.astro"

# Identifie le layout principal
cat src/layouts/*.astro 2>/dev/null | head -50

# Récupère les design tokens actuels
grep -r "FF2D3F\|E8192C" src/ --include="*.astro" --include="*.css" --include="*.ts"
```

Documente dans une note ce qui existe déjà : composants Hero, Features, Footer, etc. Identifie les fichiers à remplacer vs ceux à créer.

### Étape 2 — Mise à jour des design tokens

Édite (ou crée) `src/styles/tokens.css` pour aligner sur le mockup :

```css
:root {
  --forge-dark: #FF2D3F;
  --forge-light: #E8192C;
  --iron-deep: #0A0A0A;
  --iron: #141414;
  --iron-soft: #1F1F1F;
  --iron-line: #2A2A2A;
  --anvil: #FFFFFF;
  --anvil-soft: #F5F5F5;
  --ash: #888888;
  --ash-dim: #555555;
  --green-pr: #4ADE80;
  --amber: #F59E0B;
  --border-dark: rgba(255,255,255,0.08);
  --border-light: rgba(0,0,0,0.08);

  --font-display: 'Barlow Condensed', sans-serif;
  --font-body: 'Barlow', sans-serif;
  --font-mono: 'JetBrains Mono', monospace;
  --font-kanji: 'Noto Serif JP', serif;
}
```

Et dans le `<head>` du layout principal, ajoute le preconnect + import Google Fonts (toutes les graisses utilisées : Barlow Condensed 400/500/700/900, Barlow 400/500/700, JetBrains Mono 400/500, Noto Serif JP 400/700/900).

### Étape 3 — Création des 18 composants Phone

Crée le dossier `src/components/phones/` et reproduis chaque écran téléphone du mockup comme un composant Astro autonome. **Source de vérité : copie le markup pixel-perfect depuis `Tanren_Website_v4.html`.**

Composant wrapper partagé `src/components/phones/PhoneFrame.astro` :

```astro
---
// Frame iPhone partagé : notch + bordures + ombre
---
<div class="phone">
  <div class="phone-notch"></div>
  <div class="phone-screen">
    <div class="phone-statusbar">
      <span><slot name="time">11:41</slot></span>
      <div class="phone-statusbar-icons">···· 􀙇 ▮</div>
    </div>
    <slot />
  </div>
</div>

<style>
  .phone { /* ... copie depuis le mockup ... */ }
</style>
```

Puis les **18 composants spécialisés** (un par écran) :

| # | Composant Astro | Section | Écran source dans le mockup |
|---|-----------------|---------|------------------------------|
| 1 | `PhoneCoachIA.astro` | Hero + 02 | Coach IA texte libre |
| 2 | `PhoneRecipe.astro` | Hero + 04 | Recette Saumon poêlé |
| 3 | `PhoneCompareShare.astro` | Hero + 05 | Avant/Après partage 9:16 |
| 4 | `PhoneSessionDetail.astro` | 01 | Détail séance Push |
| 5 | `PhoneActiveSet.astro` | 01 | Validation série 1.2 |
| 6 | `PhoneRestTimer.astro` | 01 | Rest Timer 01:54 |
| 7 | `PhoneSessionDone.astro` | 01 | Récap "Séance terminée" |
| 8 | `PhoneLoadingIA.astro` | 02 | Loading "Ton plan se forge" |
| 9 | `PhonePlan.astro` | 02 | Plan généré 4j |
| 10 | `PhoneHistoryStats.astro` | 03 | Heatmap + volume hebdo |
| 11 | `PhoneHistoryList.astro` | 03 | Historique liste avec PR |
| 12 | `PhoneWeight.astro` | 03 | Suivi du poids 75,5 kg |
| 13 | `PhoneEvolution.astro` | 03 | Galerie évolution photos |
| 14 | `PhoneNutrition.astro` | 04 | Plan nutrition Mer 6 |
| 15 | `PhoneCourses.astro` | 04 | Liste courses 0/64 |
| 16 | `PhoneShareSession.astro` | 05 | Partage séance overlay |
| 17 | `PhoneCompareInApp.astro` | 05 | Comparaison Avant/Après |
| 18 | `PhoneReminders.astro` | 06 | Rappels & notifications |

> **Note** : Les phones #1, #2, #3 (hero) sont réutilisés en versions plus compactes dans les sections 02, 04, 05. Tu peux les paramétrer avec une prop `compact` pour ajuster la densité.

### Étape 4 — Création des sections

Crée (ou remplace) ces sections dans `src/components/sections/` :

| Composant | Contenu |
|-----------|---------|
| `Hero.astro` | 3 phones en éventail (-8°, 0°, +8°), eyebrow "Beta fermée · Sur invitation", h1 "Forge ta force. Une rep après l'autre.", CTAs primaire/secondaire |
| `TrustStrip.astro` | 4 colonnes : FR · RGPD · 600+ · Ø |
| `SectionEffort.astro` | Section 01 grid-4 avec 4 phones |
| `SectionIntelligence.astro` | Section 02 grid-3 avec 3 phones + bloc 2.4 Création manuelle |
| `SectionProgression.astro` | Section 03 : 2 grids-2 empilés (4 phones) |
| `SectionNutrition.astro` | Section 04 grid-3 avec 3 phones |
| `SectionPartage.astro` | Section 05 grid-2 avec 2 phones |
| `SectionRappels.astro` | Section 06 : phone + texte droite, ratio 1:1.4 |
| `SectionPourquoi.astro` | 4 cards Pourquoi Tanren (IA-native, Sans pub, Sans friction, Discipline) |
| `SectionEtymology.astro` | 鍛錬 géant + explication + grille 鍛 × 錬 |
| `Waitlist.astro` | Form Resend Audiences (à brancher sur l'existant), pas iOS/Android |
| `Footer.astro` | Logo + 4 colonnes (Produit, Légal, Contact) |

Chaque section reprend exactement la structure (numéro, h2, lede, grid de phones, captions) du mockup HTML.

### Étape 5 — Page d'accueil

Édite `src/pages/index.astro` pour assembler dans l'ordre exact :

```astro
---
import Layout from '../layouts/Main.astro';
import Hero from '../components/sections/Hero.astro';
import TrustStrip from '../components/sections/TrustStrip.astro';
import SectionEffort from '../components/sections/SectionEffort.astro';
import SectionIntelligence from '../components/sections/SectionIntelligence.astro';
import SectionProgression from '../components/sections/SectionProgression.astro';
import SectionNutrition from '../components/sections/SectionNutrition.astro';
import SectionPartage from '../components/sections/SectionPartage.astro';
import SectionRappels from '../components/sections/SectionRappels.astro';
import SectionPourquoi from '../components/sections/SectionPourquoi.astro';
import SectionEtymology from '../components/sections/SectionEtymology.astro';
import Waitlist from '../components/sections/Waitlist.astro';
---
<Layout>
  <Hero />
  <TrustStrip />
  <SectionEffort />
  <SectionIntelligence />
  <SectionProgression />
  <SectionNutrition />
  <SectionPartage />
  <SectionRappels />
  <SectionPourquoi />
  <SectionEtymology />
  <Waitlist />
</Layout>
```

### Étape 6 — Layout & topbar

Mets à jour `src/layouts/Main.astro` :
- Topbar sticky avec Forge-Spark Mark SVG (32×32) + wordmark "Tanren" + kanji 鍛 錬
- Liens nav : Fonctionnalités · Progression · Nutrition · Manifesto
- Theme toggle (☀ / ☾) qui switch `body.dark` ↔ `body.light`
- CTA "Beta · Waitlist" en rouge à droite

### Étape 7 — Waitlist Resend

**À conserver telle quelle si elle fonctionne déjà.** Si la section Waitlist actuelle utilise Resend Audiences, ne touche que le styling pour matcher le mockup (form border iron-line, input mono, bouton "Forger" rouge). L'endpoint d'API et la logique de soumission restent identiques.

### Étape 8 — SEO + métadonnées

Mets à jour les meta tags dans `Main.astro` :

```html
<title>Tanren — Forge ta force. Une rep après l'autre.</title>
<meta name="description" content="L'app de musculation IA-native qui te suit pendant l'effort, écrit tes plans à partir d'un texte libre, calcule tes macros, et garde la trace de chaque rep. Beta fermée Android.">
<meta property="og:title" content="Tanren — Forge ta force.">
<meta property="og:description" content="L'app de musculation IA-native. Coach IA, plans générés, nutrition complète, suivi long terme. Beta fermée.">
<meta property="og:image" content="https://tanren.fr/og-v4.png">
<meta property="og:url" content="https://tanren.fr">
<meta name="twitter:card" content="summary_large_image">
<html lang="fr">
```

### Étape 9 — Validation

```bash
# Build local
pnpm build  # ou npm run build

# Preview
pnpm preview

# Vérifie qu'il n'y a aucun warning Astro/CSS
# Vérifie le rendu mobile (DevTools, 375px width)
# Vérifie le toggle dark/light
# Vérifie que tous les liens d'ancres fonctionnent (#features, #progression, #nutrition, #waitlist)

# Lighthouse — viser ≥ 95 sur Performance et Accessibility
```

### Étape 10 — Déploiement

```bash
git checkout -b feature/website-v4
git add .
git commit -m "feat: refonte v4 — 18 phones, 7 sections, 8 fonctionnalités majeures

- Hero éventail 3 phones (Coach IA / Avant-Après / Recette)
- Sections : Effort, Intelligence IA, Progression, Nutrition, Partage, Rappels
- Charte forge respectée (palette stricte, brutalisme, kanji watermarks)
- Conservation Resend Audiences waitlist
- Conservation AASA / assetlinks intacts"

git push origin feature/website-v4
```

Ouvre une PR vers `main`. Vercel génère un preview deployment. Vérifie en preview avant de merger.

---

## 🔍 Sources de vérité — Mapping captures → composants

Toutes les captures d'écran réelles de l'app Tanren sont déjà reproduites pixel-perfect dans `Tanren_Website_v4.html`. Pour chaque composant Phone, ouvre le mockup dans un navigateur et copie le markup correspondant.

| Capture app | Composant Astro à créer |
|-------------|-------------------------|
| Coach IA texte libre + suggestions PPL/Upper-Lower | `PhoneCoachIA.astro` |
| Loading IA "Ton plan se forge" + 4 étapes + 鍛 | `PhoneLoadingIA.astro` |
| Nouveau plan "Recomposition corporelle 4j" + planning Lun Push | `PhonePlan.astro` |
| Détail séance Push 7 exercices avec PR 115kg / 25kg | `PhoneSessionDetail.astro` |
| Validation série Développé couché 2/4 vert/rouge | `PhoneActiveSet.astro` |
| Rest Timer 01:54 cercle SVG | `PhoneRestTimer.astro` |
| Séance terminée 1000kg / +66,7% | `PhoneSessionDone.astro` |
| Historique LISTE 11 séances / 26 280 kg + PR badge "6 PR" | `PhoneHistoryList.astro` |
| Stats long terme heatmap 7×7 + courbe volume hebdo + Records | `PhoneHistoryStats.astro` |
| Suivi poids 75,5 kg + courbe + min/moy/max | `PhoneWeight.astro` |
| Évolution photos galerie face/profil/dos | `PhoneEvolution.astro` |
| Nutrition Mer 6 — 1610 kcal + macros + repas | `PhoneNutrition.astro` |
| Recette Saumon poêlé — macros P/G/L + 4 étapes + YouTube | `PhoneRecipe.astro` |
| Liste courses 0/64 articles cochés | `PhoneCourses.astro` |
| Partage séance 9:16 — Curls Marteau + photo torse + stats | `PhoneShareSession.astro` |
| Comparaison Avant/Après in-app FACE / -20kg / 62 jours | `PhoneCompareInApp.astro` |
| Avant/Après partage 9:16 — -20kg / @TANRENAPP | `PhoneCompareShare.astro` |
| Rappels — entraînement (LMVS, 30min avant) / repas / hydratation 1.5h | `PhoneReminders.astro` |

---

## ✅ Checklist de validation finale

Avant de merger la PR :

- [ ] Le logo dans la topbar est bien le **Forge-Spark Mark** (pas un dumbbell)
- [ ] La palette est respectée à 100% : zéro autre rouge que `#FF2D3F`/`#E8192C`
- [ ] Toutes les polices Google Fonts (Barlow Condensed, Barlow, JetBrains Mono, Noto Serif JP) chargent correctement
- [ ] Les 16 écrans téléphone sont visibles et lisibles (textes en français, pas de placeholder)
- [ ] Le hero contient bien **3 phones en éventail** : Coach IA (-8°), Avant/Après (0°, scaled 1.06), Recette (+8°)
- [ ] La trust strip affiche FR · RGPD · 600+ · Ø
- [ ] Les 8 fonctionnalités majeures sont toutes présentées : Coach IA texte libre, génération multi-étapes, recettes complètes, liste de courses, partage social 9:16, avant/après, stats long terme, rappels & notifs
- [ ] L'étymologie 鍛錬 affiche bien les deux kanji séparés avec leur signification (forger × raffiner)
- [ ] Le tutoiement est utilisé partout (jamais de "vous")
- [ ] Le toggle dark/light fonctionne et persiste pendant la session
- [ ] La waitlist Resend Audiences fonctionne toujours (test avec une vraie soumission)
- [ ] Les fichiers `/.well-known/apple-app-site-association` et `/.well-known/assetlinks.json` sont **intacts**
- [ ] Lighthouse Performance ≥ 90 / Accessibility ≥ 95 / Best Practices ≥ 95 / SEO ≥ 95
- [ ] Le rendu mobile (375px) est lisible — les phones se réorganisent en colonne verticale
- [ ] Aucune erreur console JS, aucun warning Astro

---

## 🚫 Ce qu'il NE faut PAS faire

- ❌ Ne pas omettre l'une des 18 captures de phone
- ❌ Ne pas remplacer le Forge-Spark Mark par un autre logo
- ❌ Ne pas introduire de couleur d'accent autre que le rouge brand
- ❌ Ne pas ajouter de border-radius arrondis sur les boutons (max 4px)
- ❌ Ne pas ajouter de drop-shadows aux cards / phones (le mockup utilise uniquement des bordures fines)
- ❌ Ne pas casser la waitlist Resend Audiences
- ❌ Ne pas modifier les fichiers AASA / assetlinks
- ❌ Ne pas vouvoyer
- ❌ Ne pas utiliser de kanji comme bullet point ou numéro de section
- ❌ Ne pas modifier le domaine ou la config DNS
- ❌ Ne pas omettre les watermarks kanji 鍛/錬 dans les sections (ils font partie de l'identité)

---

## 📦 Livrables attendus

1. Branch `feature/website-v4` poussée sur GitHub
2. PR ouverte vers `main` avec preview Vercel attaché
3. Capture d'écran du résultat preview en dark mode + light mode
4. Lighthouse report joint à la PR
5. Le repo doit pouvoir tourner en local avec `pnpm dev` sans erreur

---

**Référence visuelle absolue : `Tanren_Website_v4.html`. En cas de doute sur une couleur, un texte, une proportion — c'est le mockup qui tranche.**
