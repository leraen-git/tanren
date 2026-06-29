# TANREN — Récapitulatif des changements graphiques

> **Objet** : liste exhaustive des modifications apportées à la charte graphique pendant la session de design. Chaque changement est documenté avec **l'avant, l'après, et le raisonnement**.
>
> **Pour Claude Code** : si tu appliques cette charte à du code existant qui reflète une version antérieure, ce document te dit précisément ce qui doit être mis à jour.

---

## Liste des 9 changements

| # | Zone | Nature |
|---|---|---|
| 1 | Macros (Nutrition/Diet) | Code couleur 3 couleurs ajouté |
| 2 | Meal cards | Border gauche rouge + titre agrandi |
| 3 | Tab bar du bas | Passage de 4 à 5 onglets (ajout Diet) |
| 4 | Groupes musculaires | Wrap grid → scroll horizontal |
| 5 | Plan Builder | Refonte complète (toggles supprimés) |
| 6 | Rest Timer | Layout contrôles retravaillé |
| 7 | Active Workout | Bouton "Valider la série" repositionné |
| 8 | Numéros de liste | Kanji japonais → chiffres arabes |
| 9 | Share Card | Titre = nom séance (plus "Séance terminée") |

---

## Changement 1 — Macros colorées (Nutrition + Diet)

### Avant

Les 3 macros (Protéines, Glucides, Lipides) partageaient la même couleur texte et la même couleur de bordure.

```tsx
// Pattern avant
<View style={{ borderColor: theme.border }}>
  <Text style={{ color: theme.text }}>Protéines</Text>
  <Text style={{ color: theme.text, fontWeight: '900' }}>185g</Text>
</View>
```

Problème : le user devait lire le label pour identifier le macro. En scan rapide, impossible de distinguer.

### Après

Chaque macro a sa couleur distincte, appliquée à la fois sur la **valeur numérique** ET sur la **bordure du container** :

- **Protéines = rouge accent** (`#E8192C` light / `#FF2D3F` dark)
- **Glucides = ambre** (`#D98E00` light / `#E8A900` dark)
- **Lipides = vert** (`#1A7F2C` light / `#2BAE43` dark)

```tsx
// Pattern après
<View style={{ borderColor: macroColors.protein }}>
  <Text style={{ color: theme.textMute }}>Protéines</Text>
  <Text style={{ color: macroColors.protein, fontWeight: '900' }}>185g</Text>
</View>
```

### Où appliquer

- `MacroRow` component (3 cellules colorées)
- `MacrosInline` component (pills colorés dans les meal cards)
- Partout où les macros P/G/L sont affichés (Home Nutrition, Diet tab, Recipe modal, Session Preview si pertinent)

### Raisonnement

Standard dans les apps nutrition sérieuses (MacroFactor, Cronometer, RP Strength). Le scan visuel des macros doit être instantané — les couleurs rouges/ambre/vert sont universellement associées à "important/modéré/calme" dans la culture occidentale, et le mapping P=important (rouge), G=énergie (ambre), L=stable (vert) reflète leur priorité en musculation.

Le rouge pour les protéines réutilise la couleur accent de la marque — pas d'introduction de nouvelle couleur. Les semantic colors vert/ambre étaient déjà définies pour up/flat/down.

---

## Changement 2 — Meal cards avec border gauche rouge + titre agrandi

### Avant

Meal cards plates avec titre en 14px regular weight.

```tsx
// Pattern avant
<View style={{
  padding: 12,
  borderWidth: 1,
  borderColor: theme.border,
}}>
  <Text style={{ fontSize: 10, color: theme.accent }}>PETIT-DÉJ</Text>
  <Text style={{ fontSize: 14, fontWeight: '400' }}>Porridge banane</Text>
  <MacrosInline ... />
</View>
```

Problème : meal cards trop invisibles dans la liste. Le user passait à côté de "son repas du jour" sans le remarquer.

### Après

Meal cards avec **border-left rouge 3px** (signature visuelle) et **nom du repas en 17px Black weight MAJUSCULE**.

```tsx
// Pattern après
<View style={{
  padding: 14,
  paddingLeft: 16,
  borderWidth: 1,
  borderColor: theme.border,
  borderLeftWidth: 3,
  borderLeftColor: theme.accent,
}}>
  <Text style={{ fontSize: 10, color: theme.accent }}>PETIT-DÉJ</Text>
  <Text style={{
    fontSize: 17,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 0.17,
  }}>Porridge banane</Text>
  <MacrosInline ... />
</View>
```

### Où appliquer

- `MealCard` component (Home Nutrition, Diet tab)
- Recipe modal header (même traitement visuel)

### Raisonnement

Reprend le pattern "day-theme block" déjà existant dans l'app (bordure rouge à gauche). Consistance avec le language visuel existant. Le titre en 17px Black est une augmentation de +21% vs 14px, suffisamment notable pour changer la hiérarchie sans déborder de l'espace.

---

## Changement 3 — Tab bar du bas : 4 → 5 onglets

### Avant

Tab bar à 4 onglets : Home · Séances · Historique · Profil

La nutrition n'avait pas de tab dédiée — elle était une sous-tab de Home (Entraînement/Nutrition), invisible au premier coup d'œil.

### Après

Tab bar à **5 onglets** : **Home · Training · Historique · Diet · Profil**

Changements :
- "Séances" renommée en "Training" (anglicisme conscient, pour cohérence de marque)
- Nouvel onglet "Diet" ajouté (icône bouclier-cœur, similaire Apple Health)

### Où appliquer

- `TabBar` component (la 5-tabs structure)
- Tous les écrans qui affichent la tab bar (Home, Workouts, History, Diet, Profile, Library list, Explore)

### Raisonnement

Le différenciateur #1 de Tanren vs Hevy/Strong est **"Training + Nutrition en une seule app"**. Si la nutrition est cachée 2 niveaux profond, le user ne la trouve jamais et se plaint que l'app "fait que du training". Une tab dédiée rend le feature aussi proéminent que son rôle dans le pitch marketing.

"Training" au lieu de "Séances" : choix de marque. Tanren vise une identité moderne, et "training" est universellement compris en français gym (on dit "je vais au training", pas "je vais à mes séances"). Alignement avec l'esprit bro-gym sérieux.

---

## Changement 4 — Groupes musculaires : wrap grid → scroll horizontal

### Avant

Les muscle group chips dans Workout Builder s'affichaient en grille flex-wrap, créant 2-3 lignes de chips.

```tsx
// Pattern avant (grid wrap)
<View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
  {muscleGroups.map(group => <MuscleChip ... />)}
</View>
```

Problème : les chips cassaient la hiérarchie verticale du formulaire. L'utilisateur perdait de vue les champs suivants (nom de séance, durée, exercices).

### Après

Muscle group chips en **ScrollView horizontal**, restant sur une seule ligne scrollable.

```tsx
// Pattern après (horizontal scroll)
<ScrollView
  horizontal
  showsHorizontalScrollIndicator={false}
  contentContainerStyle={{ gap: 6, paddingBottom: 4 }}
>
  {muscleGroups.map(group => <MuscleChip ... />)}
</ScrollView>
```

### Où appliquer

- Workout Builder — muscle group selection
- History tab — filter chips (période + muscle)
- Exercise Library — filter chips
- Plan Builder — day selection chips

### Exception (volontaire)

Les **intake forms** (Diet Intake "repas préférés") gardent le flex-wrap grid. Raison : les items sont user-generated et non-bornés, un scroll horizontal deviendrait illisible avec 15+ items.

### Raisonnement

Le scroll horizontal garde la hauteur de l'écran compacte et prévisible. L'utilisateur comprend naturellement "il y a plus à droite" (indicateur universel). Sur mobile, c'est le pattern natif iOS (voir Apple Music categories, App Store stories).

---

## Changement 5 — Plan Builder : refonte complète (toggles supprimés)

### Avant

Pour chaque jour de la semaine (Lun → Dim), une row avec :
- Label jour à gauche
- Workout picker au milieu (ou "Choisir une séance" si vide)
- **Toggle on/off à droite** pour activer/désactiver le jour

Visuellement, 7 rows empilées avec toggles. Pour un jour de repos, la row existait mais était désactivée.

### Après

Deux blocs distincts :

**Block 1 — "Jours d'entraînement"**
Chips jours scrollables horizontalement : `Lun` `Mar` `Mer` `Jeu` `Ven` `Sam` `Dim`
Tap pour toggle l'état `selected` (bg accent quand selected).

**Block 2 — "Séance par jour"**
Liste de rows, **une seulement par jour sélectionné**. Chaque row contient :
- Day tag à gauche (ex: "Lun", accent uppercase)
- Nom de la séance (ou "Choisir une séance" italique si vide)
- Chevron ›

Les jours non-sélectionnés **n'apparaissent pas** dans Block 2. Absence = jour de repos. Pas de placeholder "Repos" UI.

### Où appliquer

- Plan Builder screen (`/design/Tanren_Lot3_Creation_Diet.html` section 07)

### Raisonnement

Le design précédent avait **2 contrôles** pour la même chose (le toggle + "Choisir une séance") — confusion cognitive. Les toggles étaient aussi redondants avec l'action de tap sur la row.

Le nouveau design sépare cleanly les **deux décisions** :
1. "Quels jours je m'entraîne ?" → Chips (décision rapide, binary)
2. "Quelle séance je fais ?" → Liste d'assignation (décision détaillée, par jour actif)

Cohérence avec le pattern muscle groups chips (Changement 4). L'utilisateur apprend une fois le pattern "chips scrollables = sélection multiple" et le réutilise partout.

---

## Changement 6 — Rest Timer : layout contrôles retravaillé

### Avant

4 boutons alignés horizontalement en grille 4 colonnes :
`[-15s] [+15s] [⏸] [Skip]`

Plus en dessous une note : "Tu peux quitter l'app, on te notifiera à la fin du repos."

Problèmes :
- Le bouton Skip (rouge) était de même taille que -15s/+15s, donnant une hiérarchie égale alors que Skip est destructif
- Le bouton Pause était peu utile en pratique (les users laissent le timer tourner)
- La note sur le background running était inutilement prescriptive — les users n'ont pas besoin qu'on leur dise que l'app fonctionne en background

### Après

Layout en 2 rows :

**Top row** : `[−15s]` `[+15s]` + `⏸` (petit carré 48×48)
- `−15s` et `+15s` sont grands (font 16px, padding 18px)
- `⏸` est un **petit carré 48×48** en secondary action (color textMute)

**Bottom row** : `PASSER` en pleine largeur, bg accent, uppercase, font 15px

**Note background supprimée** — l'app tourne en background, c'est le comportement attendu.

```tsx
<View style={{ gap: 8 }}>
  <View style={{
    display: 'grid',
    gridTemplateColumns: '1fr 1fr 48px',
    gap: 8,
  }}>
    <Button variant="outline" size="lg">−15s</Button>
    <Button variant="outline" size="lg">+15s</Button>
    <Button variant="outline" size="sm" style={{ width: 48, height: 48 }}>⏸</Button>
  </View>
  <Button variant="primary" size="lg">Passer</Button>
</View>
```

### Où appliquer

- Rest Timer screen (`/design/Tanren_Core_Flow_v2.html` section 11)

### Raisonnement

Hiérarchie visuelle = hiérarchie d'usage. Les actions principales (ajuster le temps de repos) sont physiquement plus grandes. L'action rare (pause) est physiquement plus petite. L'action destructive (passer le repos entièrement) est séparée sur sa propre ligne pour éviter les tap accidentels.

Suppression de la note : les users modernes savent que les apps tournent en background. La mentionner = insultant pour leur intelligence, et pollution visuelle pour 100% des sessions.

---

## Changement 7 — Active Workout : bouton "Valider la série" repositionné

### Avant

Le bouton "Valider la série" avait `marginTop: auto`, ce qui le poussait au fond de l'écran, loin du VolumeFeedback.

```tsx
// Pattern avant
<View>
  <SetField />
  <VolumeFeedback />
  <View style={{ flex: 1 }} /> {/* spacer qui pousse tout en bas */}
  <Button variant="primary">Valider la série</Button>
</View>
```

Problème : pour valider la série, le user devait scroller/tendre le pouce vers le bas de l'écran. Action fréquente et rapide → devait être proche des inputs.

### Après

Le bouton est placé **immédiatement après** le VolumeFeedback avec `marginTop: 16px`. Un spacer flex-1 est ajouté en dessous pour pousser éventuellement du contenu secondaire.

```tsx
// Pattern après
<View>
  <SetField />
  <VolumeFeedback />
  <Button variant="primary" style={{ marginTop: 16 }}>
    Valider la série
  </Button>
  <View style={{ flex: 1 }} /> {/* spacer après le bouton */}
</View>
```

### Où appliquer

- Active Workout screen (`/design/Tanren_Core_Flow_v2.html` section 10)

### Raisonnement

**Fitts's Law** : la distance au target + sa taille déterminent la vitesse d'acquisition. En gym, tu as les mains humides/tremblantes, parfois des gants. Valider une série doit être un tap rapide et imprécis. Placer le bouton juste sous les inputs (SetField) garantit que le pouce reste dans la même zone.

Le bouton "fond d'écran" est un pattern web/desktop (CTA en bas de page) qui ne transfère PAS au mobile en contexte d'action répétée. Une Rep = un tap sur Valider = pas d'effort.

---

## Changement 8 — Numéros de liste : kanji japonais → chiffres arabes

### Avant

Dans plusieurs écrans, les numéros de liste étaient stylés en **Noto Serif JP** (font kanji) avec les caractères japonais :
- 一 二 三 四 五 (1, 2, 3, 4, 5 en japonais)

Usage dans :
- Session Preview (liste des exercices) → 一 二 三 四
- Recipe Modal (étapes de préparation) → 一 二 三 四 五
- Privacy screen (numérotation des sections) → 一 二 三
- Guest Upgrade (benefits) → 一 二 三
- Diet features (no-plan state) → 一 二 三 四

Problème : les kanji ressemblaient à de la décoration "samurai bullshit" et non à des numéros. Les users ne comprenaient pas instantanément l'ordre de lecture. Créait une cognitive load inutile.

### Après

Tous les numéros de liste sont en **chiffres arabes avec font Barlow Condensed Black** :
- `1` `2` `3` pour les listes courtes (exercices, étapes)
- `01` `02` `03` `04` pour les listes formelles (sections, features)

```tsx
// Pattern avant
<Text style={{ fontFamily: fonts.jpX, color: theme.accent }}>一</Text>

// Pattern après
<Text style={{
  fontFamily: fonts.sansX,
  color: theme.accent,
  letterSpacing: 0.02,
}}>01</Text>
```

### Kanji `鍛` et `錬` RESTENT dans l'app

Ils sont **réservés** à 4 usages spécifiques :
1. **Watermark corner** (top-right, opacity 4-5%) sur les écrans principaux
2. **Stamp header** (`鍛 錬` avec letter-spacing 0.4em) sur Recap, Privacy intro, Guest upgrade, Share card
3. **Accent inline** (petit 鍛 dans VolumeFeedback, CoachingTip)
4. **Hero visual** (kanji 鍛 géant dans AILoadingState)

### Où appliquer

Partout où des kanji 一 二 三 四 五 étaient utilisés comme numéros. Si tu en trouves, remplace par Barlow Condensed + chiffre arabe.

### Raisonnement

Le kanji Tanren 鍛錬 est un **ideogramme de marque** — il raconte l'histoire de "forger à travers l'entraînement répété". C'est puissant et évocateur.

Les chiffres japonais 一 二 三 sont juste des **numéros**. Ils n'ajoutent aucune valeur narrative. Utiliser la font kanji pour des numéros dilue la symbolique des vrais kanji de marque (鍛錬) et crée un look "anime stylé" qui ne correspond pas à l'identité brutaliste industrielle de Tanren.

Un chiffre arabe en Barlow Condensed Black accent rouge est **plus lisible**, **plus cohérent avec la typo de l'app**, et **préserve le poids symbolique** des vrais kanji.

---

## Changement 9 — Share Card v2 : titre = nom séance (plus générique "Séance terminée")

### Avant

Le Share Card utilisait **"Séance terminée"** comme titre principal, et le nom de la séance apparaissait en plus petit en dessous.

```
┌─────────────────────────────┐
│ 鍛 錬                       │
│ SÉANCE TERMINÉE             │  ← titre générique
│ Push Day                    │  ← nom réel de la séance en secondaire
│ Ven 18 avr · 1h12           │
│                             │
│   [ photo ]                 │
│                             │
│ Volume · Séries · Records   │
│                             │
│ TANREN         tanren.app   │
└─────────────────────────────┘
```

Problème : si 100 users partagent leur share card sur Instagram, 100 cards disent "SÉANCE TERMINÉE" en gros. Zéro différenciation, zéro story.

### Après

Le **nom de la séance devient le grand titre** (22px Black uppercase). "Séance terminée" est supprimé.

```
┌─────────────────────────────┐
│ 鍛 錬                       │
│ PUSH DAY                    │  ← nom réel en GRAND
│ Ven 18 avr · 1h12           │
│                             │
│   [ photo ]                 │
│                             │
│ ─────────────────────────── │
│ Volume   Séries   Records   │  ← stats sur UNE ligne
│ 12 450   18       2         │
│ ─────────────────────────── │
│ TANREN         tanren.app   │
└─────────────────────────────┘
```

Autres changements :
- Les stats sont sur **une seule ligne horizontale** (flex-row, space-between)
- Un fin divider au-dessus de la ligne stats
- La photo remplit tout le background avec un gradient overlay (transparent top → 55% black bottom)

### Où appliquer

- `ShareCard` component
- Share screen (`/design/Tanren_Core_Flow_v2.html` section 13)

### Raisonnement

Chaque share card devient **unique au user** :
- "PUSH DAY" (bro classique)
- "FULL BODY 5×5" (serious lifters)
- "BACK & BICEPS" (splitters)
- "SQUAT DAY" (powerlifters)

Quand un user partage sur Instagram, sa communauté voit immédiatement **quel type de training il fait**, créant de la différenciation et de l'engagement. "SÉANCE TERMINÉE" n'apporte aucune info, aucune émotion, aucune conversation.

Pour le user, c'est aussi plus gratifiant : "j'ai fait MA push day" vs "j'ai fait une séance". Le nom qu'il a choisi lui-même devient la fierté de son post.

---

## Récap visuel — points forts de la charte après ces 9 changements

1. **Hiérarchie nutrition instantanée** (macros colorées)
2. **Meal cards visibles** (border rouge + titre gros)
3. **Nutrition comme feature proéminent** (Diet tab dédiée)
4. **Formulaires compacts et prévisibles** (scroll horizontal)
5. **Plan Builder cognitivement simple** (2 blocs, pas de toggles)
6. **Rest Timer respectueux de l'intelligence du user** (pas de notes inutiles, hiérarchie claire)
7. **Active Workout optimisé pour l'action répétée** (bouton à portée de pouce)
8. **Identité de marque préservée** (kanji 鍛錬 réservés aux bons endroits)
9. **Share card comme vecteur viral** (titre unique par user)

---

## Pour Claude Code : comment utiliser ce document

Ce document est un **diff human-readable** des changements de charte. Il complémente le prompt principal (`CLAUDE_Charter_Application.md`) qui lui décrit l'état cible final.

**Si tu appliques à du code existant qui date d'avant ces changements** :
1. Lis ce document pour comprendre ce qui a changé
2. Identifie les patterns qui matchent l'état "Avant" dans la codebase actuelle
3. Remplace-les par l'état "Après"
4. Référence les mockups HTML dans `/design/` pour le pixel-level target

**Si tu construis from scratch** :
- Ce document n'est pas prioritaire, suis directement le prompt principal
- Mais lis la section "Raisonnement" de chaque changement — ça t'aide à ne pas reproduire ces erreurs

---

*Tanren · Une rep après l'autre.*
