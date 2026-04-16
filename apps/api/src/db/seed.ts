import { db } from './index.js'
import { exercises, programs, users } from './schema.js'
import { WORKOUT_COOL_EXERCISES } from './exercises-seed-data.js'

const SEED_EXERCISES = [
  // Chest
  { name: 'Barbell Bench Press', muscleGroups: ['Chest', 'Triceps', 'Shoulders'], equipment: ['Barbell'], difficulty: 'INTERMEDIATE' as const, description: 'Compound chest press with barbell on flat bench.' },
  { name: 'Incline Dumbbell Press', muscleGroups: ['Chest', 'Shoulders'], equipment: ['Dumbbell'], difficulty: 'INTERMEDIATE' as const, description: 'Upper chest focus using inclined bench.' },
  { name: 'Cable Fly', muscleGroups: ['Chest'], equipment: ['Cable'], difficulty: 'BEGINNER' as const, description: 'Isolation fly movement using cables.' },
  { name: 'Push-Up', muscleGroups: ['Chest', 'Triceps', 'Shoulders'], equipment: ['Bodyweight'], difficulty: 'BEGINNER' as const, description: 'Classic bodyweight push-up.' },
  { name: 'Dumbbell Fly', muscleGroups: ['Chest'], equipment: ['Dumbbell'], difficulty: 'BEGINNER' as const, description: 'Isolation chest exercise with dumbbells.' },
  { name: 'Decline Bench Press', muscleGroups: ['Chest', 'Triceps'], equipment: ['Barbell'], difficulty: 'INTERMEDIATE' as const, description: 'Lower chest focus on decline bench.' },
  { name: 'Machine Chest Press', muscleGroups: ['Chest', 'Triceps'], equipment: ['Machine'], difficulty: 'BEGINNER' as const, description: 'Guided chest press using machine.' },
  { name: 'Pec Deck', muscleGroups: ['Chest'], equipment: ['Machine'], difficulty: 'BEGINNER' as const, description: 'Isolation fly on pec deck machine.' },

  // Back
  { name: 'Deadlift', muscleGroups: ['Back', 'Hamstrings', 'Glutes'], equipment: ['Barbell'], difficulty: 'ADVANCED' as const, description: 'King of all compound lifts.' },
  { name: 'Pull-Up', muscleGroups: ['Back', 'Biceps'], equipment: ['Bodyweight'], difficulty: 'INTERMEDIATE' as const, description: 'Bodyweight pull-up using overhead bar.' },
  { name: 'Barbell Row', muscleGroups: ['Back', 'Biceps'], equipment: ['Barbell'], difficulty: 'INTERMEDIATE' as const, description: 'Bent-over barbell row for back thickness.' },
  { name: 'Lat Pulldown', muscleGroups: ['Back', 'Biceps'], equipment: ['Cable'], difficulty: 'BEGINNER' as const, description: 'Cable lat pulldown to build width.' },
  { name: 'Seated Cable Row', muscleGroups: ['Back', 'Biceps'], equipment: ['Cable'], difficulty: 'BEGINNER' as const, description: 'Horizontal cable row for back thickness.' },
  { name: 'T-Bar Row', muscleGroups: ['Back'], equipment: ['Barbell'], difficulty: 'INTERMEDIATE' as const, description: 'T-bar row for mid-back development.' },
  { name: 'Single Arm Dumbbell Row', muscleGroups: ['Back', 'Biceps'], equipment: ['Dumbbell'], difficulty: 'BEGINNER' as const, description: 'Unilateral row to correct imbalances.' },
  { name: 'Face Pull', muscleGroups: ['Back', 'Shoulders'], equipment: ['Cable'], difficulty: 'BEGINNER' as const, description: 'Rear delt and upper back exercise.' },

  // Shoulders
  { name: 'Overhead Press', muscleGroups: ['Shoulders', 'Triceps'], equipment: ['Barbell'], difficulty: 'INTERMEDIATE' as const, description: 'Standing barbell press overhead.' },
  { name: 'Dumbbell Lateral Raise', muscleGroups: ['Shoulders'], equipment: ['Dumbbell'], difficulty: 'BEGINNER' as const, description: 'Isolation for lateral deltoid head.' },
  { name: 'Arnold Press', muscleGroups: ['Shoulders'], equipment: ['Dumbbell'], difficulty: 'INTERMEDIATE' as const, description: 'Rotating dumbbell press for full delt development.' },
  { name: 'Front Raise', muscleGroups: ['Shoulders'], equipment: ['Dumbbell'], difficulty: 'BEGINNER' as const, description: 'Isolation for anterior deltoid.' },
  { name: 'Reverse Fly', muscleGroups: ['Shoulders', 'Back'], equipment: ['Dumbbell'], difficulty: 'BEGINNER' as const, description: 'Rear delt isolation exercise.' },
  { name: 'Cable Lateral Raise', muscleGroups: ['Shoulders'], equipment: ['Cable'], difficulty: 'BEGINNER' as const, description: 'Constant tension lateral raise using cable.' },

  // Biceps
  { name: 'Barbell Curl', muscleGroups: ['Biceps'], equipment: ['Barbell'], difficulty: 'BEGINNER' as const, description: 'Classic barbell bicep curl.' },
  { name: 'Dumbbell Curl', muscleGroups: ['Biceps'], equipment: ['Dumbbell'], difficulty: 'BEGINNER' as const, description: 'Alternating dumbbell curl.' },
  { name: 'Hammer Curl', muscleGroups: ['Biceps', 'Forearms'], equipment: ['Dumbbell'], difficulty: 'BEGINNER' as const, description: 'Neutral grip curl for brachialis.' },
  { name: 'Incline Dumbbell Curl', muscleGroups: ['Biceps'], equipment: ['Dumbbell'], difficulty: 'BEGINNER' as const, description: 'Long head bicep focus on incline.' },
  { name: 'Cable Curl', muscleGroups: ['Biceps'], equipment: ['Cable'], difficulty: 'BEGINNER' as const, description: 'Constant tension bicep curl on cable.' },
  { name: 'Preacher Curl', muscleGroups: ['Biceps'], equipment: ['Barbell'], difficulty: 'BEGINNER' as const, description: 'Strict curl on preacher bench.' },
  { name: 'Concentration Curl', muscleGroups: ['Biceps'], equipment: ['Dumbbell'], difficulty: 'BEGINNER' as const, description: 'Peak contraction bicep isolation.' },

  // Triceps
  { name: 'Tricep Dip', muscleGroups: ['Triceps', 'Chest'], equipment: ['Bodyweight'], difficulty: 'INTERMEDIATE' as const, description: 'Bodyweight dip for triceps.' },
  { name: 'Skull Crusher', muscleGroups: ['Triceps'], equipment: ['Barbell'], difficulty: 'INTERMEDIATE' as const, description: 'Lying tricep extension with EZ bar.' },
  { name: 'Tricep Pushdown', muscleGroups: ['Triceps'], equipment: ['Cable'], difficulty: 'BEGINNER' as const, description: 'Cable pushdown for tricep isolation.' },
  { name: 'Overhead Tricep Extension', muscleGroups: ['Triceps'], equipment: ['Dumbbell'], difficulty: 'BEGINNER' as const, description: 'Long head tricep stretch and contraction.' },
  { name: 'Close Grip Bench Press', muscleGroups: ['Triceps', 'Chest'], equipment: ['Barbell'], difficulty: 'INTERMEDIATE' as const, description: 'Compound tricep press movement.' },
  { name: 'Diamond Push-Up', muscleGroups: ['Triceps', 'Chest'], equipment: ['Bodyweight'], difficulty: 'INTERMEDIATE' as const, description: 'Bodyweight tricep-focused push-up.' },

  // Quadriceps
  { name: 'Barbell Squat', muscleGroups: ['Quadriceps', 'Glutes', 'Hamstrings'], equipment: ['Barbell'], difficulty: 'ADVANCED' as const, description: 'The king of lower body exercises.' },
  { name: 'Leg Press', muscleGroups: ['Quadriceps', 'Glutes'], equipment: ['Machine'], difficulty: 'BEGINNER' as const, description: 'Machine-based quad and glute press.' },
  { name: 'Leg Extension', muscleGroups: ['Quadriceps'], equipment: ['Machine'], difficulty: 'BEGINNER' as const, description: 'Quad isolation on leg extension machine.' },
  { name: 'Bulgarian Split Squat', muscleGroups: ['Quadriceps', 'Glutes'], equipment: ['Dumbbell'], difficulty: 'INTERMEDIATE' as const, description: 'Unilateral lower body strength.' },
  { name: 'Hack Squat', muscleGroups: ['Quadriceps'], equipment: ['Machine'], difficulty: 'INTERMEDIATE' as const, description: 'Machine squat for quad development.' },
  { name: 'Front Squat', muscleGroups: ['Quadriceps', 'Core'], equipment: ['Barbell'], difficulty: 'ADVANCED' as const, description: 'Barbell front rack squat variation.' },
  { name: 'Goblet Squat', muscleGroups: ['Quadriceps', 'Glutes'], equipment: ['Kettlebell'], difficulty: 'BEGINNER' as const, description: 'Kettlebell held at chest for squat.' },
  { name: 'Walking Lunge', muscleGroups: ['Quadriceps', 'Glutes'], equipment: ['Dumbbell'], difficulty: 'BEGINNER' as const, description: 'Dynamic lunge for leg development.' },

  // Hamstrings & Glutes
  { name: 'Romanian Deadlift', muscleGroups: ['Hamstrings', 'Glutes', 'Back'], equipment: ['Barbell'], difficulty: 'INTERMEDIATE' as const, description: 'Hip hinge for posterior chain.' },
  { name: 'Leg Curl', muscleGroups: ['Hamstrings'], equipment: ['Machine'], difficulty: 'BEGINNER' as const, description: 'Hamstring isolation on leg curl machine.' },
  { name: 'Hip Thrust', muscleGroups: ['Glutes', 'Hamstrings'], equipment: ['Barbell'], difficulty: 'INTERMEDIATE' as const, description: 'Barbell hip thrust for glute development.' },
  { name: 'Good Morning', muscleGroups: ['Hamstrings', 'Back', 'Glutes'], equipment: ['Barbell'], difficulty: 'INTERMEDIATE' as const, description: 'Hip hinge movement for posterior chain.' },
  { name: 'Sumo Deadlift', muscleGroups: ['Hamstrings', 'Glutes', 'Back'], equipment: ['Barbell'], difficulty: 'ADVANCED' as const, description: 'Wide stance deadlift for glute emphasis.' },
  { name: 'Cable Kickback', muscleGroups: ['Glutes'], equipment: ['Cable'], difficulty: 'BEGINNER' as const, description: 'Glute isolation using cable machine.' },
  { name: 'Glute Bridge', muscleGroups: ['Glutes', 'Hamstrings'], equipment: ['Bodyweight'], difficulty: 'BEGINNER' as const, description: 'Bodyweight glute activation exercise.' },

  // Calves
  { name: 'Standing Calf Raise', muscleGroups: ['Calves'], equipment: ['Machine'], difficulty: 'BEGINNER' as const, description: 'Standing calf raise for gastrocnemius.' },
  { name: 'Seated Calf Raise', muscleGroups: ['Calves'], equipment: ['Machine'], difficulty: 'BEGINNER' as const, description: 'Seated variation targeting soleus.' },
  { name: 'Donkey Calf Raise', muscleGroups: ['Calves'], equipment: ['Machine'], difficulty: 'BEGINNER' as const, description: 'Stretched position calf raise.' },

  // Core
  { name: 'Plank', muscleGroups: ['Core'], equipment: ['Bodyweight'], difficulty: 'BEGINNER' as const, description: 'Isometric core stability exercise.' },
  { name: 'Ab Wheel Rollout', muscleGroups: ['Core'], equipment: ['Bodyweight'], difficulty: 'ADVANCED' as const, description: 'Advanced core exercise with ab wheel.' },
  { name: 'Cable Crunch', muscleGroups: ['Core'], equipment: ['Cable'], difficulty: 'BEGINNER' as const, description: 'Weighted crunch using cable machine.' },
  { name: 'Hanging Leg Raise', muscleGroups: ['Core'], equipment: ['Bodyweight'], difficulty: 'INTERMEDIATE' as const, description: 'Hanging leg raise for lower abs.' },
  { name: 'Russian Twist', muscleGroups: ['Core'], equipment: ['Bodyweight'], difficulty: 'BEGINNER' as const, description: 'Rotational core exercise.' },
  { name: 'Decline Sit-Up', muscleGroups: ['Core'], equipment: ['Bodyweight'], difficulty: 'BEGINNER' as const, description: 'Weighted sit-up on decline bench.' },
  { name: 'Side Plank', muscleGroups: ['Core'], equipment: ['Bodyweight'], difficulty: 'BEGINNER' as const, description: 'Lateral core stability plank.' },

  // Full body / compound
  { name: 'Power Clean', muscleGroups: ['Full Body'], equipment: ['Barbell'], difficulty: 'ADVANCED' as const, description: 'Olympic lift for explosive power.' },
  { name: 'Kettlebell Swing', muscleGroups: ['Full Body', 'Glutes', 'Hamstrings'], equipment: ['Kettlebell'], difficulty: 'INTERMEDIATE' as const, description: 'Hip hinge explosive kettlebell movement.' },
  { name: 'Burpee', muscleGroups: ['Full Body'], equipment: ['Bodyweight'], difficulty: 'INTERMEDIATE' as const, description: 'Full body conditioning exercise.' },
  { name: 'Thruster', muscleGroups: ['Full Body', 'Quadriceps', 'Shoulders'], equipment: ['Barbell'], difficulty: 'ADVANCED' as const, description: 'Squat to press combination.' },
  { name: 'Clean and Jerk', muscleGroups: ['Full Body'], equipment: ['Barbell'], difficulty: 'ADVANCED' as const, description: 'Full Olympic weightlifting movement.' },
]

const SEED_PROGRAMS = [
  {
    name: 'Beginner Muscle Gain 8wk',
    description: 'A structured 8-week program for beginners focused on building lean muscle mass through progressive overload with 3 sessions per week.',
    level: 'BEGINNER' as const,
    goal: 'MUSCLE_GAIN' as const,
    durationWeeks: 8,
    sessionsPerWeek: 3,
    isOfficial: true,
  },
  {
    name: 'Beginner Fat Loss 8wk',
    description: 'An 8-week beginner program combining strength training and metabolic conditioning to maximize fat loss while preserving muscle.',
    level: 'BEGINNER' as const,
    goal: 'WEIGHT_LOSS' as const,
    durationWeeks: 8,
    sessionsPerWeek: 3,
    isOfficial: true,
  },
  {
    name: 'Beginner Maintenance 6wk',
    description: 'A 6-week beginner maintenance program for those looking to stay active and maintain current fitness levels with 2 sessions per week.',
    level: 'BEGINNER' as const,
    goal: 'MAINTENANCE' as const,
    durationWeeks: 6,
    sessionsPerWeek: 2,
    isOfficial: true,
  },
  {
    name: 'Intermediate Push/Pull/Legs 12wk',
    description: 'A classic PPL split for intermediate athletes running 6 days per week over 12 weeks for maximum muscle and strength gains.',
    level: 'INTERMEDIATE' as const,
    goal: 'MUSCLE_GAIN' as const,
    durationWeeks: 12,
    sessionsPerWeek: 6,
    isOfficial: true,
  },
  {
    name: 'Intermediate Upper/Lower 10wk',
    description: 'A 10-week upper/lower split for intermediate lifters training 4 days per week, balancing volume and recovery.',
    level: 'INTERMEDIATE' as const,
    goal: 'MUSCLE_GAIN' as const,
    durationWeeks: 10,
    sessionsPerWeek: 4,
    isOfficial: true,
  },
  {
    name: 'Advanced Powerlifting 16wk',
    description: 'A 16-week advanced powerlifting peaking program for squat, bench, and deadlift. 5 sessions per week with periodization.',
    level: 'ADVANCED' as const,
    goal: 'MUSCLE_GAIN' as const,
    durationWeeks: 16,
    sessionsPerWeek: 5,
    isOfficial: true,
  },
]

async function seed() {
  console.log('Seeding dev user...')
  // Fixed UUID so DEV_USER_ID in .env is always predictable
  await db
    .insert(users)
    .values({
      id: '00000000-0000-0000-0000-000000000001',
      authId: 'dev_user',
      name: 'Dev Athlete',
      email: 'dev@fittrack.app',
      level: 'INTERMEDIATE',
      goal: 'MUSCLE_GAIN',
      weeklyTarget: 4,
    })
    .onConflictDoNothing()
  console.log('Dev user ready (authId: dev_user)')

  console.log('Seeding exercises from workout.cool...')
  // Insert in batches of 100 to avoid query size limits
  const exData = WORKOUT_COOL_EXERCISES.map((ex) => ({
    name: ex.name,
    nameFr: ex.nameFr,
    muscleGroups: [...ex.muscleGroups],
    equipment: [...ex.equipment],
    difficulty: ex.difficulty,
    description: ex.description,
    descriptionFr: ex.descriptionFr,
    videoUrl: ex.videoUrl,
    imageUrl: ex.imageUrl,
  }))
  for (let i = 0; i < exData.length; i += 100) {
    await db.insert(exercises).values(exData.slice(i, i + 100)).onConflictDoNothing()
  }
  console.log(`Inserted ${exData.length} exercises from workout.cool`)

  console.log('Seeding programs...')
  await db.insert(programs).values(SEED_PROGRAMS).onConflictDoNothing()
  console.log(`Inserted ${SEED_PROGRAMS.length} programs`)

  console.log('Seed complete!')
  process.exit(0)
}

seed().catch((e) => {
  console.error(e)
  process.exit(1)
})
