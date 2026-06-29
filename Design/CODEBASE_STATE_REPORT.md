# Tanren Codebase State Report

Generated on: 2026-04-23
Commit: `49fb728 Profile feature: landing rewrite, weight tracking, edit modals, health placeholder`

---

## 1. Stack fundamentals

| Item | Value | Evidence |
|---|---|---|
| Expo SDK | 55.0.17 | `apps/mobile/package.json` → `"expo": "^55.0.17"` |
| React Native | 0.83.6 | `apps/mobile/package.json` → `"react-native": "0.83.6"` |
| TypeScript | 5.9.2 (mobile), 5.7.2 (api + root) | `apps/mobile/package.json`, `apps/api/package.json`, root `package.json` |
| Backend framework | Fastify 5.2.1 | `apps/api/package.json` → `"fastify": "^5.2.1"` |
| API layer | tRPC v11 (POST-only, via `@trpc/server` Fastify adapter) | `apps/api/src/index.ts:43`, `apps/mobile/src/lib/trpc.ts` |
| ORM | Drizzle ORM 0.45.2 + drizzle-kit 0.31.10 | `apps/api/package.json` |
| Database | PostgreSQL (via drizzle `pg-core`) | `apps/api/src/db/schema.ts:1` |
| Auth providers | Apple (expo-apple-authentication), Google (expo-auth-session), Email OTP, Guest | `apps/mobile/src/contexts/AuthContext.tsx` |
| State management | Zustand 5.0.3 (8 stores) | `apps/mobile/package.json`, `apps/mobile/src/stores/` |
| Data fetching | TanStack Query 5.64.1 via tRPC React Query (`@trpc/react-query`) | `apps/mobile/package.json`, `apps/mobile/src/lib/trpc.ts` |
| Navigation | Expo Router 55.0.13 (file-based) | `apps/mobile/package.json` |
| Offline / local DB | **None.** AsyncStorage for exercise cache only. No WatermelonDB, no SQLite, no MMKV. | `apps/mobile/package.json` — only `@react-native-async-storage/async-storage` and `expo-secure-store` |
| Package manager | npm 11.11.0 | root `package.json` → `"packageManager": "npm@11.11.0"`, `package-lock.json` exists |
| Monorepo tool | Turborepo + npm workspaces | `turbo.json` exists, root `package.json` has `"workspaces"` |

---

## 2. Directory tree

```
tanren/
├── apps/
│   ├── mobile/
│   │   ├── app/
│   │   │   ├── _layout.tsx              # root layout (providers, fonts, splash)
│   │   │   ├── (auth)/
│   │   │   │   └── sign-in.tsx
│   │   │   ├── (tabs)/
│   │   │   │   ├── _layout.tsx          # 5-tab navigator
│   │   │   │   ├── index.tsx            # Home
│   │   │   │   ├── workouts.tsx         # Training tab
│   │   │   │   ├── history.tsx          # History tab
│   │   │   │   ├── diet.tsx             # Diet tab
│   │   │   │   └── profile.tsx          # Profile tab
│   │   │   ├── diet/
│   │   │   │   ├── generating.tsx
│   │   │   │   └── intake.tsx
│   │   │   ├── exercise/
│   │   │   │   ├── [id].tsx
│   │   │   │   ├── library.tsx
│   │   │   │   └── quick.tsx
│   │   │   ├── history/
│   │   │   │   └── search.tsx
│   │   │   ├── onboarding/
│   │   │   │   ├── step0.tsx … step3.tsx
│   │   │   ├── plans/
│   │   │   │   ├── create.tsx
│   │   │   │   ├── generate.tsx
│   │   │   │   ├── generating.tsx
│   │   │   │   └── preview.tsx
│   │   │   ├── profile/
│   │   │   │   ├── health.tsx
│   │   │   │   └── weight.tsx
│   │   │   ├── programs/
│   │   │   │   └── [id].tsx
│   │   │   ├── session/
│   │   │   │   └── [id].tsx
│   │   │   ├── settings/
│   │   │   │   └── reminders.tsx
│   │   │   ├── workout/
│   │   │   │   ├── [id].tsx
│   │   │   │   ├── active.tsx
│   │   │   │   ├── build.tsx
│   │   │   │   ├── create.tsx
│   │   │   │   ├── preview.tsx
│   │   │   │   ├── recap.tsx
│   │   │   │   └── share.tsx
│   │   │   ├── explore.tsx
│   │   │   └── privacy.tsx
│   │   ├── src/
│   │   │   ├── components/             # 49 component files (see section 7)
│   │   │   │   └── profile/            # 13 profile-specific components
│   │   │   ├── contexts/               # AuthContext, GuestBannerContext
│   │   │   ├── hooks/                  # useExercises, useWorkletTimer
│   │   │   ├── i18n/                   # fr.ts, en.ts, index.ts
│   │   │   ├── lib/                    # trpc.ts
│   │   │   ├── services/               # auth, music, notifications, timer
│   │   │   ├── stores/                 # 8 Zustand stores
│   │   │   ├── theme/                  # ThemeContext.tsx, tokens.ts
│   │   │   └── utils/                  # format.ts, historyGrouping.ts
│   │   ├── assets/
│   │   │   └── fonts/
│   │   └── ios/
│   │
│   └── api/
│       └── src/
│           ├── index.ts                # Fastify server entry
│           ├── router.ts               # tRPC root router (12 sub-routers)
│           ├── trpc.ts                 # tRPC init, context, middleware
│           ├── redis.ts
│           ├── types.ts
│           ├── db/
│           │   ├── schema.ts           # Drizzle schema (16 tables)
│           │   ├── index.ts            # DB connection
│           │   ├── encryption.ts
│           │   ├── migrate.ts
│           │   ├── migrate-encryption.ts
│           │   ├── seed.ts
│           │   ├── seed-history.ts
│           │   ├── exercises-seed-data.ts
│           │   └── migrations/
│           ├── routers/                # 12 router files
│           │   ├── auth.ts, users.ts, workouts.ts, sessions.ts,
│           │   │   exercises.ts, progress.ts, programs.ts, plans.ts,
│           │   │   diet.ts, notifications.ts, history.ts, weight.ts
│           └── services/
│               ├── cryptoService.ts    # AES-256-GCM encrypt/decrypt
│               ├── emailService.ts     # OTP emails
│               ├── passwordService.ts  # Argon2id (ready, not yet used)
│               └── sessionService.ts   # Server-side session tokens (Redis)
│
├── packages/
│   └── shared/
│       └── src/
│           ├── index.ts
│           ├── types.ts               # All shared TypeScript interfaces
│           ├── constants.ts           # MUSCLE_GROUPS, EQUIPMENT_TYPES, timer constants
│           └── utils/
│               ├── progression.ts
│               └── progression.test.ts
│
└── Design/                            # (capital D — both `design/` and `Design/` exist)
    ├── Tanren_Core_Flow_v2.html
    ├── Tanren_Lot2_Data_Tabs.html
    ├── Tanren_Lot3_Creation_Diet.html
    ├── Tanren_Lot4_Missing_Screens.html
    ├── Tanren_History_Enhancements.html
    ├── Tanren_Profile_Redesign.html
    ├── Tanren_Profile_Secondary_Screens.html
    ├── CLAUDE_Profile_Implementation.md
    ├── CLAUDE_History_Implementation.md
    ├── CLAUDE_Charter_Application.md
    ├── CHARTER_AUDIT_CHECKLIST.md
    └── CHARTER_CHANGES.md
```

---

## 3. Shared types and schemas

**Location:** `packages/shared/src/types.ts` — all shared TypeScript interfaces.

**Zod schemas:** No standalone Zod schema files. Zod is used **inline in tRPC routers** for input validation (e.g. `z.object({...})` in `.input()`). No shared Zod schemas package.

### Enums (DB-level, in `apps/api/src/db/schema.ts`)

```
userLevelEnum:    ['BEGINNER', 'INTERMEDIATE', 'ADVANCED']
userGoalEnum:     ['WEIGHT_LOSS', 'MUSCLE_GAIN', 'MAINTENANCE']
difficultyEnum:   ['BEGINNER', 'INTERMEDIATE', 'ADVANCED']
weightSourceEnum: ['MANUAL', 'HEALTH_SYNC']
```

### Enums (TypeScript-level, in `packages/shared/src/types.ts`)

```
UserLevel:        'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED'
UserGoal:         'WEIGHT_LOSS' | 'MUSCLE_GAIN' | 'MAINTENANCE'
Difficulty:       'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED'
ExerciseStatus:   'improved' | 'stable' | 'declined'
Trend:            'improving' | 'plateauing' | 'declining'
HistoryPeriod:    '1w' | '1m' | '3m' | '1y'
WeightPeriod:     '7d' | '30d' | '3m' | '1y'
WeightSource:     'MANUAL' | 'HEALTH_SYNC'
TrendDirection:   'UP' | 'DOWN' | 'FLAT'
```

### DB tables (16 total)

```
users
exercises
workoutTemplates (workout_templates)
workoutExercises (workout_exercises)
workoutSessions (workout_sessions)
sessionExercises (session_exercises)
exerciseSets (exercise_sets)
programs
programEnrollments (program_enrollments)
workoutPlans (workout_plans)
workoutPlanDays (workout_plan_days)
personalRecords (personal_records)
dietProfiles (diet_profiles)
dietPlans (diet_plans)
weightEntries (weight_entries)
notificationPreferences (notification_preferences)
```

---

## 4. User model (exact columns)

```
users {
  id:              text       PK, default crypto.randomUUID()
  authId:          text       NOT NULL, UNIQUE
  authProvider:    text       NOT NULL, default 'apple'
  name:            text       NOT NULL
  email:           text       NOT NULL
  emailHash:       text       nullable
  avatarUrl:       text       nullable
  level:           userLevelEnum  NOT NULL, default 'BEGINNER'
  goal:            userGoalEnum   NOT NULL, default 'MUSCLE_GAIN'
  weeklyTarget:    integer    NOT NULL, default 3
  heightCm:        real       nullable
  weightKg:        real       nullable
  gender:          text       nullable
  onboardingDone:  boolean    NOT NULL, default false
  createdAt:       timestamp  NOT NULL, default now()
  updatedAt:       timestamp  NOT NULL, default now()
}
```

Notes:
- `authProvider` is free text (not an enum). Values used in code: `'apple'`, `'google'`, `'email'`, `'guest'`.
- `email` is encrypted at rest (AES-256-GCM via `cryptoService.ts`). `emailHash` stores deterministic SHA-256 for lookups.
- `weightKg` is `real` (float), not `decimal`. Same for `heightCm`.
- No `deletedAt` / soft-delete column exists. `deleteMe` procedure does hard delete.

---

## 5. Auth and guest mode

### Implementation
Custom auth — no Clerk, no Supabase Auth, no Firebase. Server-side opaque session tokens stored in Redis (not JWTs for session state).

Flow:
1. Mobile calls `auth.signInWithApple` / `auth.signInWithGoogle` / `auth.verifyOtp` / `auth.guestSignIn`
2. API creates a session via `sessionService.ts` → `crypto.randomBytes(32).toString('base64url')` stored in Redis
3. Token returned to mobile, stored in `expo-secure-store` via `authTokenService.ts`
4. Every request: `Authorization: Bearer <token>` → validated via `validateSession()` in `apps/api/src/index.ts:55`

### AuthContext exposes
```ts
{
  status: 'loading' | 'unauthenticated' | 'authenticated'
  token: string | null
  signInWithApple: () => Promise<void>
  signInWithGoogle: () => Promise<void>
  googleAvailable: boolean
  requestOtp: (email: string) => Promise<void>
  verifyOtp: (email: string, code: string) => Promise<void>
  signInAsGuest: () => Promise<void>
  devSignIn: () => Promise<void>
  signOut: () => Promise<void>
}
```

### Guest detection
On the API response: `user.authProvider === 'guest'`. The `_layout.tsx` `AuthGate` component queries `trpc.users.me` and passes `isGuest` into `GuestBannerProvider`.

### Token storage
`expo-secure-store` — key `tanren_auth_token`. Legacy migration from `fittrack_auth_token`.

### Public vs protected procedures
**Public:** `auth.signInWithApple`, `auth.signInWithGoogle`, `auth.requestOtp`, `auth.verifyOtp`, `auth.guestSignIn`, `auth.devSignIn`, `auth.me`
**Protected:** Everything else (all procedures in users, workouts, sessions, exercises, progress, programs, plans, diet, notifications, history, weight routers + `auth.signOut`).

---

## 6. Existing hooks and contexts

### Contexts

```
AuthContext (apps/mobile/src/contexts/AuthContext.tsx)
  Purpose: manages auth state, provides sign-in/sign-out methods
  Returns: { status, token, signInWithApple, signInWithGoogle, googleAvailable,
             requestOtp, verifyOtp, signInAsGuest, devSignIn, signOut }

GuestBannerContext (apps/mobile/src/contexts/GuestBannerContext.tsx)
  Purpose: broadcasts whether the current user is a guest (for banner visibility)
  Returns: boolean (true = guest banner visible)
```

### Hooks

```
useExercises (apps/mobile/src/hooks/useExercises.ts)
  Purpose: fetches exercise list once, caches in AsyncStorage, provides locale-aware names
  Returns: { exercises: Exercise[], isLoading: boolean }

useWorkletTimer (apps/mobile/src/hooks/useWorkletTimer.ts)
  Purpose: drives rest timer via Reanimated UI-thread frame callback (avoids JS thread jank)
  Returns: void (reads/writes timerStore directly)
```

### Zustand stores

```
useActiveSessionStore (apps/mobile/src/stores/activeSessionStore.ts)
  Purpose: tracks active workout session state (exercises, sets, current index)

useAIPlanStore (apps/mobile/src/stores/aiPlanStore.ts)
  Purpose: holds AI-generated plan data during generation flow

useDietIntakeStore (apps/mobile/src/stores/dietIntakeStore.ts)
  Purpose: holds multi-step diet intake form state

useHistoryStore (apps/mobile/src/stores/historyStore.ts)
  Purpose: tracks history tab UI state (filters, selected period)

useNotificationSettingsStore (apps/mobile/src/stores/notificationSettingsStore.ts)
  Purpose: local notification preferences (synced with API)

usePendingWorkoutStore (apps/mobile/src/stores/pendingWorkoutStore.ts)
  Purpose: holds workout builder state before save

useProfileStore (apps/mobile/src/stores/profileStore.ts)
  Purpose: manages which profile edit modal is open
  Returns: { activeModal, openModal, closeModal }

useTimerStore / timerStore (apps/mobile/src/stores/timerStore.ts)
  Purpose: rest timer state (seconds, isRunning, tick). Dual export: Zustand hook + vanilla store for worklet access.
```

### Services

```
authTokenService (apps/mobile/src/services/authTokenService.ts)
  Purpose: SecureStore read/write/clear for auth token

musicService (apps/mobile/src/services/musicService.ts)
  Purpose: background music detection / control during workouts

notificationPermissions (apps/mobile/src/services/notificationPermissions.ts)
  Purpose: check/request notification permission

notificationScheduler (apps/mobile/src/services/notificationScheduler.ts)
  Purpose: schedule local notifications for workouts/meals/hydration

timerService (apps/mobile/src/services/timerService.ts)
  Purpose: timer business logic (start, stop, adjust)

timerSoundService (apps/mobile/src/services/timerSoundService.ts)
  Purpose: plays sound when timer completes
```

---

## 7. Existing UI components

### Atoms
| Component | File |
|---|---|
| Button | `src/components/Button.tsx` |
| Input | `src/components/Input.tsx` |
| Chip | `src/components/Chip.tsx` |
| Stepper | `src/components/Stepper.tsx` |
| RadioItem | `src/components/RadioItem.tsx` |
| CornerAccent | `src/components/CornerAccent.tsx` |
| KanjiWatermark | `src/components/KanjiWatermark.tsx` |
| ForgeMark | `src/components/ForgeMark.tsx` |
| GhostValue | `src/components/GhostValue.tsx` |
| PillFilter | `src/components/PillFilter.tsx` |
| CompareBadge | `src/components/CompareBadge.tsx` |
| ProgressBar | `src/components/ProgressBar.tsx` |
| ViewToggle | `src/components/ViewToggle.tsx` |
| DayPicker | `src/components/DayPicker.tsx` |
| BackgroundGrid | `src/components/BackgroundGrid.tsx` |

### Molecules
| Component | File |
|---|---|
| StatsStrip | `src/components/StatsStrip.tsx` |
| MacroRow | `src/components/MacroRow.tsx` |
| MacrosInline | `src/components/MacrosInline.tsx` |
| ProfileRow | `src/components/ProfileRow.tsx` |
| SetRow | `src/components/SetRow.tsx` |
| FiltersRow | `src/components/FiltersRow.tsx` |
| StatCard | `src/components/StatCard.tsx` |
| PRRecordItem | `src/components/PRRecordItem.tsx` |
| SectionHeaderTemporal | `src/components/SectionHeaderTemporal.tsx` |

### Organisms
| Component | File |
|---|---|
| Card | `src/components/Card.tsx` |
| SessionCard | `src/components/SessionCard.tsx` |
| SessionHero | `src/components/SessionHero.tsx` |
| ExerciseBlock | `src/components/ExerciseBlock.tsx` |
| ExerciseCard | `src/components/ExerciseCard.tsx` |
| MealCard | `src/components/MealCard.tsx` |
| MealDetailModal | `src/components/MealDetailModal.tsx` |
| VolumeFeedback | `src/components/VolumeFeedback.tsx` |
| PRBanner | `src/components/PRBanner.tsx` |
| TimerRing | `src/components/TimerRing.tsx` |
| MusicControlBar | `src/components/MusicControlBar.tsx` |
| TimePickerModal | `src/components/TimePickerModal.tsx` |
| SkeletonCard | `src/components/SkeletonCard.tsx` |
| EmptyStateHistory | `src/components/EmptyStateHistory.tsx` |
| GuestBanner | `src/components/GuestBanner.tsx` |

### Charts
| Component | File |
|---|---|
| BarChart | `src/components/BarChart.tsx` |
| LineChart | `src/components/LineChart.tsx` |
| WeeklyVolumeChart | `src/components/WeeklyVolumeChart.tsx` |
| HeatmapGrid | `src/components/HeatmapGrid.tsx` |
| HistoryHeatmap | `src/components/HistoryHeatmap.tsx` |

### Layout
| Component | File |
|---|---|
| Screen | `src/components/Screen.tsx` |
| ScreenHeader | `src/components/ScreenHeader.tsx` |
| SplashScreen | `src/components/SplashScreen.tsx` |
| ErrorBoundary | `src/components/ErrorBoundary.tsx` |
| BottomSheetShell | `src/components/BottomSheetShell.tsx` |

### Profile-specific (in `src/components/profile/`)
| Component | File |
|---|---|
| EditFirstNameModal | `profile/EditFirstNameModal.tsx` |
| EditHeightModal | `profile/EditHeightModal.tsx` |
| EditTrainingLevelModal | `profile/EditTrainingLevelModal.tsx` |
| EditTrainingGoalModal | `profile/EditTrainingGoalModal.tsx` |
| EditSessionsPerWeekModal | `profile/EditSessionsPerWeekModal.tsx` |
| LogoutConfirmModal | `profile/LogoutConfirmModal.tsx` |
| AddWeightModal | `profile/AddWeightModal.tsx` |
| WeightHero | `profile/WeightHero.tsx` |
| WeightChart | `profile/WeightChart.tsx` |
| WeightChartStats | `profile/WeightChartStats.tsx` |
| WeightEntryRow | `profile/WeightEntryRow.tsx` |
| PeriodTabs | `profile/PeriodTabs.tsx` |
| QuickSetButton | `profile/QuickSetButton.tsx` |

### Bottom sheet details

**`@gorhom/bottom-sheet` is NOT installed.** The codebase uses a custom `BottomSheetShell` component.

**BottomSheetShell API:**
```ts
interface BottomSheetShellProps {
  open: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
  actions?: React.ReactNode
}
```

Uses `react-native-reanimated` (withTiming, 280ms) + `react-native-gesture-handler` (pan gesture to swipe-down dismiss). Renders as absolute overlay with animated backdrop.

**Usage example** (from `EditTrainingLevelModal.tsx`):
```tsx
<BottomSheetShell open={open} onClose={onClose} title={t('profile.editLevelTitle')}>
  {/* RadioItem list */}
  <Button ... />
</BottomSheetShell>
```

### Other specific checks

- **No `InlineField` or `EditableField` component exists.**
- **No `ChipSelector` or multi-select component exists.** Multi-select is done with arrays of `Chip` components inline in screens.

---

## 8. Existing API routers / endpoints

### auth.ts
| Procedure | Auth | Type |
|---|---|---|
| signInWithApple | public | mutation |
| signInWithGoogle | public | mutation |
| requestOtp | public | mutation |
| verifyOtp | public | mutation |
| guestSignIn | public | mutation |
| devSignIn | public | mutation |
| me | public | query |
| signOut | protected | mutation |

### users.ts
| Procedure | Auth | Type |
|---|---|---|
| me | protected | query |
| updateMe | protected | mutation |
| deleteMe | protected | mutation |

### workouts.ts
| Procedure | Auth | Type |
|---|---|---|
| list | protected | query |
| create | protected | mutation |
| byId | protected | query |
| update | protected | mutation |
| delete | protected | mutation |
| duplicate | protected | mutation |
| exerciseHistory | protected | query |

### sessions.ts
| Procedure | Auth | Type |
|---|---|---|
| start | protected | mutation |
| complete | protected | mutation |
| byId | protected | query |
| save | protected | mutation |
| history | protected | query |
| saveQuick | protected | mutation |

### exercises.ts
| Procedure | Auth | Type |
|---|---|---|
| list | protected | query |
| byId | protected | query |
| create | protected | mutation |

### progress.ts
| Procedure | Auth | Type |
|---|---|---|
| lastSessionPRCount | protected | query |
| records | protected | query |
| heatmap | protected | query |
| exercise | protected | query |
| sessionRecap | protected | query |

### programs.ts
| Procedure | Auth | Type |
|---|---|---|
| list | protected | query |
| byId | protected | query |
| enroll | protected | mutation |

### plans.ts
| Procedure | Auth | Type |
|---|---|---|
| list | protected | query |
| active | protected | query |
| create | protected | mutation |
| update | protected | mutation |
| activate | protected | mutation |
| delete | protected | mutation |
| generateWithAI | protected | mutation |
| acceptGenerated | protected | mutation |

### diet.ts
| Procedure | Auth | Type |
|---|---|---|
| planCount | protected | query |
| activePlan | protected | query |
| todayMeals | protected | query |
| savedProfile | protected | query |
| generatePlan | protected | mutation |
| deletePlan | protected | mutation |
| restoreLastPlan | protected | mutation |

### notifications.ts
| Procedure | Auth | Type |
|---|---|---|
| getPreferences | protected | query |
| upsertPreferences | protected | mutation |

### history.ts
| Procedure | Auth | Type |
|---|---|---|
| list | protected | query |
| detail | protected | query |
| search | protected | query |
| stats | protected | query |

### weight.ts
| Procedure | Auth | Type |
|---|---|---|
| list | protected | query |
| add | protected | mutation |
| delete | protected | mutation |

---

## 9. Design conventions

### Theming
- `useTheme()` hook via React Context (`apps/mobile/src/theme/ThemeContext.tsx`)
- Returns `{ tokens, fonts, scheme, isDark, preference, setTheme }`
- Tokens defined in `apps/mobile/src/theme/tokens.ts` — `darkTheme` and `lightTheme` objects
- Preference persisted to filesystem via `expo-file-system` (not AsyncStorage)
- Supports `'light' | 'dark' | 'system'`

### Typography
All 3 font families loaded in `apps/mobile/app/_layout.tsx`:
- **Barlow Condensed**: 300 Light, 400 Regular, 500 Medium, 700 Bold, 900 Black (via `@expo-google-fonts/barlow-condensed`)
- **Noto Serif JP**: 700 Bold + 900 Black — **subsetted** to only `鍛錬` characters (~2.7KB each), loaded from `assets/fonts/` as TTF
- **JetBrains Mono**: 400 Regular + 700 Bold (via `@expo-google-fonts/jetbrains-mono`)

Font aliases in tokens: `sans`, `sansM`, `sansB`, `sansX`, `jp`, `jpX`, `mono`, `monoB`

### i18n
- Library: `i18next` + `react-i18next`
- Locales: `fr.ts` (primary) and `en.ts` (fallback)
- Auto-detects device locale via `expo-localization` → defaults to `fr` if French, `en` otherwise
- Used via `useTranslation()` hook → `t('key')` pattern
- Strings are **flat key-value** (no namespaces), nested object structure (e.g. `t('profile.fieldName')`)

### Icons
- **`@expo/vector-icons` (Ionicons)** — only used in 2 files: `(tabs)/_layout.tsx` (tab bar icons) and `(tabs)/history.tsx`
- Most UI uses plain Unicode characters or custom SVG (`react-native-svg`)
- No `lucide-react-native` installed

### Forms
- **No form library installed.** No `react-hook-form`, no Formik.
- All forms use controlled components with `useState` or Zustand stores directly.

### Animations
- `react-native-reanimated` 4.2.1 — installed and actively used (BottomSheetShell, SplashScreen, timer, etc.)
- `react-native-gesture-handler` 2.30.0 — installed, `GestureHandlerRootView` wraps the app root
- Animation style: `withTiming` preferred (no `withSpring` — user preference for minimal animations)

---

## 10. Flags and inconsistencies

1. **Design folder casing**: Both `design/` and `Design/` appear to exist (or are the same on macOS case-insensitive FS). Git may track one casing; the actual directory is `Design/`.

2. **Two `auth.me` procedures**: `auth.me` is public (in `auth.ts`), `users.me` is protected (in `users.ts`). Both query the current user. `auth.me` returns null if no session; `users.me` throws UNAUTHORIZED.

3. **No offline support**: CLAUDE.md specifies WatermelonDB for offline-first, but nothing is installed. The app is fully online-dependent.

4. **No form library**: CLAUDE.md specifies `react-hook-form`, but it's not installed. All forms use raw `useState`.

5. **`authProvider` is free text, not an enum**: The `users` table stores `authProvider` as `text`, not a pgEnum. Values are convention-based strings.

6. **TypeScript version mismatch**: Mobile uses 5.9.2, API uses 5.7.2. Not a problem currently but could cause divergence.

7. **`weightKg` on users table is `real` (float)**: CLAUDE.md specifies `Decimal(5,1)`. Floats have precision issues for weight values.

8. **No `SessionStatus` enum in DB**: CLAUDE.md defines `IN_PROGRESS | DONE | ABANDONED`, but `workoutSessions` has no status column. Completion is inferred from `completedAt` being null or not.

9. **`react-hook-form` referenced in CLAUDE.md but not installed**: Zod is listed in CLAUDE.md as shared validation but is only used inline in tRPC router inputs (no shared schema package).

10. **Shared types diverge from DB schema**: `packages/shared/src/types.ts` `User` interface does not include `authProvider`, `heightCm`, `weightKg`, `gender`, `onboardingDone`, `emailHash`, `authId` — these are returned by the API but not typed in the shared package.

---

## 11. Unanswered / need clarification

1. **Is `design/` or `Design/` the canonical folder name?** macOS is case-insensitive so both resolve, but git may track a specific casing.

2. **Which icon approach going forward?** Only Ionicons in 2 files, most UI is custom. Should new screens use Ionicons, a different library, or stay with custom SVG/Unicode?

3. **Is WatermelonDB still planned for V1?** It's in CLAUDE.md but nothing is installed. This affects every new feature's data layer design.

4. **Should shared types be updated to match the full DB schema?** The `User` interface in shared is missing many fields that the API actually returns.

5. **No `Tanren_Login.html` or `Tanren_Health_Prompts.html` found in `Design/`.** These are referenced in CLAUDE.md section 11 but don't exist on disk.
