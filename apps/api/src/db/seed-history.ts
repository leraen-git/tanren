import { db } from './index.js'
import {
  users,
  exercises,
  workoutTemplates,
  workoutExercises,
  workoutSessions,
  sessionExercises,
  exerciseSets,
  personalRecords,
} from './schema.js'
import { eq } from 'drizzle-orm'

async function seedHistory() {
  // Get dev user
  const [user] = await db.select().from(users).where(eq(users.clerkId, 'dev_user'))
  if (!user) throw new Error('Dev user not found — run db:seed first')

  // Get key exercises by name
  const allExercises = await db.select().from(exercises)
  const find = (name: string) => {
    const ex = allExercises.find((e) => e.name === name)
    if (!ex) throw new Error(`Exercise not found: ${name}`)
    return ex
  }

  const benchPress = find('Barbell Bench Press')
  const overheadPress = find('Overhead Press')
  const tricepPushdown = find('Tricep Pushdown')
  const pullUp = find('Pull-Up')
  const barbellRow = find('Barbell Row')
  const latPulldown = find('Lat Pulldown')
  const squat = find('Barbell Squat')
  const romanianDeadlift = find('Romanian Deadlift')
  const legPress = find('Leg Press')

  // Create 3 workout templates: Push, Pull, Legs
  console.log('Creating workout templates...')
  await db.delete(workoutTemplates).where(eq(workoutTemplates.userId, user.id))

  const [pushTemplate] = await db.insert(workoutTemplates).values({
    userId: user.id,
    name: 'Push Day',
    description: 'Chest, shoulders, triceps',
    muscleGroups: ['Chest', 'Shoulders', 'Triceps'],
    estimatedDuration: 60,
    isTemplate: true,
    isProgramWorkout: false,
    order: 0,
  }).returning()

  const [pullTemplate] = await db.insert(workoutTemplates).values({
    userId: user.id,
    name: 'Pull Day',
    description: 'Back and biceps',
    muscleGroups: ['Back', 'Biceps'],
    estimatedDuration: 60,
    isTemplate: true,
    isProgramWorkout: false,
    order: 1,
  }).returning()

  const [legsTemplate] = await db.insert(workoutTemplates).values({
    userId: user.id,
    name: 'Leg Day',
    description: 'Quads, hamstrings, glutes',
    muscleGroups: ['Quadriceps', 'Hamstrings', 'Glutes'],
    estimatedDuration: 70,
    isTemplate: true,
    isProgramWorkout: false,
    order: 2,
  }).returning()

  // Workout exercises per template
  await db.insert(workoutExercises).values([
    { workoutTemplateId: pushTemplate!.id, exerciseId: benchPress.id, order: 0, defaultSets: 4, defaultReps: 8, defaultWeight: 80, defaultRestSeconds: 120 },
    { workoutTemplateId: pushTemplate!.id, exerciseId: overheadPress.id, order: 1, defaultSets: 3, defaultReps: 10, defaultWeight: 50, defaultRestSeconds: 90 },
    { workoutTemplateId: pushTemplate!.id, exerciseId: tricepPushdown.id, order: 2, defaultSets: 3, defaultReps: 12, defaultWeight: 30, defaultRestSeconds: 60 },
  ])

  await db.insert(workoutExercises).values([
    { workoutTemplateId: pullTemplate!.id, exerciseId: pullUp.id, order: 0, defaultSets: 4, defaultReps: 8, defaultWeight: 0, defaultRestSeconds: 120 },
    { workoutTemplateId: pullTemplate!.id, exerciseId: barbellRow.id, order: 1, defaultSets: 4, defaultReps: 8, defaultWeight: 70, defaultRestSeconds: 90 },
    { workoutTemplateId: pullTemplate!.id, exerciseId: latPulldown.id, order: 2, defaultSets: 3, defaultReps: 12, defaultWeight: 55, defaultRestSeconds: 60 },
  ])

  await db.insert(workoutExercises).values([
    { workoutTemplateId: legsTemplate!.id, exerciseId: squat.id, order: 0, defaultSets: 4, defaultReps: 6, defaultWeight: 100, defaultRestSeconds: 180 },
    { workoutTemplateId: legsTemplate!.id, exerciseId: romanianDeadlift.id, order: 1, defaultSets: 3, defaultReps: 10, defaultWeight: 80, defaultRestSeconds: 120 },
    { workoutTemplateId: legsTemplate!.id, exerciseId: legPress.id, order: 2, defaultSets: 3, defaultReps: 12, defaultWeight: 120, defaultRestSeconds: 90 },
  ])

  console.log('Templates created.')

  // Generate 12 weeks of sessions (3 per week: Push / Pull / Legs)
  // Starting weight + ~2% progressive overload per week
  console.log('Generating 12 weeks of session history...')

  const templates = [
    {
      template: pushTemplate!,
      exercises: [
        { ex: benchPress, sets: 4, baseReps: 8, baseWeight: 70 },
        { ex: overheadPress, sets: 3, baseReps: 10, baseWeight: 45 },
        { ex: tricepPushdown, sets: 3, baseReps: 12, baseWeight: 25 },
      ],
    },
    {
      template: pullTemplate!,
      exercises: [
        { ex: pullUp, sets: 4, baseReps: 6, baseWeight: 0 },
        { ex: barbellRow, sets: 4, baseReps: 8, baseWeight: 60 },
        { ex: latPulldown, sets: 3, baseReps: 12, baseWeight: 50 },
      ],
    },
    {
      template: legsTemplate!,
      exercises: [
        { ex: squat, sets: 4, baseReps: 6, baseWeight: 90 },
        { ex: romanianDeadlift, sets: 3, baseReps: 10, baseWeight: 70 },
        { ex: legPress, sets: 3, baseReps: 12, baseWeight: 110 },
      ],
    },
  ]

  const now = new Date()
  const prMap = new Map<string, { weight: number; volume: number; sessionId: string; achievedAt: Date }>()

  for (let week = 11; week >= 0; week--) {
    // 3 sessions per week spaced Mon/Wed/Fri
    const daysOffset = [week * 7 + 6, week * 7 + 4, week * 7 + 2]

    for (let dayIdx = 0; dayIdx < 3; dayIdx++) {
      const templateData = templates[dayIdx]!
      const sessionDate = new Date(now)
      sessionDate.setDate(now.getDate() - daysOffset[dayIdx]!)
      sessionDate.setHours(7 + Math.floor(Math.random() * 4), 0, 0, 0)

      // Progressive overload: +2% per week with small random variance
      const progressFactor = 1 + (11 - week) * 0.02
      const jitter = () => 1 + (Math.random() - 0.5) * 0.03

      let totalVolume = 0
      const completedAt = new Date(sessionDate.getTime() + 65 * 60 * 1000)

      const [session] = await db.insert(workoutSessions).values({
        userId: user.id,
        workoutTemplateId: templateData.template.id,
        startedAt: sessionDate,
        completedAt,
        durationSeconds: 65 * 60,
        totalVolume: 0, // update after sets
        perceivedExertion: Math.floor(Math.random() * 3) + 6,
      }).returning()

      for (const exData of templateData.exercises) {
        const [sessEx] = await db.insert(sessionExercises).values({
          workoutSessionId: session!.id,
          exerciseId: exData.ex.id,
          order: templateData.exercises.indexOf(exData),
        }).returning()

        const weight = exData.baseWeight === 0
          ? 0
          : Math.round((exData.baseWeight * progressFactor * jitter()) / 2.5) * 2.5

        let exVolume = 0
        for (let setNum = 1; setNum <= exData.sets; setNum++) {
          const reps = exData.baseReps + (Math.random() > 0.7 ? 1 : 0)
          const setVol = reps * (weight || exData.baseReps)
          exVolume += setVol
          totalVolume += setVol

          await db.insert(exerciseSets).values({
            sessionExerciseId: sessEx!.id,
            setNumber: setNum,
            reps,
            weight,
            restSeconds: 90,
            isCompleted: true,
            completedAt: new Date(sessionDate.getTime() + setNum * 4 * 60 * 1000),
          })
        }

        // Track personal records
        const prKey = exData.ex.id
        const existing = prMap.get(prKey)
        if (!existing || weight > existing.weight || exVolume > existing.volume) {
          prMap.set(prKey, { weight, volume: exVolume, sessionId: session!.id, achievedAt: completedAt })
        }
      }

      // Update session total volume
      await db.update(workoutSessions)
        .set({ totalVolume })
        .where(eq(workoutSessions.id, session!.id))
    }
  }

  // Insert personal records
  console.log('Inserting personal records...')
  for (const [exerciseId, pr] of prMap.entries()) {
    await db.insert(personalRecords).values({
      userId: user.id,
      exerciseId,
      weight: pr.weight,
      reps: 1,
      volume: pr.volume,
      achievedAt: pr.achievedAt,
      sessionId: pr.sessionId,
    }).onConflictDoNothing()
  }

  console.log(`Generated 36 sessions across 12 weeks with personal records.`)
  console.log('History seed complete!')
  process.exit(0)
}

seedHistory().catch((e) => {
  console.error(e)
  process.exit(1)
})
