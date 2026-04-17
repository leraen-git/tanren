import type { ExerciseStatus, Trend } from '../types.js';
export declare function calcSetVolume(reps: number, weight: number): number;
export declare function calcExerciseVolume(sets: Array<{
    reps: number;
    weight: number;
    isCompleted: boolean;
}>): number;
export declare function calcSessionVolume(exercises: Array<{
    sets: Array<{
        reps: number;
        weight: number;
        isCompleted: boolean;
    }>;
}>): number;
export declare function calcDelta(current: number, previous: number): number;
export declare function getExerciseStatus(delta: number): ExerciseStatus;
export declare function getTrend(last5sessions: number[]): Trend;
export declare function getCoachingTip(exerciseName: string, trend: Trend, currentMax: number): string;
