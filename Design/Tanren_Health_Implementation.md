# TANREN — Health Integration Implementation v2

> **For Claude Code.** Strictly aligned with `Tanren_Health_Mockup.html` v2. Implements Health Connect (Android) FIRST, then Apple HealthKit (iOS) once the Apple Developer account is active. The 2 platforms are gated by clear pre-requisites.
>
> **Total effort**: ~2 days for Android (Phases 0-3), +2 days for iOS (Phases 4-5).
>
> **Ground rules**:
> - **Phase 0 is mandatory** — read existing systems before any code change
> - Real device testing required (Health Connect needs Play Services + Health Connect app; HealthKit needs paid signing)
> - One logical fix = one commit
> - Run `npx tsc -b --noEmit` after every significant change

---

## Critical pre-requisites

### iOS — BLOQUANT pour Phase 4-5

- ✅ Compte **Apple Developer Program payant** ($99/an) souscrit
- ✅ HealthKit capability activée dans App Store Connect → Identifiers → bundle ID → Capabilities
- ✅ Provisioning profile inclut HealthKit
- ✅ Test device iOS physique disponible (HealthKit ne fonctionne pas sur Simulator)

**Si l'un de ces points n'est pas validé, n'attaque pas Phase 4. L'utilisateur t'a indiqué "souscription cette semaine" — attends sa confirmation.**

### Android — Démarrable immédiatement

- ✅ Test device Android physique recommandé (Health Connect peut fonctionner sur emulateur récent avec Play Services, mais c'est fragile)
- ✅ Health Connect app installée sur le device de test (pré-installé sur Android 14+, sinon Play Store)

---

## Architecture overview

```
HealthPermissionModal.tsx   ──┐
ConnexionsScreen.tsx        ──┼──> useHealth() ──> getHealthService()
                              │                          │
                              │              ┌───────────┴───────────┐
                              │              ↓                       ↓
                              │       iOS (Phase 4)            Android (Phase 1-3)
                              │       @kingstinct/             react-native-
                              │       react-native-healthkit   health-connect
                              │
useTheme() (existing) ────────┘ (consumed by all UI components)
```

### Files to create (all phases)

```
apps/mobile/plugins/
└── with-public-import-expo.ts             # Phase 0 (preserve AppDelegate fix)

apps/mobile/src/services/health/
├── index.ts                                # Phase 1 (Platform dispatcher)
├── types.ts                                # Phase 1
├── android.ts                              # Phase 1
├── ios.ts                                  # Phase 4 (after Apple account ready)
└── tanrenWorkoutMapper.ts                  # Phase 1

apps/mobile/src/hooks/
└── useHealth.ts                            # Phase 1

apps/mobile/src/components/
└── HealthPermissionModal.tsx               # Phase 2

apps/mobile/app/profile/
└── connexions.tsx                          # Phase 3
```

---

# Phase 0 — Foundation (read before code) (1-2h)

**Goal**: read existing systems, prepare native scaffolding without losing past customizations.

## 0.1 · Theme system — pre-validated path and shape

**The app's theme system is at `apps/mobile/src/theme/ThemeContext.tsx`.**

`useTheme()` returns:

```ts
{
  tokens: {
    bg: string
    text: string
    textDim: string
    textMute: string
    textGhost: string
    accent: string
    green: string
    amber: string
    surface1: string
    surface2: string
    border: string
    borderStrong: string
    overlay: string
    // ... possibly more — verify by reading the file
  }
  fonts: { /* font family map */ }
  isDark: boolean
  scheme: 'dark' | 'light'
}
```

**Import path used everywhere**: `@/theme/ThemeContext`.

Open the file once to confirm exact token names — if a token name in this prompt's code (e.g., `tokens.surface1`) doesn't match the actual export, adapt to the real name. Don't invent new tokens.

```bash
# Verification step — read once, confirm shape
cat apps/mobile/src/theme/ThemeContext.tsx | head -80
```

If a needed token doesn't exist (e.g., `overlay` for the modal backdrop), **add it to the existing tokens map** rather than creating a parallel system. Stay consistent with the rest of the app.

## 0.2 · Create the config plugin to preserve `public import Expo`

The previous flicker fix added `public import Expo` to `AppDelegate.swift`. `expo prebuild --clean` would wipe this. Solution: a config plugin that re-applies it at build time.

**File**: `apps/mobile/plugins/with-public-import-expo.ts`

```ts
import { ConfigPlugin, withAppDelegate } from 'expo/config-plugins'

/**
 * Preserves the Swift 6 `public import Expo` fix across `expo prebuild` runs.
 *
 * Without this plugin, prebuild would reset AppDelegate.swift to the default
 * `import Expo`, breaking the iOS build under Swift 6 strict access levels.
 */
const withPublicImportExpo: ConfigPlugin = (config) => {
  return withAppDelegate(config, (cfg) => {
    if (cfg.modResults.contents.startsWith('public import Expo')) {
      return cfg
    }
    cfg.modResults.contents = cfg.modResults.contents.replace(
      /^import Expo/m,
      'public import Expo'
    )
    return cfg
  })
}

export default withPublicImportExpo
```

Reference it in `app.json`:

```json
{
  "expo": {
    "plugins": [
      "./plugins/with-public-import-expo.ts"
    ]
  }
}
```

## 0.3 · Audit native customizations BEFORE prebuild

`expo prebuild --clean` regenerates native scaffolding and **wipes any manual edit** outside what config plugins re-apply. The Phase 0.2 plugin only restores `AppDelegate.swift`. Other native customizations would be silently lost.

### Steps

```bash
# 1. List all commits that have touched native folders
git log --oneline -30 -- ios/ android/

# 2. Snapshot current native state
git status ios/ android/
git diff HEAD ios/ android/

# 3. Identify any custom files outside the standard scaffolding:
find ios/Tanren -name "*.swift" -o -name "*.h" -o -name "*.m" | grep -v "Pods\|build"
find android/app/src/main -type f | grep -v "build"
```

### What to report

For each custom file found, identify:
- **Type of customization** (Info.plist key, AndroidManifest entry, custom Swift class, etc.)
- **Whether it's already covered by a config plugin** (look in `app.json` plugins)
- **If not covered**, document it in a new file `apps/mobile/NATIVE_CUSTOMIZATIONS.md`

### Decision

- **All customizations covered by plugins or by app.json config** → safe to proceed with prebuild
- **Some customizations not covered** → STOP. Either create config plugins for them, or skip Phase 1 prebuild and use the existing native scaffolding (incompatible if dependencies need new pods)

**Do NOT run `expo prebuild --clean` until the audit is clean.**

## 0.4 · Run prebuild and verify

```bash
cd apps/mobile
npx expo prebuild --clean
head -1 ios/Tanren/AppDelegate.swift
# Expected: public import Expo
```

If the line is correct, the plugin works. Test build:

```bash
cd ios && pod install && cd ..
# Don't full build yet — just verify pod install succeeds
```

## 0.5 · Commit

```bash
git add apps/mobile/plugins/with-public-import-expo.ts apps/mobile/app.json
git commit -m "chore(ios): config plugin to preserve public import Expo across prebuilds

Prevents the Swift 6 fix from being wiped by expo prebuild --clean.
Re-applies 'public import Expo' to AppDelegate.swift on every prebuild."
```

---

# Phase 1 — Android Health Connect foundation (4-6h)

**Goal**: implement the platform-agnostic service interface + Android implementation. iOS uses a noop stub for now.

## 1.1 · Install Health Connect dependency

```bash
cd apps/mobile
npx expo install react-native-health-connect
```

## 1.2 · API verification BEFORE coding

`react-native-health-connect` API has shifted across versions (2.x → 3.x). The code in this prompt assumes specific exports. Verify them against the installed version before writing any service code.

### Verify

After `npx expo install react-native-health-connect`:

```bash
# Check installed version
cat apps/mobile/node_modules/react-native-health-connect/package.json | grep '"version"'

# List exports
node -e "const hc = require('react-native-health-connect'); console.log(Object.keys(hc).sort().join('\n'))"

# Read the type definitions
cat apps/mobile/node_modules/react-native-health-connect/lib/typescript/index.d.ts | head -60
```

### Map against this prompt's expectations

The Phase 1 service code uses these symbols. **Verify each one exists in the installed version**:

| Symbol used | Where in code |
|---|---|
| `initialize` | `ensureInit()` |
| `getSdkStatus` | `isAvailable()` |
| `SdkAvailabilityStatus.SDK_AVAILABLE` | `isAvailable()` (compare value) |
| `SdkAvailabilityStatus.SDK_UNAVAILABLE_PROVIDER_UPDATE_REQUIRED` | `isAvailable()` |
| `requestPermission` | `requestPermissions()` |
| `getGrantedPermissions` | `getPermissionState()` |
| `insertRecords` | `writeWorkout()` |
| `readRecords` | `readLatestWeight()` |
| `ExerciseType.STRENGTH_TRAINING` | `writeWorkout()` (constant value) |

### If symbols differ

- Symbol renamed → adapt the import and usage
- Constant moved to a different namespace → adjust
- Permission shape changed (e.g., `{ accessType, recordType }` → `{ access, type }`) → update `PERM_MAP`

**Don't proceed to Phase 1.3 implementation until every symbol used in this prompt is confirmed in the actual package.**

## 1.3 · Configure `app.json`

```json
{
  "expo": {
    "plugins": [
      "./plugins/with-public-import-expo.ts",
      "react-native-health-connect"
    ],
    "android": {
      "permissions": [
        "android.permission.health.READ_EXERCISE",
        "android.permission.health.WRITE_EXERCISE",
        "android.permission.health.READ_WEIGHT",
        "android.permission.health.READ_HEIGHT",
        "android.permission.health.WRITE_ACTIVE_CALORIES_BURNED"
      ]
    }
  }
}
```

Apply config:

```bash
npx expo prebuild --clean
cd android && ./gradlew clean && cd ..
```

After prebuild, verify:

```bash
git diff android/app/src/main/AndroidManifest.xml
# Expected: the 5 health permissions added
```

## 1.4 · Shared types

**File**: `apps/mobile/src/services/health/types.ts`

```ts
export type HealthProvider = 'apple-health' | 'health-connect' | 'none'

export type HealthPermissionKey = 'write_workouts' | 'read_weight' | 'read_height'

/** Per-permission state. Note: on iOS, only write_workouts is reliably detectable. */
export type HealthPermissionState = {
  write_workouts: boolean | 'unknown'
  read_weight: boolean | 'unknown'
  read_height: boolean | 'unknown'
}

/** Tanren session ready to write to a health provider */
export type WorkoutPayload = {
  startedAt: Date
  completedAt: Date
  estimatedCaloriesBurned: number
  totalSets: number
  totalVolumeKg: number
  workoutName: string
}

export type WeightReading = {
  weightKg: number
  measuredAt: Date
  source: HealthProvider
} | null

export type HealthAvailability =
  | { available: true }
  | { available: false; reason: 'sdk_not_installed' | 'platform_unsupported' | 'init_failed'; details?: string }

export type HealthService = {
  getProvider(): HealthProvider
  isAvailable(): Promise<HealthAvailability>
  getPermissionState(): Promise<HealthPermissionState>
  requestPermissions(perms: HealthPermissionKey[]): Promise<HealthPermissionState>
  writeWorkout(payload: WorkoutPayload): Promise<void>
  readLatestWeight(): Promise<WeightReading>
  /** Open system settings for permission management. iOS opens Health > Tanren, Android opens Health Connect app. */
  openSystemSettings(): Promise<void>
  /** For Android only: open Play Store to install Health Connect when missing. iOS noop. */
  openInstallPlayStore?(): Promise<void>
}
```

The `'unknown'` state for iOS read permissions is critical — it makes the type system enforce the UX divergence.

## 1.5 · Android implementation

**File**: `apps/mobile/src/services/health/android.ts`

```ts
import { Linking } from 'react-native'
import {
  initialize,
  requestPermission,
  getGrantedPermissions,
  insertRecords,
  readRecords,
  ExerciseType,
  getSdkStatus,
  SdkAvailabilityStatus,
} from 'react-native-health-connect'
import type {
  HealthService,
  HealthProvider,
  HealthPermissionKey,
  HealthPermissionState,
  WorkoutPayload,
  WeightReading,
  HealthAvailability,
} from './types'

const PERM_MAP: Record<HealthPermissionKey, { accessType: 'read' | 'write'; recordType: string }[]> = {
  write_workouts: [
    { accessType: 'write', recordType: 'ExerciseSession' },
    { accessType: 'write', recordType: 'TotalCaloriesBurned' },
  ],
  read_weight: [{ accessType: 'read', recordType: 'Weight' }],
  read_height: [{ accessType: 'read', recordType: 'Height' }],
}

let initialized = false

async function ensureInit(): Promise<void> {
  if (initialized) return
  const ok = await initialize()
  if (!ok) throw new Error('Health Connect init failed')
  initialized = true
}

export const androidHealthService: HealthService = {
  getProvider: () => 'health-connect' as HealthProvider,

  isAvailable: async (): Promise<HealthAvailability> => {
    try {
      const status = await getSdkStatus()
      if (status === SdkAvailabilityStatus.SDK_AVAILABLE) {
        return { available: true }
      }
      if (status === SdkAvailabilityStatus.SDK_UNAVAILABLE_PROVIDER_UPDATE_REQUIRED) {
        return { available: false, reason: 'sdk_not_installed', details: 'Update Health Connect via Play Store' }
      }
      return { available: false, reason: 'sdk_not_installed' }
    } catch (err) {
      return { available: false, reason: 'init_failed', details: err instanceof Error ? err.message : String(err) }
    }
  },

  getPermissionState: async (): Promise<HealthPermissionState> => {
    await ensureInit()
    const granted = await getGrantedPermissions()
    return {
      write_workouts:
        granted.some((g) => g.recordType === 'ExerciseSession' && g.accessType === 'write'),
      read_weight: granted.some((g) => g.recordType === 'Weight' && g.accessType === 'read'),
      read_height: granted.some((g) => g.recordType === 'Height' && g.accessType === 'read'),
    }
  },

  requestPermissions: async (perms: HealthPermissionKey[]): Promise<HealthPermissionState> => {
    await ensureInit()
    const requested = perms.flatMap((p) => PERM_MAP[p])
    await requestPermission(requested)
    return await androidHealthService.getPermissionState()
  },

  writeWorkout: async (payload: WorkoutPayload): Promise<void> => {
    await ensureInit()
    await insertRecords([
      {
        recordType: 'ExerciseSession',
        startTime: payload.startedAt.toISOString(),
        endTime: payload.completedAt.toISOString(),
        exerciseType: ExerciseType.STRENGTH_TRAINING,
        title: payload.workoutName,
        notes: `Tanren · ${payload.totalSets} sets · ${payload.totalVolumeKg} kg volume`,
      },
      {
        recordType: 'TotalCaloriesBurned',
        startTime: payload.startedAt.toISOString(),
        endTime: payload.completedAt.toISOString(),
        energy: { value: payload.estimatedCaloriesBurned, unit: 'kilocalories' },
      },
    ])
  },

  readLatestWeight: async (): Promise<WeightReading> => {
    await ensureInit()
    const result = await readRecords('Weight', {
      timeRangeFilter: {
        operator: 'between',
        startTime: new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString(),
        endTime: new Date().toISOString(),
      },
      ascendingOrder: false,
      pageSize: 1,
    })
    if (result.records.length === 0) return null
    const latest = result.records[0]
    return {
      weightKg: (latest.weight as any).inKilograms ?? (latest.weight as any).value,
      measuredAt: new Date(latest.time),
      source: 'health-connect',
    }
  },

  openSystemSettings: async () => {
    // Health Connect permissions are managed in the Health Connect app itself.
    // We try multiple approaches because OEM behavior varies:
    //
    // 1. Direct package launch (most reliable when app is installed)
    // 2. Health Connect settings intent (Android 14+ standard)
    // 3. Tanren's app settings (last resort — user manually navigates)

    // Approach 1: open Health Connect app directly via package URL
    try {
      const url = 'package:com.google.android.apps.healthdata'
      const supported = await Linking.canOpenURL(url)
      if (supported) {
        await Linking.openURL(url)
        return
      }
    } catch {
      // fall through
    }

    // Approach 2: standard Health Connect settings intent
    try {
      await Linking.sendIntent('androidx.health.ACTION_HEALTH_CONNECT_SETTINGS')
      return
    } catch {
      // fall through
    }

    // Approach 3: Tanren's own app settings (user must navigate manually to find HC link)
    await Linking.openSettings()
  },

  openInstallPlayStore: async () => {
    await Linking.openURL('market://details?id=com.google.android.apps.healthdata').catch(() =>
      Linking.openURL('https://play.google.com/store/apps/details?id=com.google.android.apps.healthdata'),
    )
  },
}
```

## 1.6 · iOS noop service (placeholder)

**File**: `apps/mobile/src/services/health/ios.ts` (stub for now)

```ts
import type { HealthService, HealthProvider, HealthAvailability, HealthPermissionState } from './types'

/**
 * iOS Apple HealthKit implementation.
 *
 * NOT YET IMPLEMENTED — requires:
 * 1. Apple Developer Program subscription ($99/year)
 * 2. HealthKit capability enabled in App Store Connect
 * 3. @kingstinct/react-native-healthkit package installed
 *
 * Phase 4 of the implementation plan will replace this stub.
 */
export const iosHealthService: HealthService = {
  getProvider: () => 'apple-health' as HealthProvider,
  isAvailable: async (): Promise<HealthAvailability> => ({
    available: false,
    reason: 'sdk_not_installed',
    details: 'HealthKit integration pending Apple Developer account',
  }),
  getPermissionState: async (): Promise<HealthPermissionState> => ({
    write_workouts: 'unknown',
    read_weight: 'unknown',
    read_height: 'unknown',
  }),
  requestPermissions: async () => ({
    write_workouts: 'unknown',
    read_weight: 'unknown',
    read_height: 'unknown',
  }),
  writeWorkout: async () => {
    throw new Error('iOS HealthKit not yet implemented')
  },
  readLatestWeight: async () => null,
  openSystemSettings: async () => {
    const { Linking } = require('react-native')
    await Linking.openURL('app-settings:').catch(() => Linking.openSettings())
  },
}
```

## 1.7 · Service dispatcher

**File**: `apps/mobile/src/services/health/index.ts`

```ts
import { Platform } from 'react-native'
import type { HealthService, HealthProvider } from './types'
import { androidHealthService } from './android'
import { iosHealthService } from './ios'

const noopService: HealthService = {
  getProvider: () => 'none' as HealthProvider,
  isAvailable: async () => ({ available: false, reason: 'platform_unsupported' as const }),
  getPermissionState: async () => ({ write_workouts: false, read_weight: false, read_height: false }),
  requestPermissions: async () => ({ write_workouts: false, read_weight: false, read_height: false }),
  writeWorkout: async () => {},
  readLatestWeight: async () => null,
  openSystemSettings: async () => {},
}

export function getHealthService(): HealthService {
  if (Platform.OS === 'ios') return iosHealthService
  if (Platform.OS === 'android') return androidHealthService
  return noopService
}

export type {
  HealthService,
  HealthProvider,
  HealthPermissionKey,
  HealthPermissionState,
  HealthAvailability,
  WorkoutPayload,
  WeightReading,
} from './types'
```

## 1.8 · Workout mapper

**File**: `apps/mobile/src/services/health/tanrenWorkoutMapper.ts`

```ts
import type { WorkoutPayload } from './types'

export function mapSessionToWorkoutPayload(session: {
  startedAt: Date | string
  completedAt: Date | string
  workoutName: string
  exercises: Array<{ sets: Array<{ reps: number; weightKg: number; isCompleted: boolean }> }>
  userWeightKg?: number | null
}): WorkoutPayload {
  const startedAt = new Date(session.startedAt)
  const completedAt = new Date(session.completedAt)
  const durationSec = Math.max(0, (completedAt.getTime() - startedAt.getTime()) / 1000)

  let totalSets = 0
  let totalVolumeKg = 0
  for (const ex of session.exercises) {
    for (const set of ex.sets) {
      if (!set.isCompleted) continue
      totalSets++
      totalVolumeKg += set.reps * set.weightKg
    }
  }

  // MET-based estimation for traditional strength training (~3.5 MET)
  const userWeight = session.userWeightKg ?? 75
  const hours = durationSec / 3600
  const estimatedCaloriesBurned = Math.round(3.5 * userWeight * hours)

  return {
    startedAt,
    completedAt,
    estimatedCaloriesBurned,
    totalSets,
    totalVolumeKg: Math.round(totalVolumeKg),
    workoutName: session.workoutName,
  }
}
```

## 1.9 · `useHealth` hook

**File**: `apps/mobile/src/hooks/useHealth.ts`

```ts
import { useCallback, useEffect, useState } from 'react'
import { Platform } from 'react-native'
import { getHealthService } from '../services/health'
import type {
  HealthAvailability,
  HealthPermissionState,
  HealthPermissionKey,
  HealthProvider,
} from '../services/health/types'
import { storage } from '../lib/storage'

const PROVIDER_NAMES: Record<HealthProvider, string> = {
  'apple-health': 'Apple Santé',
  'health-connect': 'Health Connect',
  'none': 'Indisponible',
}

const STORAGE_KEYS = {
  PROMPTED: 'tanren-health-prompted-v1',
  PROMPTED_AT: 'tanren-health-prompted-at-v1',
  LAST_SYNC: 'tanren-health-last-sync-v1',
} as const

export function useHealth() {
  const service = getHealthService()
  const provider = service.getProvider()
  const providerName = PROVIDER_NAMES[provider]

  const [availability, setAvailability] = useState<HealthAvailability>({ available: false, reason: 'init_failed' })
  const [permissions, setPermissions] = useState<HealthPermissionState>({
    write_workouts: false,
    read_weight: false,
    read_height: false,
  })
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      const avail = await service.isAvailable()
      setAvailability(avail)
      if (avail.available) {
        const perms = await service.getPermissionState()
        setPermissions(perms)
      }
    } finally {
      setLoading(false)
    }
  }, [service])

  useEffect(() => {
    refresh()
  }, [refresh])

  const requestAll = useCallback(async () => {
    const newState = await service.requestPermissions(['write_workouts', 'read_weight', 'read_height'])
    setPermissions(newState)
    return newState
  }, [service])

  const requestSome = useCallback(
    async (perms: HealthPermissionKey[]) => {
      const newState = await service.requestPermissions(perms)
      setPermissions(newState)
      return newState
    },
    [service],
  )

  // "Connected" = at least one permission granted (write_workouts on iOS is the only reliable signal)
  const isConnected = (() => {
    if (Platform.OS === 'ios') {
      return permissions.write_workouts === true
    }
    return permissions.write_workouts === true || permissions.read_weight === true || permissions.read_height === true
  })()

  // Modal prompt logic
  const wasPrompted = !!storage.getBoolean(STORAGE_KEYS.PROMPTED)
  const promptedAt = storage.getString(STORAGE_KEYS.PROMPTED_AT)

  const shouldPrompt = useCallback(() => {
    if (!availability.available) return false
    if (isConnected) return false
    if (!wasPrompted) return true
    if (!promptedAt) return false
    const ageMs = Date.now() - new Date(promptedAt).getTime()
    return ageMs > 30 * 24 * 3600 * 1000
  }, [availability, isConnected, wasPrompted, promptedAt])

  const markPrompted = useCallback(() => {
    storage.set(STORAGE_KEYS.PROMPTED, true)
    storage.set(STORAGE_KEYS.PROMPTED_AT, new Date().toISOString())
  }, [])

  const lastSyncedAt = storage.getString(STORAGE_KEYS.LAST_SYNC)
  const setLastSyncedAt = useCallback((date: Date) => {
    storage.set(STORAGE_KEYS.LAST_SYNC, date.toISOString())
  }, [])

  return {
    provider,
    providerName,
    availability,
    permissions,
    isConnected,
    loading,
    refresh,
    requestAll,
    requestSome,
    shouldPrompt,
    markPrompted,
    lastSyncedAt: lastSyncedAt ? new Date(lastSyncedAt) : null,
    setLastSyncedAt,
    openSystemSettings: () => service.openSystemSettings(),
    openInstallPlayStore: service.openInstallPlayStore?.bind(service),
  }
}
```

## 1.10 · Verify and commit

```bash
cd apps/mobile && npx tsc --noEmit
# Expected: 0 errors
```

```bash
git add apps/mobile/src/services/health/ apps/mobile/src/hooks/useHealth.ts apps/mobile/app.json
git commit -m "feat(health): Android Health Connect foundation

- HealthService interface with platform-aware availability + 'unknown' state for iOS reads
- Android implementation via react-native-health-connect (full)
- iOS placeholder stub (Phase 4 will replace once Apple Developer account ready)
- useHealth hook with prompt-debounce logic + useTheme-compatible
- Tanren session → WorkoutPayload mapper

Tested on real Android device per Health Connect requirement."
```

---

# Phase 2 — Permission modal (post-session) (4h)

## 2.1 · Build `HealthPermissionModal`

Implements **Mockup screen 1**. Bottom sheet, blurred recap behind, icons row, 2 features, primary + skip CTAs.

**File**: `apps/mobile/src/components/HealthPermissionModal.tsx`

```tsx
import { Modal, View, Text, Pressable, StyleSheet } from 'react-native'
import { useTheme } from '@/theme/ThemeContext'
import { useHealth } from '@/hooks/useHealth'

const PROVIDER_VISUAL = {
  'apple-health': { gradient: ['#fc2b5e', '#fc2b76'], icon: '♥' },
  'health-connect': { gradient: ['#00b9f5', '#1e88e5'], icon: '+' },
  'none': { gradient: ['#888', '#888'], icon: '?' },
} as const

const COPY: Record<'apple-health' | 'health-connect', {
  title: string
  subtitle: string
  feature1Label: string
  feature1Desc: string
}> = {
  'apple-health': {
    title: 'Connecte\nApple Santé',
    subtitle: 'Garde tout ton historique sportif au même endroit. Tes séances Tanren apparaîtront automatiquement dans Apple Santé.',
    feature1Label: 'Tes séances dans Santé',
    feature1Desc: "Chaque entraînement complet apparaît dans l'app Santé d'Apple",
  },
  'health-connect': {
    title: 'Connecte\nHealth Connect',
    subtitle: "Centralise tes données de santé sur Android. Tes séances Tanren se synchronisent avec l'app Health Connect de Google.",
    feature1Label: 'Tes séances partagées',
    feature1Desc: 'Visible dans Health Connect et toutes les apps compatibles (Samsung Health, Fitbit...)',
  },
}

export function HealthPermissionModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { tokens } = useTheme()
  const { provider, requestAll, markPrompted } = useHealth()

  const visual = PROVIDER_VISUAL[provider] ?? PROVIDER_VISUAL.none
  const copy = provider === 'apple-health' || provider === 'health-connect' ? COPY[provider] : null

  if (!copy) {
    // 'none' provider — modal shouldn't be visible anyway, but defensive
    return null
  }

  const handleAccept = async () => {
    markPrompted()
    try {
      await requestAll()
    } catch (e) {
      console.warn('[health] requestAll failed', e)
    } finally {
      onClose()
    }
  }

  const handleSkip = () => {
    markPrompted()
    onClose()
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleSkip}>
      <View style={[styles.overlay, { backgroundColor: tokens.overlay }]}>
        <View style={[styles.card, { backgroundColor: tokens.bg, borderTopColor: tokens.border }]}>
          <View style={[styles.handle, { backgroundColor: tokens.borderStrong }]} />

          <View style={styles.iconRow}>
            <View style={[styles.icon, { backgroundColor: tokens.accent }]}>
              <Text style={styles.iconKanji}>鍛</Text>
            </View>
            <Text style={[styles.iconArrow, { color: tokens.textMute }]}>⇄</Text>
            <View style={[styles.icon, { backgroundColor: visual.gradient[0] }]}>
              <Text style={styles.iconEmoji}>{visual.icon}</Text>
            </View>
          </View>

          <Text style={[styles.title, { color: tokens.text }]}>{copy.title}</Text>
          <Text style={[styles.subtitle, { color: tokens.textMute }]}>{copy.subtitle}</Text>

          <View style={styles.features}>
            <Feature
              tokens={tokens}
              label={copy.feature1Label}
              desc={copy.feature1Desc}
            />
            <Feature
              tokens={tokens}
              label="Ton poids synchronisé"
              desc="Plus besoin de noter ton poids 2 fois (optionnel)"
            />
          </View>

          <Pressable
            onPress={handleAccept}
            style={({ pressed }) => [
              styles.ctaPrimary,
              { backgroundColor: tokens.accent, opacity: pressed ? 0.85 : 1 },
            ]}
          >
            <Text style={styles.ctaPrimaryText}>Activer la synchronisation</Text>
          </Pressable>

          <Pressable onPress={handleSkip}>
            <Text style={[styles.ctaSkip, { color: tokens.textMute }]}>Plus tard</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  )
}

function Feature({ tokens, label, desc }: { tokens: any; label: string; desc: string }) {
  return (
    <View style={[styles.feature, { backgroundColor: tokens.surface1, borderLeftColor: tokens.accent }]}>
      <Text style={[styles.featureCheck, { color: tokens.accent }]}>›</Text>
      <View style={{ flex: 1 }}>
        <Text style={[styles.featureLabel, { color: tokens.text }]}>{label}</Text>
        <Text style={[styles.featureDesc, { color: tokens.textMute }]}>{desc}</Text>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end' },
  card: {
    borderTopLeftRadius: 16, borderTopRightRadius: 16,
    paddingTop: 24, paddingHorizontal: 22, paddingBottom: 28,
    borderTopWidth: 1,
  },
  handle: { width: 36, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 18 },
  iconRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 16, marginBottom: 18 },
  icon: { width: 50, height: 50, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  iconKanji: { fontFamily: 'NotoSerifJP-Black', fontSize: 26, color: '#FFF', fontWeight: '900' },
  iconEmoji: { fontSize: 26, color: '#FFF' },
  iconArrow: { fontSize: 22, fontWeight: '300' },
  title: { fontWeight: '900', fontSize: 22, letterSpacing: 0.4, textTransform: 'uppercase', textAlign: 'center', lineHeight: 25, marginBottom: 10, fontFamily: 'BarlowCondensed-Black' },
  subtitle: { fontSize: 13, textAlign: 'center', lineHeight: 19, marginBottom: 18 },
  features: { marginBottom: 22, gap: 10 },
  feature: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, padding: 12, borderLeftWidth: 2 },
  featureCheck: { fontSize: 14, fontWeight: '700', marginTop: 1 },
  featureLabel: { fontWeight: '700', fontSize: 11, letterSpacing: 0.66, textTransform: 'uppercase', marginBottom: 2 },
  featureDesc: { fontSize: 11, lineHeight: 15 },
  ctaPrimary: { paddingVertical: 14, borderRadius: 4, alignItems: 'center', marginBottom: 8 },
  ctaPrimaryText: { color: '#FFF', fontWeight: '700', fontSize: 12, letterSpacing: 2.16, textTransform: 'uppercase', fontFamily: 'BarlowCondensed-Bold' },
  ctaSkip: { fontWeight: '500', fontSize: 11, letterSpacing: 1.76, textTransform: 'uppercase', textAlign: 'center', paddingVertical: 10 },
})
```

**Important**: replace `useTheme` import with actual hook path found in Phase 0.1. The shape `tokens.bg`, `tokens.text`, etc. must match what your existing theme returns.

## 2.2 · Trigger after first session

In the session recap screen (whichever file completes a session):

```tsx
import { HealthPermissionModal } from '@/components/HealthPermissionModal'
import { useHealth } from '@/hooks/useHealth'

export default function SessionRecap() {
  const { shouldPrompt } = useHealth()
  const [healthModalVisible, setHealthModalVisible] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => {
      if (shouldPrompt()) {
        setHealthModalVisible(true)
      }
    }, 1500)
    return () => clearTimeout(timer)
  }, [shouldPrompt])

  return (
    <>
      {/* recap UI ... */}
      <HealthPermissionModal
        visible={healthModalVisible}
        onClose={() => setHealthModalVisible(false)}
      />
    </>
  )
}
```

## 2.3 · Commit

```bash
git add apps/mobile/src/components/HealthPermissionModal.tsx apps/mobile/app/workout/
git commit -m "feat(health): post-session permission modal

Bottom sheet matching mockup screen 1. Blurred recap behind, Tanren ⇄ Provider
icons, 2 features, primary + skip CTAs.

Triggered 1.5s after session completion via shouldPrompt(). 'Plus tard'
reschedules for 30 days. Adapts copy + icon for Apple Santé / Health Connect.

Consumes useTheme() — no inline tokens."
```

---

# Phase 3 — Profile → Connexions screen + auto-sync (5-6h)

Implements **Mockup screens 2-6** (Android variant).

## 3.1 · The screen

**File**: `apps/mobile/app/profile/connexions.tsx`

```tsx
import { ScrollView, View, Text, Pressable, StyleSheet, Modal, Alert, Platform } from 'react-native'
import { useState } from 'react'
import { useTheme } from '@/theme/ThemeContext'
import { useHealth } from '@/hooks/useHealth'
import { getHealthService } from '@/services/health'
import { healthSyncQueue } from '@/services/health/syncQueue'
import { router } from 'expo-router'

export default function ConnexionsScreen() {
  const { tokens } = useTheme()
  const {
    provider, providerName, availability, isConnected, permissions, loading,
    requestAll, requestSome, refresh, lastSyncedAt,
    openSystemSettings, openInstallPlayStore,
  } = useHealth()
  const [revokeModalVisible, setRevokeModalVisible] = useState(false)
  const [syncing, setSyncing] = useState(false)

  const handleConnect = async () => {
    if (!availability.available) {
      // Android case: Health Connect not installed
      if (Platform.OS === 'android' && openInstallPlayStore) {
        await openInstallPlayStore()
      }
      return
    }
    await requestAll()
  }

  const handleToggleMain = () => {
    if (isConnected) {
      setRevokeModalVisible(true)
    } else {
      handleConnect()
    }
  }

  const handleTogglePermAndroid = async (key: 'write_workouts' | 'read_weight' | 'read_height') => {
    const isOn = permissions[key] === true
    if (isOn) {
      // Cannot programmatically revoke — open Health Connect settings
      await openSystemSettings()
      // Refresh after user comes back
      setTimeout(() => refresh(), 1000)
    } else {
      await requestSome([key])
    }
  }

  const handleRevoke = async () => {
    setRevokeModalVisible(false)
    await openSystemSettings()
    setTimeout(() => refresh(), 1000)
  }

  const handleSyncNow = async () => {
    setSyncing(true)
    try {
      // Drain the offline queue first (sync any pending workouts)
      const service = getHealthService()
      const drainResult = await healthSyncQueue.drain(service)
      if (drainResult.synced > 0) {
        // Optional: show a toast "X workouts synced"
      }
      // Then refresh permission state and last sync timestamp
      await refresh()
    } finally {
      setSyncing(false)
    }
  }

  return (
    <ScrollView style={[styles.screen, { backgroundColor: tokens.bg }]}>
      <Header tokens={tokens} title="Connexions" />

      <View style={styles.content}>
        <SecLabel tokens={tokens}>Apps de santé</SecLabel>

        {!availability.available ? (
          <UnavailableCard
            tokens={tokens}
            provider={provider}
            providerName={providerName}
            reason={availability.reason}
            onInstall={openInstallPlayStore}
          />
        ) : !isConnected ? (
          <DisconnectedCard
            tokens={tokens}
            provider={provider}
            providerName={providerName}
            onConnect={handleConnect}
          />
        ) : (
          <ConnectedCard
            tokens={tokens}
            provider={provider}
            providerName={providerName}
            permissions={permissions}
            lastSyncedAt={lastSyncedAt}
            syncing={syncing}
            onToggleMain={handleToggleMain}
            onTogglePerm={handleTogglePermAndroid}
            onSyncNow={handleSyncNow}
            onOpenSettings={openSystemSettings}
          />
        )}

        {/* iOS specific info block when connected */}
        {Platform.OS === 'ios' && isConnected && (
          <InfoBlock tokens={tokens}>
            Apple ne nous communique pas l'état de tes permissions de lecture. Pour les modifier,
            ouvre Réglages > Santé > Apps connectées > Tanren.
          </InfoBlock>
        )}

        <SecLabel tokens={tokens}>À venir</SecLabel>
        <PlaceholderCard tokens={tokens} name="Garmin Connect" icon="⌚" />
      </View>

      <RevokeModal
        tokens={tokens}
        visible={revokeModalVisible}
        provider={provider}
        onConfirm={handleRevoke}
        onCancel={() => setRevokeModalVisible(false)}
      />
    </ScrollView>
  )
}

// Sub-components: Header, SecLabel, UnavailableCard, DisconnectedCard, ConnectedCard, InfoBlock, PlaceholderCard, RevokeModal
// Each implementing the visual specs from the mockup tokens (38x38px icons, 44x26px main toggle, 36x22px mini toggles, etc.)
// Each consuming `tokens` from useTheme — no hardcoded colors

// (Full sub-component code: ~150 lines following the mockup precisely)
```

**Implementation note for sub-components**: stay strictly within the mockup specs. Don't reinvent layouts. The mockup `<style>` block is the source of truth for sizes, spacings, font weights — translate them to React Native StyleSheet directly.

**Critical iOS-specific behavior**:

In `ConnectedCard`, the perms section diverges by platform:

```tsx
{Platform.OS === 'ios' ? (
  // Only write_workouts toggle + settings link for read perms (per mockup)
  <>
    <PermRow tokens={tokens} label="Écrire mes séances" detail="Type · Durée · Calories estimées" on={permissions.write_workouts === true} />
    <SettingsLinkRow
      tokens={tokens}
      label="Lecture poids et taille"
      detail="Géré dans Réglages > Confidentialité > Santé"
      onPress={onOpenSettings}
    />
  </>
) : (
  // All 3 toggles independently functional
  <>
    <PermRow tokens={tokens} label="Écrire mes séances" detail="..." on={permissions.write_workouts === true} onPress={() => onTogglePerm('write_workouts')} />
    <PermRow tokens={tokens} label="Lire mon poids" detail="Synchroniser depuis Health Connect" on={permissions.read_weight === true} onPress={() => onTogglePerm('read_weight')} />
    <PermRow tokens={tokens} label="Lire ma taille" detail="Pré-remplir le profil" on={permissions.read_height === true} onPress={() => onTogglePerm('read_height')} />
  </>
)}
```

## 3.2 · Add the entry from Profile

In the main Profile tab, add a row pointing to the Connexions sub-screen:

```tsx
<Pressable onPress={() => router.push('/profile/connexions')}>
  {/* match existing Profile row style */}
  <Text>Connexions</Text>
  <Text>›</Text>
</Pressable>
```

## 3.3 · MMKV sync queue for offline workouts

A user who completes sessions in airplane mode (gym basement, plane) needs their workouts to sync **when network and the health app become reachable**. Without a queue, those workouts are silently lost from the health provider's perspective.

### Create the queue

**File**: `apps/mobile/src/services/health/syncQueue.ts`

```ts
import { storage } from '@/lib/storage'  // existing MMKV instance — verify path matches your repo
import type { HealthService, WorkoutPayload } from './types'

const KEY = 'tanren-health-sync-queue-v1'
const MAX_AGE_DAYS = 30
const MAX_ATTEMPTS = 5

type Pending = {
  id: string             // UUID for dedup
  payload: WorkoutPayload  // serialized; Date → ISO string
  attempts: number
  queuedAt: string       // ISO
  lastErrorAt?: string
  lastError?: string
}

type Stored = Omit<Pending, 'payload'> & {
  payload: Omit<WorkoutPayload, 'startedAt' | 'completedAt'> & {
    startedAt: string  // ISO
    completedAt: string
  }
}

function read(): Pending[] {
  const raw = storage.getString(KEY)
  if (!raw) return []
  try {
    const stored: Stored[] = JSON.parse(raw)
    return stored.map((s) => ({
      ...s,
      payload: {
        ...s.payload,
        startedAt: new Date(s.payload.startedAt),
        completedAt: new Date(s.payload.completedAt),
      },
    }))
  } catch {
    return []
  }
}

function write(items: Pending[]): void {
  const stored: Stored[] = items.map((p) => ({
    ...p,
    payload: {
      ...p.payload,
      startedAt: p.payload.startedAt.toISOString(),
      completedAt: p.payload.completedAt.toISOString(),
    },
  }))
  storage.set(KEY, JSON.stringify(stored))
}

function generateId(): string {
  // No need for full UUID; timestamp + random is enough for dedup
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

export const healthSyncQueue = {
  enqueue(payload: WorkoutPayload): void {
    const items = read()
    items.push({
      id: generateId(),
      payload,
      attempts: 0,
      queuedAt: new Date().toISOString(),
    })
    write(items)
  },

  size(): number {
    return read().length
  },

  /**
   * Drain the queue: try to write each pending item to the provider.
   * Successful items are removed. Failed items get attempts++ and stay queued (until MAX_ATTEMPTS or MAX_AGE_DAYS).
   * Returns count of successful syncs.
   */
  async drain(service: HealthService): Promise<{ synced: number; failed: number; dropped: number }> {
    let items = read()
    if (items.length === 0) return { synced: 0, failed: 0, dropped: 0 }

    const cutoffMs = Date.now() - MAX_AGE_DAYS * 24 * 3600 * 1000
    const dropped = items.filter((item) => {
      const tooOld = new Date(item.queuedAt).getTime() < cutoffMs
      const tooManyAttempts = item.attempts >= MAX_ATTEMPTS
      return tooOld || tooManyAttempts
    })
    items = items.filter((item) => !dropped.includes(item))

    let synced = 0
    let failed = 0
    const remaining: Pending[] = []

    for (const item of items) {
      try {
        await service.writeWorkout(item.payload)
        synced++
      } catch (err) {
        failed++
        remaining.push({
          ...item,
          attempts: item.attempts + 1,
          lastErrorAt: new Date().toISOString(),
          lastError: err instanceof Error ? err.message : String(err),
        })
      }
    }

    write(remaining)
    return { synced, failed, dropped: dropped.length }
  },

  clear(): void {
    storage.delete(KEY)
  },
}
```

### Wire `drain()` into the right triggers

The queue should be drained at these moments:

1. **App foreground** : when the user reopens the app, attempt to sync any pending workouts
2. **After each session completion** : sync the new one + any stragglers
3. **Manual "Sync maintenant"** in Profile → Connexions

### App foreground hook

**File**: `apps/mobile/src/hooks/useHealthSyncOnForeground.ts`

```ts
import { useEffect } from 'react'
import { AppState, AppStateStatus } from 'react-native'
import { getHealthService } from '@/services/health'
import { healthSyncQueue } from '@/services/health/syncQueue'

export function useHealthSyncOnForeground() {
  useEffect(() => {
    const service = getHealthService()
    let mounted = true

    const trySync = async () => {
      if (!mounted) return
      const avail = await service.isAvailable()
      if (!avail.available) return
      const perms = await service.getPermissionState()
      if (perms.write_workouts !== true) return
      const result = await healthSyncQueue.drain(service)
      if (result.synced > 0 || result.dropped > 0) {
        console.log(`[health] queue drain: synced=${result.synced} failed=${result.failed} dropped=${result.dropped}`)
      }
    }

    // Run once on mount
    trySync()

    // Run on every foreground transition
    const sub = AppState.addEventListener('change', (state: AppStateStatus) => {
      if (state === 'active') trySync()
    })

    return () => {
      mounted = false
      sub.remove()
    }
  }, [])
}
```

Mount it once at the app root (e.g., in `_layout.tsx` after the providers).

## 3.4 · Auto-sync on session completion (uses queue)

In the existing `useCompleteSession` mutation hook (or wherever sessions complete):

```ts
import { getHealthService } from '@/services/health'
import { mapSessionToWorkoutPayload } from '@/services/health/tanrenWorkoutMapper'
import { healthSyncQueue } from '@/services/health/syncQueue'
import { useHealth } from '@/hooks/useHealth'

export function useCompleteSession() {
  const { permissions, isConnected, setLastSyncedAt } = useHealth()
  // ... existing setup

  return trpc.sessions.complete.useMutation({
    onSuccess: async (sessionData) => {
      // existing invalidation calls
      // ...

      // Health sync — queue-first to handle offline gracefully
      const canWrite = permissions.write_workouts === true
      if (isConnected && canWrite) {
        const payload = mapSessionToWorkoutPayload(sessionData)
        const service = getHealthService()
        try {
          // Try direct write first (most common case)
          await service.writeWorkout(payload)
          setLastSyncedAt(new Date())

          // Drain any pending items while we're at it
          const drainResult = await healthSyncQueue.drain(service)
          if (drainResult.synced > 0) {
            console.log(`[health] also synced ${drainResult.synced} pending items`)
          }
        } catch (err) {
          console.warn('[health] direct write failed, queuing for retry', err)
          // Queue for retry on next foreground / manual sync
          healthSyncQueue.enqueue(payload)
        }
      } else if (isConnected) {
        // User connected but write_workouts permission denied — silently skip.
        // Don't queue: the workout will never sync without the permission.
        // (If user grants the permission later, only future workouts sync.)
      }
    },
  })
}
```

The queue ensures **no completed workout is lost** even if:
- Network drops during the write
- Health Connect / HealthKit briefly errors out
- The user closes the app right after completing the session

Items stay queued for up to 30 days or 5 retry attempts (whichever comes first).

## 3.5 · Mount the foreground sync hook

Once the queue and hook are written (Phase 3.3), mount `useHealthSyncOnForeground` once at the app root so it runs for the whole session lifetime.

**File**: `apps/mobile/app/_layout.tsx`

Inside the root layout component (after providers, before the `<Stack>`):

```tsx
import { useHealthSyncOnForeground } from '@/hooks/useHealthSyncOnForeground'

export default function RootLayout() {
  // ... existing hooks (auth, theme, etc.)
  useHealthSyncOnForeground()  // drains health sync queue on mount + AppState 'active'

  return (
    // ... existing layout
  )
}
```

The hook is a no-op when:
- The platform has no health service available (e.g., iOS without Apple Developer account during Phase 0-3)
- The user hasn't granted write_workouts permission
- The queue is empty

So it's safe to mount even before iOS is implemented in Phase 4.

## 3.6 · Commits

```bash
git add apps/mobile/app/profile/connexions.tsx apps/mobile/app/\(tabs\)/profile.tsx
git commit -m "feat(health): Profile → Connexions screen with iOS/Android UX divergence

Implements mockup screens 2 (iOS connected), 3 (Android connected), 4 (disconnected),
5 (unavailable Android), 6 (revoke modal).

Key UX divergence handled:
- iOS: only write_workouts has a toggle. Read perms shown as 'Settings' link
  because Apple doesn't expose read auth status reliably.
- Android: all 3 perms have independent toggles via getGrantedPermissions().
- Revoke flow: modal explains, then Linking.openSettings() — no programmatic revoke
  (impossible on both platforms).
- Unavailable state: explicit card + 'Install Health Connect' CTA on Android."

git add apps/mobile/src/services/health/syncQueue.ts apps/mobile/src/hooks/useHealthSyncOnForeground.ts
git commit -m "feat(health): MMKV offline sync queue + AppState foreground drain

- syncQueue: enqueue/drain/size operations, MAX_ATTEMPTS=5, MAX_AGE_DAYS=30
- useHealthSyncOnForeground: drains on mount + every AppState 'active' transition
- Mounted once at the root layout

Handles the airplane-mode / no-network gym scenario."

git add apps/mobile/src/data/mutations/useCompleteSession.ts  # adjust path
git add apps/mobile/app/_layout.tsx
git commit -m "feat(health): queue-first auto-write on session complete + mount foreground hook

useCompleteSession:
- Try direct writeWorkout first (most common case, online)
- On failure, enqueue for retry — workout never lost
- Also drain pending queue items opportunistically

_layout.tsx:
- Mounts useHealthSyncOnForeground at app root
- Drains queue on every foreground transition

Only fires when isConnected && write_workouts permission is granted.
Sessions completed without permission are silently skipped (no queue),
because granting permission later wouldn't backfill old workouts."
```

---

# Phase 4 — iOS HealthKit (after Apple Developer account ready) (1-1.5 day)

**STOP — DO NOT START until the user confirms:**

- ✅ Apple Developer Program subscribed and active
- ✅ HealthKit capability enabled in App Store Connect
- ✅ A real iPhone is available for testing

When ready, proceed.

## 4.1 · Install Kingstinct HealthKit

```bash
cd apps/mobile
npx expo install @kingstinct/react-native-healthkit react-native-nitro-modules
```

## 4.2 · API verification BEFORE coding

Same caveat as Phase 1.0: the Kingstinct package is actively iterated. Symbols used in this prompt's code may not match the installed version. Verify before writing the iOS service.

```bash
# Check installed version
cat apps/mobile/node_modules/@kingstinct/react-native-healthkit/package.json | grep '"version"'

# List exports
node -e "const hk = require('@kingstinct/react-native-healthkit'); console.log(Object.keys(hk).sort().join('\n'))"

# Read the type definitions
cat apps/mobile/node_modules/@kingstinct/react-native-healthkit/lib/typescript/index.d.ts | head -120
```

### Symbols this prompt's iOS code uses

| Symbol | Where in code |
|---|---|
| `HKQuantityTypeIdentifier` | enum reference (bodyMass, height, activeEnergyBurned) |
| `HKWorkoutActivityType` | enum reference (traditionalStrengthTraining) |
| `HKAuthorizationRequestStatus` | enum reference (unnecessary) |
| `HealthKit.isHealthDataAvailable()` | `isAvailable()` |
| `HealthKit.getRequestStatusForAuthorization()` | `getPermissionState()` |
| `HealthKit.requestAuthorization()` | `requestPermissions()` |
| `HealthKit.saveWorkoutSample()` | `writeWorkout()` |
| `HealthKit.getMostRecentQuantitySample()` | `readLatestWeight()` |

### If symbols differ

- Default vs named export changed (e.g., `import HealthKit from ...` vs `import * as HealthKit from ...`) → adjust import
- Method renamed (e.g., `saveWorkoutSample` → `saveWorkout`) → update call site
- Enum moved (e.g., `HKQuantityTypeIdentifier` is now `QuantityType`) → update references
- Permission request signature changed → update `requestAuthorization` call

**Read the README of the installed version**, not just the type defs. The package's README usually has up-to-date examples.

```bash
cat apps/mobile/node_modules/@kingstinct/react-native-healthkit/README.md | head -200
```

## 4.3 · Update `app.json`

Add the Kingstinct plugin and HealthKit entitlement:

```json
{
  "expo": {
    "plugins": [
      "./plugins/with-public-import-expo.ts",
      "react-native-health-connect",
      [
        "@kingstinct/react-native-healthkit",
        {
          "NSHealthShareUsageDescription": "Tanren lit ton poids pour synchroniser ton profil avec Apple Santé.",
          "NSHealthUpdateUsageDescription": "Tanren enregistre tes séances dans Apple Santé pour suivre ta progression.",
          "background": false
        }
      ]
    ],
    "ios": {
      "entitlements": {
        "com.apple.developer.healthkit": true,
        "com.apple.developer.healthkit.access": []
      }
    }
  }
}
```

Apply:

```bash
npx expo prebuild --clean
cd ios && pod install && cd ..

# Verify the public import Expo fix is preserved by the plugin
head -1 ios/Tanren/AppDelegate.swift
# Expected: public import Expo
```

## 4.4 · Replace iOS stub with real implementation

**File**: `apps/mobile/src/services/health/ios.ts`

```ts
import { Linking } from 'react-native'
import HealthKit, {
  HKQuantityTypeIdentifier,
  HKWorkoutActivityType,
  HKAuthorizationRequestStatus,
} from '@kingstinct/react-native-healthkit'
import type {
  HealthService,
  HealthProvider,
  HealthPermissionKey,
  HealthPermissionState,
  WorkoutPayload,
  WeightReading,
  HealthAvailability,
} from './types'

const READ_TYPES = [
  HKQuantityTypeIdentifier.bodyMass,
  HKQuantityTypeIdentifier.height,
] as const

const WRITE_TYPES = [
  // workout type is special — handled via HKWorkout API not by typeIdentifier
  HKQuantityTypeIdentifier.activeEnergyBurned,
] as const

export const iosHealthService: HealthService = {
  getProvider: () => 'apple-health' as HealthProvider,

  isAvailable: async (): Promise<HealthAvailability> => {
    try {
      const available = await HealthKit.isHealthDataAvailable()
      if (!available) {
        return { available: false, reason: 'platform_unsupported' }
      }
      return { available: true }
    } catch (err) {
      return { available: false, reason: 'init_failed', details: err instanceof Error ? err.message : String(err) }
    }
  },

  getPermissionState: async (): Promise<HealthPermissionState> => {
    // Apple does NOT expose read permission status (privacy by design).
    // We can only check write authorization status reliably.
    // Read permissions are returned as 'unknown'.
    const writeStatus = await HealthKit.getRequestStatusForAuthorization(
      [HKQuantityTypeIdentifier.activeEnergyBurned], // proxy for workout writes
      [HKQuantityTypeIdentifier.bodyMass, HKQuantityTypeIdentifier.height],
    )

    return {
      write_workouts: writeStatus === HKAuthorizationRequestStatus.unnecessary,
      read_weight: 'unknown',
      read_height: 'unknown',
    }
  },

  requestPermissions: async (perms: HealthPermissionKey[]): Promise<HealthPermissionState> => {
    const toRead: HKQuantityTypeIdentifier[] = []
    const toWrite: HKQuantityTypeIdentifier[] = []

    if (perms.includes('read_weight')) toRead.push(HKQuantityTypeIdentifier.bodyMass)
    if (perms.includes('read_height')) toRead.push(HKQuantityTypeIdentifier.height)
    if (perms.includes('write_workouts')) toWrite.push(HKQuantityTypeIdentifier.activeEnergyBurned)

    await HealthKit.requestAuthorization(toRead, toWrite)
    // After request, the only signal we get is "user saw the sheet". We re-fetch state.
    return await iosHealthService.getPermissionState()
  },

  writeWorkout: async (payload: WorkoutPayload): Promise<void> => {
    await HealthKit.saveWorkoutSample({
      activityType: HKWorkoutActivityType.traditionalStrengthTraining,
      startDate: payload.startedAt,
      endDate: payload.completedAt,
      totalEnergyBurned: { quantity: payload.estimatedCaloriesBurned, unit: 'kcal' },
      metadata: {
        workoutName: payload.workoutName,
        totalSets: String(payload.totalSets),
        totalVolumeKg: String(payload.totalVolumeKg),
      },
    })
  },

  readLatestWeight: async (): Promise<WeightReading> => {
    try {
      const sample = await HealthKit.getMostRecentQuantitySample(HKQuantityTypeIdentifier.bodyMass, 'kg')
      if (!sample) return null
      return {
        weightKg: sample.quantity,
        measuredAt: new Date(sample.startDate),
        source: 'apple-health',
      }
    } catch {
      // Read denied or no data — both cases return null
      return null
    }
  },

  openSystemSettings: async () => {
    // iOS deep link to Health > Sources > Tanren is not directly accessible.
    // Best effort: open Settings app at the Privacy > Health section.
    await Linking.openURL('App-Prefs:Privacy&path=HEALTH').catch(() =>
      Linking.openURL('app-settings:').catch(() => Linking.openSettings()),
    )
  },
}
```

**Note on the API**: this code follows the v13+ API of `@kingstinct/react-native-healthkit` per their docs. If the API has shifted at install time, **read the package's CHANGELOG and current README** before adapting — don't trust this code blindly.

## 4.5 · Test on real iPhone

```bash
npx expo run:ios --device
```

Validate (per mockup acceptance):
- Fresh install → no health prompt at sign-in
- Complete first workout → modal appears 1.5s after recap, with Apple Santé branding
- Tap "Activer la synchronisation" → modal closes → Apple's native sheet appears
- Toggle write_workouts ON, accept → return to app
- Profile → Connexions shows "Connecté ●", write_workouts toggle ON, "Lecture poids et taille" as a settings link
- Tap settings link → iOS Settings app opens to the right page (best-effort)
- Complete another workout → check Apple Santé app → workout appears
- Tap main toggle off → revoke modal appears → tap "Ouvrir Réglages" → settings open

## 4.6 · Commit

```bash
git add apps/mobile/src/services/health/ios.ts apps/mobile/app.json
git commit -m "feat(health): iOS HealthKit implementation via Kingstinct

- @kingstinct/react-native-healthkit with Promise API + Expo plugin
- write_workouts state detected via getRequestStatusForAuthorization
- read_weight/read_height returned as 'unknown' per Apple's privacy model
  (mockup UX delegates these to Settings link)
- saveWorkoutSample with metadata (workout name, sets, volume)
- getMostRecentQuantitySample for latest weight read
- openSystemSettings best-effort deep link to Privacy > Health

Tested on real iPhone per HealthKit requirement."
```

---

# Phase 5 — Polish & QA (4h)

## 5.1 · Edge cases verification

The sync queue (Phase 3.3) and foreground hook (Phase 3.3 / mounted in `_layout.tsx`) cover the main offline scenarios. Verify these specific cases work in Phase 5:

- **Multiple sessions completed offline** : queue accumulates, all flush on first foreground with network. Test by airplane-mode, completing 2-3 sessions, then disabling airplane and reopening the app.
- **Permission revoked mid-session** : `writeWorkout` throws → caught by mutation hook → enqueued. Next sync attempt retries; if permission is still missing, attempts++ until MAX_ATTEMPTS = 5.
- **Time zone handling** : `startedAt` / `completedAt` are stored as Date in payload, serialized to ISO with offset when queued. Health providers expect ISO with timezone — verify the actual records in Apple Santé / Health Connect show the right local time.
- **Queue corruption** : `read()` wraps `JSON.parse` in try/catch, returns empty array on failure. No app crash if MMKV value is malformed.
- **Storage quota** : MMKV has effectively no quota for our scale (50KB/queued item × 30 days × few sessions/day = trivial). No mitigation needed.

## 5.2 · Final QA matrix

Test on Android device:
- [ ] Fresh install → modal post-1st-session shows Health Connect branding
- [ ] Tap "Activer" → Health Connect activity opens
- [ ] Grant write only → Profile shows write toggle ON, others OFF
- [ ] Complete a session → workout appears in Health Connect
- [ ] Toggle a perm OFF → modal redirects to Health Connect settings
- [ ] Health Connect uninstalled → "Indisponible" card + Install CTA
- [ ] Tap Install CTA → Play Store opens

Test on iPhone (after Phase 4):
- [ ] Fresh install → modal post-1st-session shows Apple Santé branding
- [ ] Tap "Activer" → iOS native sheet appears
- [ ] Grant only Workouts (Apple sheet) → Profile shows write_workouts ON, info block visible
- [ ] Complete a session → workout appears in Apple Santé
- [ ] Tap "Lecture poids et taille" → iOS Settings opens
- [ ] Tap main toggle off → revoke modal → "Ouvrir Réglages" works

## 5.3 · Final commit

```bash
git commit -m "chore(health): edge cases + sync queue + final QA"
```

---

# What this implementation does NOT cover (intentional)

- **Apple Watch app** : would require a separate WatchOS target. Not in scope.
- **Background sync** : the plugin sets `background: false`. We rely on app foreground for sync, not background tasks.
- **Heart rate / HRV reading** : potential Phase 6 for adaptive training. Not in V1.
- **Garmin Connect** : placeholder only in mockup screen 4. Not implemented.
- **Real revocation** : impossible on both platforms by design. The "off" toggle redirects to system settings.
- **Read state detection on iOS** : impossible per Apple's privacy model. The mockup correctly shows this as a Settings-managed area, not a toggle.

---

# Coherence with mockup

Every mockup element maps to a specific implementation:

| Mockup element | Implementation |
|---|---|
| Screen 1 — Modal post-session (Apple/Android variants) | `HealthPermissionModal.tsx`, copy switched via `provider` |
| Screen 2 — iOS connected (write toggle + settings link for reads) | `ConnectedCard` with `Platform.OS === 'ios'` branch |
| Screen 3 — Android connected (3 toggles independent) | `ConnectedCard` with else branch |
| Screen 4 — Disconnected | `DisconnectedCard` (single Connect CTA) |
| Screen 5 — Unavailable (Android sans HC) | `UnavailableCard` with Install CTA |
| Screen 6 — Revoke modal | `RevokeModal` with `Linking.openSettings()` |

All visual tokens come from `useTheme()` — never inline. Sizes (38px/44px/36px), spacings (10/12/14/18px), font weights (500/700/900) come directly from the mockup `<style>` block.

---

# Process checklist

- [ ] Phase 0: read existing useTheme, create config plugin, prebuild without losing customizations
- [ ] Phase 1: install + types + Android service + dispatcher + hook
- [ ] Phase 2: HealthPermissionModal + trigger after session
- [ ] Phase 3: Connexions screen with iOS/Android branches + Profile entry + auto-sync
- [ ] Phase 4: iOS HealthKit (after Apple Developer account confirmed by user)
- [ ] Phase 5: edge cases + QA matrix

---

*Forge l'intégration. Une plateforme à la fois. Honnêtement.*

*Tanren · Une rep après l'autre.*
