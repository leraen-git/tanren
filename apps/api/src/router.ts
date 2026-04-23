import { router } from './trpc.js'
import { authRouter } from './routers/auth.js'
import { usersRouter } from './routers/users.js'
import { workoutsRouter } from './routers/workouts.js'
import { sessionsRouter } from './routers/sessions.js'
import { exercisesRouter } from './routers/exercises.js'
import { progressRouter } from './routers/progress.js'
import { programsRouter } from './routers/programs.js'
import { plansRouter } from './routers/plans.js'
import { dietRouter } from './routers/diet.js'
import { notificationsRouter } from './routers/notifications.js'
import { historyRouter } from './routers/history.js'
import { weightRouter } from './routers/weight.js'

export const appRouter = router({
  auth: authRouter,
  users: usersRouter,
  workouts: workoutsRouter,
  sessions: sessionsRouter,
  exercises: exercisesRouter,
  progress: progressRouter,
  programs: programsRouter,
  plans: plansRouter,
  diet: dietRouter,
  notifications: notificationsRouter,
  history: historyRouter,
  weight: weightRouter,
})

export type AppRouter = typeof appRouter
