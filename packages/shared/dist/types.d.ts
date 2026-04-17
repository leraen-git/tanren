export type UserLevel = 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';
export type UserGoal = 'WEIGHT_LOSS' | 'MUSCLE_GAIN' | 'MAINTENANCE';
export interface User {
    id: string;
    name: string;
    email: string;
    avatarUrl: string | null;
    level: UserLevel;
    goal: UserGoal;
    weeklyTarget: number;
    createdAt: Date;
    updatedAt: Date;
}
export type Difficulty = 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';
export interface Exercise {
    id: string;
    name: string;
    muscleGroups: string[];
    equipment: string[];
    description: string;
    videoUrl: string | null;
    imageUrl: string | null;
    difficulty: Difficulty;
    isCustom: boolean;
    userId: string | null;
}
export interface WorkoutTemplate {
    id: string;
    userId: string;
    name: string;
    description: string | null;
    muscleGroups: string[];
    estimatedDuration: number;
    isTemplate: boolean;
    isProgramWorkout: boolean;
    order: number;
    createdAt: Date;
}
export interface WorkoutExercise {
    id: string;
    workoutTemplateId: string;
    exerciseId: string;
    order: number;
    defaultSets: number;
    defaultReps: number;
    defaultWeight: number;
    defaultRestSeconds: number;
    notes: string | null;
}
export interface WorkoutSession {
    id: string;
    userId: string;
    workoutTemplateId: string;
    startedAt: Date;
    completedAt: Date | null;
    durationSeconds: number;
    totalVolume: number;
    notes: string | null;
    perceivedExertion: number | null;
}
export interface SessionExercise {
    id: string;
    workoutSessionId: string;
    exerciseId: string;
    order: number;
}
export interface ExerciseSet {
    id: string;
    sessionExerciseId: string;
    setNumber: number;
    reps: number;
    weight: number;
    restSeconds: number;
    isCompleted: boolean;
    completedAt: Date | null;
    notes: string | null;
}
export interface Program {
    id: string;
    name: string;
    description: string;
    level: UserLevel;
    goal: UserGoal;
    durationWeeks: number;
    sessionsPerWeek: number;
    imageUrl: string | null;
    isOfficial: boolean;
}
export interface PersonalRecord {
    id: string;
    userId: string;
    exerciseId: string;
    weight: number;
    reps: number;
    volume: number;
    achievedAt: Date;
    sessionId: string;
}
export type ExerciseStatus = 'improved' | 'stable' | 'declined';
export type Trend = 'improving' | 'plateauing' | 'declining';
export interface ExerciseComparison {
    exerciseId: string;
    exerciseName: string;
    previousVolume: number;
    currentVolume: number;
    delta: number;
    status: ExerciseStatus;
    isPersonalRecord: boolean;
}
export interface SessionRecap {
    sessionId: string;
    previousSessionId: string | null;
    totalVolume: number;
    previousTotalVolume: number | null;
    volumeDelta: number | null;
    improved: number;
    stable: number;
    declined: number;
    exercises: ExerciseComparison[];
    newPersonalRecords: PersonalRecord[];
}
