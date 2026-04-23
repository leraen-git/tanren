// ─── User ────────────────────────────────────────────────────────────────────

export type AuthProvider = 'apple' | 'google' | 'email' | 'guest'
export type UserLevel = 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED'
export type UserGoal = 'WEIGHT_LOSS' | 'MUSCLE_GAIN' | 'MAINTENANCE'

export interface User {
  id: string
  name: string
  email: string
  avatarUrl: string | null
  level: UserLevel
  goal: UserGoal
  weeklyTarget: number
  createdAt: Date
  updatedAt: Date
}

// ─── Exercise ────────────────────────────────────────────────────────────────

export type Difficulty = 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED'

export interface Exercise {
  id: string
  name: string
  muscleGroups: string[]
  equipment: string[]
  description: string
  videoUrl: string | null
  imageUrl: string | null
  difficulty: Difficulty
  isCustom: boolean
  userId: string | null
}

// ─── Workout ─────────────────────────────────────────────────────────────────

export interface WorkoutTemplate {
  id: string
  userId: string
  name: string
  description: string | null
  muscleGroups: string[]
  estimatedDuration: number
  isTemplate: boolean
  isProgramWorkout: boolean
  order: number
  createdAt: Date
}

export interface WorkoutExercise {
  id: string
  workoutTemplateId: string
  exerciseId: string
  order: number
  defaultSets: number
  defaultReps: number
  defaultWeight: number
  defaultRestSeconds: number
  notes: string | null
}

// ─── Session ─────────────────────────────────────────────────────────────────

export interface WorkoutSession {
  id: string
  userId: string
  workoutTemplateId: string
  startedAt: Date
  completedAt: Date | null
  durationSeconds: number
  totalVolume: number
  notes: string | null
  perceivedExertion: number | null
}

export interface SessionExercise {
  id: string
  workoutSessionId: string
  exerciseId: string
  order: number
}

export interface ExerciseSet {
  id: string
  sessionExerciseId: string
  setNumber: number
  reps: number
  weight: number
  restSeconds: number
  isCompleted: boolean
  completedAt: Date | null
  notes: string | null
}

// ─── Program ─────────────────────────────────────────────────────────────────

export interface Program {
  id: string
  name: string
  description: string
  level: UserLevel
  goal: UserGoal
  durationWeeks: number
  sessionsPerWeek: number
  imageUrl: string | null
  isOfficial: boolean
}

// ─── Progress ────────────────────────────────────────────────────────────────

export interface PersonalRecord {
  id: string
  userId: string
  exerciseId: string
  weight: number
  reps: number
  volume: number
  achievedAt: Date
  sessionId: string
}

export type ExerciseStatus = 'improved' | 'stable' | 'declined'
export type Trend = 'improving' | 'plateauing' | 'declining'

// ─── History ────────────────────────────────────────────────────────────────

export type HistoryPeriod = '1w' | '1m' | '3m' | '1y'

export interface SessionListItem {
  id: string
  workoutTemplateId: string | null
  workoutName: string
  startedAt: string
  completedAt: string | null
  durationSeconds: number | null
  totalVolume: number | null
  seriesCount: number
  muscleGroups: string[]
  prCount: number
}

export interface SessionSetDetail {
  id: string
  setNumber: number
  reps: number
  weight: number
  restSeconds: number | null
  isPR: boolean
  completedAt: string | null
}

export interface SessionExerciseDetail {
  exerciseId: string
  exerciseName: string
  order: number
  volume: number
  sets: SessionSetDetail[]
}

export interface SessionDetail {
  id: string
  workoutTemplateId: string | null
  workoutName: string
  startedAt: string
  completedAt: string | null
  durationSeconds: number | null
  totalVolume: number | null
  seriesCount: number
  muscleGroups: string[]
  exercises: SessionExerciseDetail[]
  prs: Array<{
    exerciseId: string
    exerciseName: string
    reps: number
    weight: number
  }>
}

export interface HeatmapCell {
  date: string
  volume: number
  level: 0 | 1 | 2 | 3 | 4
}

export interface HeatmapData {
  cells: HeatmapCell[]
  startDate: string
  endDate: string
  maxVolume: number
}

export interface WeeklyVolume {
  weekStart: string
  volume: number
  sessionCount: number
}

export interface HistoryStats {
  period: HistoryPeriod
  totalVolume: number
  previousPeriodVolume: number
  trendPercent: number
  heatmap: HeatmapData
  weeklyVolume: WeeklyVolume[]
  recentPRs: Array<{
    sessionId: string
    exerciseId: string
    exerciseName: string
    reps: number
    weight: number
    achievedAt: string
  }>
}

// ─── Weight Tracking ────────────────────────────────────────────────────────

export type WeightPeriod = '7d' | '30d' | '3m' | '1y'
export type WeightSource = 'MANUAL' | 'HEALTH_SYNC'
export type TrendDirection = 'UP' | 'DOWN' | 'FLAT'

export interface WeightEntry {
  id: string
  weightKg: number
  measuredAt: string
  source: WeightSource
  createdAt: string
}

export interface WeightStats {
  current: number | null
  currentMeasuredAt: string | null
  min: number | null
  avg: number | null
  max: number | null
  deltaKg: number | null
  trendDirection: TrendDirection | null
}

export interface WeightHistoryResponse {
  entries: WeightEntry[]
  stats: WeightStats
  period: WeightPeriod
}

// ─── Session Comparison ─────────────────────────────────────────────────────

export interface ExerciseComparison {
  exerciseId: string
  exerciseName: string
  previousVolume: number
  currentVolume: number
  delta: number
  status: ExerciseStatus
  isPersonalRecord: boolean
}

export interface SessionRecap {
  sessionId: string
  previousSessionId: string | null
  totalVolume: number
  previousTotalVolume: number | null
  volumeDelta: number | null
  improved: number
  stable: number
  declined: number
  exercises: ExerciseComparison[]
  newPersonalRecords: PersonalRecord[]
}
