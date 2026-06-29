# TANREN — Evolution Physique Feature

> **For Claude Code.** Implementation of the body progress photo feature ("Évolution physique") in the Tanren mobile app. The work is organized into **5 batches** from foundation to polish. **Execute one batch at a time**, commit, ask for validation before moving to the next.
>
> **Reference design**: `/design/Tanren_Evolution_Mockups.html` (or wherever you placed the mockup file in the repo). All visual decisions, copy, spacing, and color choices come from there. **When in doubt, match the mockup pixel for pixel.**
>
> **Ground rules**:
> - Each batch is a separate PR / commit series
> - Never batch unrelated work
> - Run `npm run typecheck` and `npm run lint` after each significant change
> - If a task is already done (e.g. you find a similar pattern already implemented), reuse it and note this in the commit message
> - If you encounter ambiguity on UX or copy, STOP and ask. Do not guess.
> - Local-only feature: no API routes, no database tables, no backend changes
>
> **Stack context** (do not re-audit):
> - Expo SDK 55, RN 0.83.6, TypeScript 5.9.2 (mobile)
> - Custom `BottomSheetShell` (NOT `@gorhom/bottom-sheet`)
> - Zustand 5 for stores, MMKV planned in hardening Batch 3.1
> - Custom theme tokens (forge palette: `#E8192C` light, `#FF2D3F` dark, iron `#0A0A0A`/`#141414`)
> - Barlow Condensed for UI, JetBrains Mono for numerics, Noto Serif JP for kanji only
> - Brutalist rules: no `borderRadius` over 4px on buttons or 12px on modals, no shadows, accents via red borders only
> - Tutoiement throughout copy (informal "tu")
>
> **Hardening dependency**: this feature relies on MMKV (hardening Batch 3.1). If MMKV is not yet installed, install it as Task 1.1 below. If it is already installed, reuse the existing instance.

---

## Table of contents

- [Batch 1 — Foundation (1 day)](#batch-1--foundation-1-day)
- [Batch 2 — Capture flow (1 day)](#batch-2--capture-flow-1-day)
- [Batch 3 — Gallery screen (1 day)](#batch-3--gallery-screen-1-day)
- [Batch 4 — Comparator + share card (1.5 days)](#batch-4--comparator--share-card-15-days)
- [Batch 5 — Profile integration & polish (0.5 day)](#batch-5--profile-integration--polish-05-day)
- [Appendix — Post-launch backlog](#appendix--post-launch-backlog)

---

# Batch 1 — Foundation (1 day)

**Goal**: set up the storage layer, the data model, and the Zustand store. No UI yet.

## 1.1 · Verify MMKV is installed (or install it)

Check whether `react-native-mmkv` is already a dependency:

```bash
cd apps/mobile && npm ls react-native-mmkv
```

If not installed, run:

```bash
cd apps/mobile && npm install react-native-mmkv
cd ios && pod install
```

If `apps/mobile/src/lib/storage.ts` does not exist yet (it should after hardening Batch 3.1), create it:

```ts
// apps/mobile/src/lib/storage.ts
import { MMKV } from 'react-native-mmkv';

export const storage = new MMKV({
  id: 'tanren-default',
  encryptionKey: 'tanren-mmkv-key-v1',
});
```

**If the file exists already, do not modify it** — just import from it.

## 1.2 · Install image dependencies

```bash
cd apps/mobile && npx expo install expo-image-picker expo-file-system expo-media-library
```

- `expo-image-picker` — camera and gallery access
- `expo-file-system` — save and read photos from app sandbox
- `expo-media-library` — only used later for saving the share card to the user's gallery (Batch 4)

Update `app.json` with the required permissions:

```json
{
  "expo": {
    "plugins": [
      [
        "expo-image-picker",
        {
          "photosPermission": "Tanren a besoin d'accéder à tes photos pour ajouter une photo de progression depuis ta galerie.",
          "cameraPermission": "Tanren a besoin d'accéder à l'appareil photo pour prendre une photo de progression."
        }
      ],
      [
        "expo-media-library",
        {
          "photosPermission": "Tanren a besoin d'enregistrer la carte de progression dans ta galerie pour la partager.",
          "savePhotosPermission": "Tanren a besoin d'enregistrer la carte de progression dans ta galerie pour la partager.",
          "isAccessMediaLocationEnabled": false
        }
      ]
    ]
  }
}
```

**Verification**: `npx expo prebuild --clean` completes without errors. Permission strings are in French (tutoiement) per Tanren copy convention.

## 1.3 · Define the data model

Create `apps/mobile/src/types/progressPhoto.ts`:

```ts
export type PhotoAngle = 'front' | 'side' | 'back';

export type ProgressPhoto = {
  id: string;                   // uuid v4
  uri: string;                  // file:///.../progress/<id>.jpg
  takenAt: string;              // ISO date
  angle: PhotoAngle;
  weightKgSnapshot: number | null;  // frozen at capture time
  notes: string | null;         // max 200 chars
};

export const ANGLE_LABELS: Record<PhotoAngle, string> = {
  front: 'Face',
  side: 'Profil',
  back: 'Dos',
};
```

**Critical**: `weightKgSnapshot` is frozen at capture time. Even if the user later changes their weight, this value never recalculates — it preserves the historical context of the photo.

## 1.4 · Build the storage module

Create `apps/mobile/src/lib/progressPhotos.ts`:

```ts
import * as FileSystem from 'expo-file-system';
import * as Crypto from 'expo-crypto';
import { storage } from './storage';
import type { ProgressPhoto, PhotoAngle } from '../types/progressPhoto';

const STORAGE_KEY = 'progress-photos-v1';
const PHOTO_DIR = `${FileSystem.documentDirectory}progress/`;

async function ensureDir() {
  const info = await FileSystem.getInfoAsync(PHOTO_DIR);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(PHOTO_DIR, { intermediates: true });
  }
}

export const progressPhotos = {
  async list(): Promise<ProgressPhoto[]> {
    const raw = storage.getString(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  },

  async add(input: {
    sourceUri: string;
    angle: PhotoAngle;
    weightKgSnapshot: number | null;
    takenAt?: string;
    notes?: string;
  }): Promise<ProgressPhoto> {
    await ensureDir();

    const id = Crypto.randomUUID();
    const destUri = `${PHOTO_DIR}${id}.jpg`;

    await FileSystem.copyAsync({ from: input.sourceUri, to: destUri });

    const photo: ProgressPhoto = {
      id,
      uri: destUri,
      takenAt: input.takenAt ?? new Date().toISOString(),
      angle: input.angle,
      weightKgSnapshot: input.weightKgSnapshot,
      notes: input.notes ?? null,
    };

    const all = await this.list();
    all.push(photo);
    storage.set(STORAGE_KEY, JSON.stringify(all));

    return photo;
  },

  async remove(id: string): Promise<void> {
    const all = await this.list();
    const photo = all.find(p => p.id === id);
    if (!photo) return;

    try {
      await FileSystem.deleteAsync(photo.uri, { idempotent: true });
    } catch {
      // file already gone, ignore
    }

    const next = all.filter(p => p.id !== id);
    storage.set(STORAGE_KEY, JSON.stringify(next));
  },

  async updateNotes(id: string, notes: string | null): Promise<void> {
    const all = await this.list();
    const idx = all.findIndex(p => p.id === id);
    if (idx === -1) return;
    all[idx].notes = notes;
    storage.set(STORAGE_KEY, JSON.stringify(all));
  },

  async clear(): Promise<void> {
    const all = await this.list();
    for (const p of all) {
      try { await FileSystem.deleteAsync(p.uri, { idempotent: true }); } catch {}
    }
    storage.delete(STORAGE_KEY);
  },
};
```

**Why `Crypto.randomUUID`**: avoids the need for a separate uuid lib, already in Expo's SDK.

**Why we copy the file**: `expo-image-picker` returns a temp URI that may be cleaned up by the OS. Copying to our sandbox guarantees persistence.

## 1.5 · Build the Zustand store

Create `apps/mobile/src/stores/progressPhotosStore.ts`:

```ts
import { create } from 'zustand';
import { progressPhotos } from '../lib/progressPhotos';
import type { ProgressPhoto, PhotoAngle } from '../types/progressPhoto';

type ProgressPhotosState = {
  photos: ProgressPhoto[];
  isLoaded: boolean;

  load: () => Promise<void>;
  add: (input: Parameters<typeof progressPhotos.add>[0]) => Promise<ProgressPhoto>;
  remove: (id: string) => Promise<void>;
  updateNotes: (id: string, notes: string | null) => Promise<void>;

  // Derived selectors (called as functions, not subscribed)
  getByAngle: (angle: PhotoAngle | 'all') => ProgressPhoto[];
  getOldest: () => ProgressPhoto | null;
  getNewest: () => ProgressPhoto | null;
  getDeltaSinceFirst: () => { kg: number | null; days: number | null };
};

export const useProgressPhotosStore = create<ProgressPhotosState>((set, get) => ({
  photos: [],
  isLoaded: false,

  async load() {
    const photos = await progressPhotos.list();
    set({ photos, isLoaded: true });
  },

  async add(input) {
    const photo = await progressPhotos.add(input);
    set(state => ({ photos: [...state.photos, photo] }));
    return photo;
  },

  async remove(id) {
    await progressPhotos.remove(id);
    set(state => ({ photos: state.photos.filter(p => p.id !== id) }));
  },

  async updateNotes(id, notes) {
    await progressPhotos.updateNotes(id, notes);
    set(state => ({
      photos: state.photos.map(p => p.id === id ? { ...p, notes } : p),
    }));
  },

  getByAngle(angle) {
    const all = get().photos;
    if (angle === 'all') return all;
    return all.filter(p => p.angle === angle);
  },

  getOldest() {
    const all = [...get().photos];
    if (all.length === 0) return null;
    all.sort((a, b) => a.takenAt.localeCompare(b.takenAt));
    return all[0];
  },

  getNewest() {
    const all = [...get().photos];
    if (all.length === 0) return null;
    all.sort((a, b) => b.takenAt.localeCompare(a.takenAt));
    return all[0];
  },

  getDeltaSinceFirst() {
    const oldest = get().getOldest();
    const newest = get().getNewest();
    if (!oldest || !newest || oldest.id === newest.id) {
      return { kg: null, days: null };
    }

    const kg = (oldest.weightKgSnapshot != null && newest.weightKgSnapshot != null)
      ? Number((newest.weightKgSnapshot - oldest.weightKgSnapshot).toFixed(1))
      : null;

    const days = Math.floor(
      (new Date(newest.takenAt).getTime() - new Date(oldest.takenAt).getTime()) / 86400000
    );

    return { kg, days };
  },
}));
```

**Note on selectors**: the `getByAngle`, `getOldest`, `getNewest`, `getDeltaSinceFirst` are getter methods, not subscribed selectors. Components that need reactivity must use `useProgressPhotosStore(state => state.photos)` directly and compute their own filtered/sorted views.

## 1.6 · Load on app startup

In `apps/mobile/app/_layout.tsx`, after auth is resolved, trigger initial load:

```ts
useEffect(() => {
  useProgressPhotosStore.getState().load();
}, []);
```

If the file already has a similar pattern (e.g. exercise cache loading), match that pattern.

---

### Batch 1 commit sequence

```
feat(progress-photos): install expo-image-picker, expo-file-system, expo-media-library
feat(progress-photos): define ProgressPhoto type and angle labels
feat(progress-photos): MMKV-backed storage module with file persistence
feat(progress-photos): Zustand store with derived selectors
chore(progress-photos): load photos on app startup
```

**STOP HERE** — manually verify that you can call `useProgressPhotosStore.getState().add(...)` from a debug screen and that the photo persists across app reloads. Then proceed to Batch 2.

---

# Batch 2 — Capture flow (1 day)

**Goal**: ship the modal that lets the user add a photo. No gallery or comparator yet.

## 2.1 · First-launch consent banner

Before the user can add their first photo, they must see and dismiss a one-time disclaimer.

Add a new MMKV key:

```ts
// apps/mobile/src/lib/progressPhotosConsent.ts
import { storage } from './storage';

const KEY = 'progress-photos-consent-v1';

export const progressPhotosConsent = {
  hasAcknowledged(): boolean {
    return storage.getBoolean(KEY) ?? false;
  },
  acknowledge(): void {
    storage.set(KEY, true);
  },
};
```

Create `apps/mobile/src/components/ProgressPhotos/FirstLaunchConsent.tsx`:

```tsx
// Brand-styled bottom-sheet using BottomSheetShell
// Title: "Tes photos restent locales"
// Body (paraphrase, do not quote verbatim):
//   - Stockées uniquement sur ton téléphone
//   - Jamais envoyées à nos serveurs
//   - Perdues si tu désinstalles l'app ou changes de téléphone
//   - Tu peux les supprimer à tout moment depuis la galerie
// CTA: "J'ai compris"
// On dismiss → progressPhotosConsent.acknowledge()
```

This bottom-sheet is shown once when the user taps "+ Ajouter" for the first time. Subsequent additions skip it.

**Verification**: tap "+ Ajouter" → consent appears. Acknowledge it. Restart the app, tap "+ Ajouter" again → consent does NOT reappear.

## 2.2 · Capture bottom-sheet

Create `apps/mobile/src/components/ProgressPhotos/CapturePhotoSheet.tsx`. Use the project's `BottomSheetShell`.

**Three steps inside the sheet**:

### Step A — Choose angle (radio segmented control)

```
[ FACE ]  [ PROFIL ]  [ DOS ]
```

Style: matches the angle filter pills from the gallery mockup (red active, outlined inactive). Default selection: `front`.

### Step B — Source picker

Two large tappable rows:

```
□  Prendre une photo                       ›
□  Choisir depuis la galerie               ›
```

On tap, call `expo-image-picker` with these options:

```ts
// Camera
const result = await ImagePicker.launchCameraAsync({
  mediaTypes: ImagePicker.MediaTypeOptions.Images,
  quality: 0.85,
  allowsEditing: true,
  aspect: [3, 4],
});

// Gallery
const result = await ImagePicker.launchImageLibraryAsync({
  mediaTypes: ImagePicker.MediaTypeOptions.Images,
  quality: 0.85,
  allowsEditing: true,
  aspect: [3, 4],
});
```

Handle permission denial gracefully — show a toast "Tanren a besoin de la permission pour accéder à l'appareil photo" and link to settings.

### Step C — Confirmation screen

After the user picks a photo, show:

- Preview of the photo (3:4 aspect ratio, full sheet width minus padding)
- Date field (default: today, tappable to open native date picker — must allow past dates only)
- Weight field (pre-filled from the most recent `weightEntry`, editable, numeric keyboard)
- Notes field (TextInput, max 200 chars, optional)
- "Annuler" / "Enregistrer" buttons

On "Enregistrer":

```ts
await useProgressPhotosStore.getState().add({
  sourceUri: pickedUri,
  angle: selectedAngle,
  weightKgSnapshot: weight,  // null if user cleared the field
  takenAt: selectedDate.toISOString(),
  notes: notes.trim() || undefined,
});
```

Then dismiss the sheet and show a brief toast "Photo ajoutée".

## 2.3 · Pre-fill weight from latest entry

The weight field in step C should default to the user's most recent weight entry. Read it from your existing weight store:

```ts
const latestWeight = useWeightStore(state => state.entries[0]?.weightKg ?? null);
```

If the user has never logged a weight, leave the field empty (and `weightKgSnapshot` will be null when saved). Do NOT block the flow.

## 2.4 · Hook the sheet to a debug entry point

For now, expose the sheet from a temporary debug button (e.g. a long-press on the avatar in Profile). This will be replaced by the real entry point in Batch 5.

**Verification**:
- Capture from camera → photo persists, appears in `useProgressPhotosStore.getState().photos`
- Capture from gallery → same
- Permission denial → toast, no crash
- Cancel mid-flow → no orphan files in `FileSystem.documentDirectory + 'progress/'`
- Restart app → photos still there

---

### Batch 2 commit sequence

```
feat(progress-photos): first-launch consent bottom-sheet
feat(progress-photos): capture bottom-sheet with angle picker
feat(progress-photos): camera and gallery source pickers
feat(progress-photos): confirmation step with date, weight, notes
chore(progress-photos): debug entry point for testing
```

**STOP HERE** — confirm capture works on both iOS and Android (camera permissions differ). Then proceed to Batch 3.

---

# Batch 3 — Gallery screen (1 day)

**Goal**: ship the main gallery view at `/profile/evolution`.

## 3.1 · Route and screen scaffold

Create `apps/mobile/app/profile/evolution/index.tsx`. Mirror the structure of `app/profile/weight.tsx` (your weight tracking screen) — same `Screen` wrapper, same `ScreenHeader` pattern with `‹ Back` and `+ Ajouter`, same kanji watermark (use `鍛`).

```tsx
<Screen showKanji kanjiChar="鍛">
  <ScreenHeader
    onBack={() => router.back()}
    title="Évolution"
    rightAction={
      <Pressable onPress={() => setCaptureSheetOpen(true)}>
        <Text style={{ color: tokens.accent, /* ... */ }}>+ Ajouter</Text>
      </Pressable>
    }
  />

  {photos.length === 0 ? (
    <EvolutionEmptyState onAdd={() => setCaptureSheetOpen(true)} />
  ) : (
    <EvolutionGallery photos={photos} />
  )}

  {captureSheetOpen && (
    <CapturePhotoSheet onClose={() => setCaptureSheetOpen(false)} />
  )}
</Screen>
```

## 3.2 · Empty state

Mirror the empty state of `weight.tsx` ("Aucune pesée pour le moment / Ajoute ta première pesée pour commencer le suivi").

```
[ small kanji watermark already on screen ]

       Aucune photo pour le moment

  Ajoute ta première photo pour commencer
        ton suivi visuel.
```

No button — the "+ Ajouter" in the header is the entry point. This matches the pattern from `weight.tsx`.

## 3.3 · Stats strip (2 cells)

When at least one photo exists:

```
┌─────────────────────┬──────────────────────┐
│       12            │      −2,4 kg         │
│      PHOTOS         │   DEPUIS LE DÉBUT    │
└─────────────────────┴──────────────────────┘
```

Right cell uses `tokens.accent` for the value. If `getDeltaSinceFirst().kg` returns null (less than 2 photos OR missing weight on either end), show `—` instead of the number.

Reuse the existing `StatsStrip` component if you have one (e.g. from Profile landing or Weight screen). If not, create `apps/mobile/src/components/ProgressPhotos/EvolutionStatsStrip.tsx`.

## 3.4 · Compare CTA card

Visible only when `photos.length >= 2`.

```tsx
<Pressable
  onPress={() => router.push('/profile/evolution/compare')}
  style={{
    borderWidth: 1,
    borderColor: tokens.accent,
    padding: 13,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 22,
  }}
>
  {/* Two stacked thumbnails (oldest + newest) */}
  <View style={{ flexDirection: 'row', gap: 3 }}>
    <Image source={{ uri: oldest.uri }} style={{ width: 32, aspectRatio: 3/4 }} />
    <Image source={{ uri: newest.uri }} style={{ width: 32, aspectRatio: 3/4 }} />
  </View>

  <View style={{ flex: 1 }}>
    <Text style={/* h: 13, weight: 700, letterSpacing: 0.02 */}>
      Comparer & partager
    </Text>
    <Text style={/* h: 11, color: tokens.textDim */}>
      Avant / après en un tap
    </Text>
  </View>

  <Text style={{ color: tokens.accent, fontSize: 16 }}>›</Text>
</Pressable>
```

**When `photos.length === 1`**, replace this card with a sober non-tappable hint:

```
Ajoute une 2ème photo pour débloquer la comparaison
```

No border, no chevron, just a single line of `tokens.textDim` text.

## 3.5 · Angle filter pills

```
[ TOUT ]  [ FACE ]  [ PROFIL ]  [ DOS ]
```

Active state: red filled. Inactive: outlined `0.5px solid` with `tokens.textDim` color. Match exactly the mockup. State management with local `useState<'all' | PhotoAngle>('all')`.

## 3.6 · Photo grid by month

Group photos by `YYYY-MM` of `takenAt`, sort groups newest-first, sort photos within each group newest-first.

Each group has a header:

```
NOVEMBRE 2026 · 73,8 kg
```

The weight shown is the `weightKgSnapshot` of the **most recent** photo in that group. If no photo in the group has a weight, omit the `· 73,8 kg` part entirely.

Below each header, a 3-column grid of photos with `gap: 4`. Each cell:

- Aspect ratio 3:4
- `Image` filling the cell (use `expo-image` for caching, install if needed)
- Top-left: red `photo-tag` with the angle label (FACE / PROFIL / DOS)
- Bottom-left: white date `04 NOV` over a gradient mask
- On tap → open the photo detail (Batch 3.7)
- On long-press → confirm-and-delete dialog

## 3.7 · Photo detail screen

Create `apps/mobile/app/profile/evolution/[id].tsx`. Full-screen view of a single photo:

- Photo at full screen width, 3:4 aspect ratio
- Below: date, angle, weight (if any), notes (if any)
- Edit notes inline (taps opens a small bottom-sheet with TextInput + Enregistrer)
- "Supprimer" button at the bottom — destructive style (red text on transparent background, with confirmation modal: "Supprimer cette photo ? Cette action est définitive.")

## 3.8 · Use `expo-image` for thumbnails

If `expo-image` is not yet installed (it's planned for hardening Batch 5.2):

```bash
cd apps/mobile && npx expo install expo-image
```

Use it in the gallery and detail screens for built-in caching and faster loads:

```tsx
import { Image } from 'expo-image';
<Image source={photo.uri} style={...} contentFit="cover" transition={150} />
```

**Verification**:
- Gallery shows correct months and grouping
- Filters work (tapping FACE shows only front photos)
- Long-press deletes after confirmation
- Detail screen shows all metadata correctly
- Empty state appears when last photo is deleted

---

### Batch 3 commit sequence

```
feat(progress-photos): /profile/evolution route and screen scaffold
feat(progress-photos): empty state matching weight screen pattern
feat(progress-photos): 2-cell stats strip (count + delta)
feat(progress-photos): compare CTA card with conditional rendering
feat(progress-photos): angle filter pills
feat(progress-photos): photo grid grouped by month with weight context
feat(progress-photos): photo detail screen with edit and delete
chore(progress-photos): adopt expo-image for caching
```

**STOP HERE** — visual review against the mockup file. Confirm spacing, typography, and colors match before moving on.

---

# Batch 4 — Comparator + share card (1.5 days)

**Goal**: ship `/profile/evolution/compare` with the side-by-side view and the share-as-image flow.

## 4.1 · Comparator screen scaffold

Create `apps/mobile/app/profile/evolution/compare.tsx`. Watermark uses `錬` (the second kanji, marking this as the "discipline / refinement" screen).

The screen accepts optional query params `?before=<id>&after=<id>` for direct linking. If params are missing, default to `getOldest()` for before and `getNewest()` for after.

```tsx
const params = useLocalSearchParams<{ before?: string; after?: string }>();
const photos = useProgressPhotosStore(state => state.photos);

const beforeId = params.before ?? store.getOldest()?.id;
const afterId = params.after ?? store.getNewest()?.id;

const before = photos.find(p => p.id === beforeId) ?? null;
const after = photos.find(p => p.id === afterId) ?? null;
```

If either is null, redirect back to `/profile/evolution`.

## 4.2 · Compare card component

Create `apps/mobile/src/components/ProgressPhotos/CompareCard.tsx`. This component is reused inside the screen AND inside the share card capture (Batch 4.4).

Layout exactly as in the mockup:

```
┌────────────────────────────────────────┐
│  AVANT                          APRÈS  │
│  ┌──────────────┬──────────────────┐  │
│  │              │                  │  │
│  │   [photo]    │     [photo]      │  │
│  │              │                  │  │
│  │ FACE         │ FACE             │  │
│  │              │                  │  │
│  │ 07 sep 2026  │ 04 nov 2026      │  │
│  │ 76,2 kg      │ 73,8 kg          │  │
│  └──────────────┴──────────────────┘  │
│                                        │
│  ──────────────────────────────────── │
│      58 jours    │    −2,4 kg          │
│       ÉCART      │   DELTA POIDS       │
└────────────────────────────────────────┘
```

Props:

```ts
type CompareCardProps = {
  before: ProgressPhoto;
  after: ProgressPhoto;
  showWeight?: boolean;       // default true
  variant?: 'screen' | 'share';  // affects sizing
};
```

The `share` variant is used inside the share card (smaller paddings, no border, etc.). Same component, different props.

## 4.3 · Photo swap flow

Below the compare card, show the "Changer les photos" zone with two square thumbs (avant + après). Each is tappable.

On tap → open a bottom-sheet showing all photos in a 3-column grid. User picks one, sheet closes, comparator updates (router.replace with new query params).

This re-uses the same `PhotoGrid` component as Batch 3.6, with selection mode enabled.

## 4.4 · Share card composition

This is the highest-leverage piece of the feature. The share card is rendered as a hidden `View`, captured to PNG via `react-native-view-shot`, then handed to `expo-sharing`.

Install:

```bash
cd apps/mobile && npx expo install react-native-view-shot expo-sharing
```

Create `apps/mobile/src/components/ProgressPhotos/ShareCard.tsx`. The component renders the exact composition shown in the mockup (écran 04):

```tsx
<View ref={cardRef} collapsable={false} style={{
  width: 1080,
  height: 1920,
  backgroundColor: variant === 'dark' ? '#000' : '#FFF',
  padding: 80,
  // ... see mockup for exact layout
}}>
  {/* Logo mark + handle */}
  {/* Before/after grid with date + weight */}
  {/* Days + delta block (large) */}
  {/* Mantra "Une rep / après l'autre" + 鍛錬 + @tanrenapp */}
</View>
```

**Critical sizing**: the View is 1080×1920px in JS dimensions. Use absolute pixel sizes (not relative units) for everything inside, so the captured PNG matches the design pixel-for-pixel. Wrap it in a parent `<View style={{ position: 'absolute', left: -9999, top: 0 }}>` so it renders off-screen but still in the layout tree.

**Typography note**: Barlow Condensed must be loaded as a font asset. If your app doesn't already load it as a custom font (it should, given the brand), do this in `_layout.tsx` with `expo-font`. Same for Noto Serif JP.

## 4.5 · Share trigger and capture

Add the bottom panel to the comparator screen with three rows:

- "Inclure le poids" — toggle (default on)
- "Watermark Tanren" — toggle (default on, locked: see note below)
- "Format" — segmented `9:16` / `1:1`

Plus the big red "Partager" button at the bottom.

**Note on watermark toggle**: per brand strategy, the watermark is the entire point of social sharing (acquisition). Make the toggle visually present but disable it for V1 — show it as "always on", greyed-out interaction. Add a hint "Aide-nous à faire connaître Tanren." This avoids the design overhead of a no-watermark variant while still signaling that we considered the user's autonomy.

If you'd rather make it functional from V1, just respect the toggle state in the ShareCard render.

On "Partager" tap:

```ts
import { captureRef } from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';

const uri = await captureRef(cardRef, {
  format: 'png',
  quality: 1,
  result: 'tmpfile',
  width: format === '9:16' ? 1080 : 1080,
  height: format === '9:16' ? 1920 : 1080,
});

if (await Sharing.isAvailableAsync()) {
  await Sharing.shareAsync(uri, {
    mimeType: 'image/png',
    dialogTitle: 'Partager ma progression',
  });
}
```

For the 1:1 variant, the ShareCard component must render a different internal layout (wider, shorter). Pass `format` as a prop and switch layouts.

## 4.6 · Share card content rules

These are non-negotiable per brand:

- **Logo**: Forge-Spark Mark in top-left (NOT the dumbbell).
- **Handle**: `@tanrenapp` in top-right, letter-spacing 0.32em.
- **Mantra**: "Une rep" white + "après l'autre" red, two lines, centered.
- **Kanji**: 鍛 錬 in red, letter-spacing 0.32em, below the mantra.
- **Domain**: `@tanrenapp` repeated below the kanji, very small (8px effective), opacity 0.4. This serves as a fallback if someone screenshots the card without context.
- **No personal info**: never include the user's name or email on the share card. Only weights and dates.

**Verification**:
- Capture the share card → opens native share sheet
- Pick "Save to photos" → image appears in iOS Photos / Android Gallery at correct resolution
- Pick "Instagram Stories" → opens IG with the image pre-loaded
- 1:1 variant looks correct in IG feed preview
- 9:16 variant looks correct in IG / TikTok story preview

---

### Batch 4 commit sequence

```
feat(progress-photos): /compare route with auto-selection
feat(progress-photos): CompareCard component with deltas
feat(progress-photos): photo swap flow via bottom-sheet
feat(progress-photos): ShareCard component pixel-locked to 1080×1920
feat(progress-photos): share trigger with view-shot + expo-sharing
feat(progress-photos): 1:1 variant of share card
```

**STOP HERE** — actually share to your own Instagram and TikTok. Confirm the card looks crisp on a real phone screen, that the watermark is readable, and that the proportions are right. This is a brand-defining moment, do not skip the manual QA.

---

# Batch 5 — Profile integration & polish (0.5 day)

**Goal**: wire the feature into the Profile screen and ship final touches.

## 5.1 · Add the row in Profile

Open `apps/mobile/app/(tabs)/profile.tsx` (or wherever the Profile landing lives). Find the PERSONNEL section (it currently contains Prénom, Taille, Poids).

Add a new row right after Poids:

```tsx
<ProfileRow
  label="Évolution physique"
  value={`${photoCount} ${photoCount === 1 ? 'photo' : 'photos'}`}
  onPress={() => router.push('/profile/evolution')}
  isNew={!hasSeenEvolutionFeature}
/>
```

The row must:

- Match exactly the visual style of the existing rows (Prénom, Taille, Poids)
- Show a subtle red background (`rgba(255,45,63,0.06)` dark / `rgba(232,25,44,0.05)` light) and a "NEW" red pill badge as long as the user hasn't tapped it once
- Once tapped, persist `hasSeenEvolutionFeature: true` in MMKV and remove both the background and the badge

## 5.2 · "NEW" pill badge logic

```ts
// apps/mobile/src/lib/featureSeen.ts
import { storage } from './storage';

export const featureSeen = {
  has(key: string): boolean {
    return storage.getBoolean(`feature-seen-${key}`) ?? false;
  },
  mark(key: string): void {
    storage.set(`feature-seen-${key}`, true);
  },
};
```

In the Profile screen:

```ts
const [hasSeenEvolution, setHasSeenEvolution] = useState(featureSeen.has('evolution'));

// On row tap:
if (!hasSeenEvolution) {
  featureSeen.mark('evolution');
  setHasSeenEvolution(true);
}
router.push('/profile/evolution');
```

## 5.3 · Replace the debug entry point

Remove the long-press hack from Batch 2.4. The Profile row is now the canonical entry point.

## 5.4 · Remove orphan files cleanup job

Add a defensive cleanup that runs once on app startup, after the store is loaded. If any file in `progress/` directory is not referenced by a photo entry in MMKV, delete it. This prevents disk leaks in case a previous version had bugs.

```ts
// apps/mobile/src/lib/progressPhotos.ts (add this)
async cleanupOrphans(): Promise<number> {
  const dir = `${FileSystem.documentDirectory}progress/`;
  const info = await FileSystem.getInfoAsync(dir);
  if (!info.exists) return 0;

  const files = await FileSystem.readDirectoryAsync(dir);
  const all = await this.list();
  const referencedFilenames = new Set(all.map(p => p.uri.split('/').pop()));

  let removed = 0;
  for (const f of files) {
    if (!referencedFilenames.has(f)) {
      await FileSystem.deleteAsync(`${dir}${f}`, { idempotent: true });
      removed++;
    }
  }
  return removed;
}
```

Call it once on app startup, in dev mode log the count, in production stay silent.

## 5.5 · Add to BACKLOG.md

Append to the backlog file:

```markdown
## Evolution Photos (V1.1+)

- Push notification: "Ça fait 35 jours depuis ta dernière photo"
- Export all photos as ZIP with metadata JSON
- Cloud backup opt-in (encrypted, paid feature)
- Photo annotation (draw arrows / measurements over photos)
- Body part overlays (chest, arms, etc. with corresponding measurements)
- Animated before/after as MP4 for TikTok
```

## 5.6 · Update CLAUDE.md

Add a section under "Features" documenting the Evolution Photos feature, its local-only nature, and its lack of backend dependencies. Note explicitly that no DB tables, no API routes, no Drizzle schemas exist for this feature — it's intentional.

---

### Batch 5 commit sequence

```
feat(progress-photos): integrate row in Profile PERSONNEL section
feat(progress-photos): NEW pill badge with one-time MMKV flag
chore(progress-photos): remove debug entry point
feat(progress-photos): orphan files cleanup on startup
docs: add Evolution Photos to BACKLOG.md and CLAUDE.md
```

**COMPLETE** — feature is shippable. Ready for TestFlight.

---

# Appendix — Post-launch backlog

The following are intentionally deferred. Do not attempt during V1.

## V1.1 (after first 100 photos created)

- **Reminder**: a soft in-app banner "Ça fait 35 jours depuis ta dernière photo" on the home screen if the user hasn't logged a photo in 30+ days. NOT a push notification — too intrusive for V1.
- **Export ZIP**: all photos + a `metadata.json` describing dates, angles, weights. Use `expo-sharing` to hand off the ZIP.
- **Photo replacement**: let the user replace a photo without losing its date / weight metadata.

## V1.2 (cloud backup, paid)

- Encrypted cloud backup via S3/R2 with AES-256 client-side. Per-user encryption key derived from a passphrase.
- Triggers an SECURITY.md update following the AES key rotation pattern from hardening Batch 1.5.
- Multi-device sync.

## V2 (advanced)

- Body part annotations (draw arrows, measurements)
- Animated MP4 export of progression timeline
- Optional ML-based pose alignment (so before/after photos match angle even when slightly off)
- Tags and custom albums

## Privacy hardening (if user demand emerges)

- Face ID / passcode required to enter the gallery (`expo-local-authentication`)
- Blur preview by default with tap-to-reveal
- "Hide from screenshots" flag using `expo-screen-capture`

---

## How to work through this document

**Per batch**:
1. Read the full batch before starting
2. Verify the dependencies from the previous batch are merged
3. Execute tasks in the order listed — they build on each other
4. Run `npm run typecheck` after every significant change
5. Run the app on iOS AND Android (camera permissions differ)
6. Commit in the sequence shown at the end of the batch
7. Push to a feature branch, open PR, wait for user validation

**If you get stuck**:
- Missing context? Read the mockup file `Tanren_Evolution_Mockups.html` first
- Ambiguous UX? Stop and ask, don't guess on copy or visual style
- Unexpected breaking change in dependencies? Commit what works, flag the issue, propose alternatives

**Do not**:
- Combine multiple batches into one PR
- Skip the stop points — they exist for visual QA
- Add backend code (no API routes, no DB tables, this feature is local-only)
- Use `@gorhom/bottom-sheet` — use the existing custom `BottomSheetShell`
- Diverge from the mockup file without explicit user approval

---

*Forge it. Ship it. Share it.*

*Tanren · Une rep après l'autre.*
