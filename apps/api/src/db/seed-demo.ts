import { sql } from 'drizzle-orm'
import crypto from 'node:crypto'
import { db } from './index.js'
import { users } from './schema.js'
import { eq } from 'drizzle-orm'
import { encryptUserFields } from './encryption.js'

const DEMO_EMAIL = 'demo@tanren.fr'
const DEMO_AUTH_ID = DEMO_EMAIL

async function query(text: string): Promise<any[]> {
  const result = await db.execute(sql.raw(text)) as { rows: any[] }
  return result.rows
}

async function exec(text: string): Promise<void> {
  await db.execute(sql.raw(text))
}

function esc(v: unknown): string {
  if (v === null || v === undefined) return 'NULL'
  if (typeof v === 'boolean') return v ? 'TRUE' : 'FALSE'
  if (typeof v === 'number') return String(v)
  if (v instanceof Date) return `'${v.toISOString()}'`
  return `'${String(v).replace(/'/g, "''")}'`
}

async function seedDemo() {
  console.log('Seeding demo account...')

  // Find the admin user (Ramy)
  const allUsers = await db.select().from(users).limit(50)
  const source = allUsers.find(u => u.role === 'admin')
  if (!source) { console.error('No admin user found.'); process.exit(1) }
  const srcId = source.id
  console.log(`  Source: ${srcId}`)

  // Clean up existing demo
  const [existing] = await db.select().from(users).where(eq(users.authId, DEMO_AUTH_ID)).limit(1)
  if (existing) {
    const eid = existing.id
    const cleanups = [
      `DELETE FROM personal_records WHERE user_id = '${eid}'`,
      `DELETE FROM exercise_sets WHERE session_exercise_id IN (SELECT id FROM session_exercises WHERE workout_session_id IN (SELECT id FROM workout_sessions WHERE user_id = '${eid}'))`,
      `DELETE FROM session_exercises WHERE workout_session_id IN (SELECT id FROM workout_sessions WHERE user_id = '${eid}')`,
      `DELETE FROM workout_sessions WHERE user_id = '${eid}'`,
      `DELETE FROM diet_meals WHERE plan_day_id IN (SELECT id FROM diet_plan_days WHERE plan_id IN (SELECT id FROM diet_plans_v2 WHERE user_id = '${eid}'))`,
      `DELETE FROM diet_plan_days WHERE plan_id IN (SELECT id FROM diet_plans_v2 WHERE user_id = '${eid}')`,
      `DELETE FROM diet_grocery_items WHERE plan_id IN (SELECT id FROM diet_plans_v2 WHERE user_id = '${eid}')`,
      `DELETE FROM diet_plans_v2 WHERE user_id = '${eid}'`,
      `DELETE FROM diet_intakes WHERE user_id = '${eid}'`,
      `DELETE FROM workout_plan_days WHERE plan_id IN (SELECT id FROM workout_plans WHERE user_id = '${eid}')`,
      `DELETE FROM workout_plans WHERE user_id = '${eid}'`,
      `DELETE FROM workout_exercises WHERE workout_template_id IN (SELECT id FROM workout_templates WHERE user_id = '${eid}')`,
      `DELETE FROM workout_templates WHERE user_id = '${eid}'`,
      `DELETE FROM auth_sessions WHERE user_id = '${eid}'`,
      `DELETE FROM users WHERE id = '${eid}'`,
    ]
    for (const q of cleanups) { try { await exec(q) } catch {} }
    console.log(`  Cleaned up: ${eid}`)
  }

  // Create demo user
  const encrypted = encryptUserFields({ name: 'Demo', email: DEMO_EMAIL })
  const [demoUser] = await db.insert(users).values({
    authId: DEMO_AUTH_ID,
    authProvider: 'email',
    name: encrypted.name!,
    email: encrypted.email!,
    emailHash: encrypted.emailHash,
    level: source.level,
    goal: source.goal,
    weeklyTarget: source.weeklyTarget,
    heightCm: source.heightCm,
    weightKg: source.weightKg,
    gender: source.gender,
    onboardingDone: true,
    role: 'user',
  }).returning()
  const demoId = demoUser!.id
  console.log(`  Created demo user: ${demoId}`)

  const tplMap = new Map<string, string>()

  // ─── Workout Templates ──────────────────────────────────────────
  const templates = await query(`SELECT id, name, description, muscle_groups, estimated_duration, is_template, is_program_workout, "order", created_at FROM workout_templates WHERE user_id = '${srcId}'`)
  for (const t of templates) {
    const nid = crypto.randomUUID()
    tplMap.set(t.id, nid)
    await exec(`INSERT INTO workout_templates (id, user_id, name, description, muscle_groups, estimated_duration, is_template, is_program_workout, "order", created_at) VALUES (${esc(nid)}, ${esc(demoId)}, ${esc(t.name)}, ${esc(t.description)}, '${t.muscle_groups ? `{${t.muscle_groups.join(',')}}` : '{}'}', ${t.estimated_duration}, ${t.is_template}, ${t.is_program_workout}, ${t.order}, ${esc(t.created_at)})`)
  }
  console.log(`  ${templates.length} workout templates`)

  // ─── Workout Exercises ──────────────────────────────────────────
  let weN = 0
  for (const [oldId, newId] of tplMap) {
    const rows = await query(`SELECT exercise_id, "order", default_sets, default_reps, default_weight, default_rest_seconds, notes FROM workout_exercises WHERE workout_template_id = '${oldId}'`)
    for (const r of rows) {
      await exec(`INSERT INTO workout_exercises (id, workout_template_id, exercise_id, "order", default_sets, default_reps, default_weight, default_rest_seconds, notes) VALUES (${esc(crypto.randomUUID())}, ${esc(newId)}, ${esc(r.exercise_id)}, ${r.order}, ${r.default_sets}, ${r.default_reps}, ${r.default_weight}, ${r.default_rest_seconds}, ${esc(r.notes)})`)
      weN++
    }
  }
  console.log(`  ${weN} workout exercises`)

  // ─── Workout Plans ──────────────────────────────────────────────
  const plans = await query(`SELECT id, name, is_active, start_date, end_date, created_at FROM workout_plans WHERE user_id = '${srcId}'`)
  for (const p of plans) {
    const nid = crypto.randomUUID()
    await exec(`INSERT INTO workout_plans (id, user_id, name, is_active, start_date, end_date, created_at) VALUES (${esc(nid)}, ${esc(demoId)}, ${esc(p.name)}, ${p.is_active}, ${esc(p.start_date)}, ${esc(p.end_date)}, ${esc(p.created_at)})`)
    const days = await query(`SELECT day_of_week, workout_template_id FROM workout_plan_days WHERE plan_id = '${p.id}'`)
    for (const d of days) {
      const mtid = tplMap.get(d.workout_template_id)
      if (!mtid) continue
      await exec(`INSERT INTO workout_plan_days (id, plan_id, day_of_week, workout_template_id) VALUES (${esc(crypto.randomUUID())}, ${esc(nid)}, ${d.day_of_week}, ${esc(mtid)})`)
    }
  }
  console.log(`  ${plans.length} workout plans`)

  // ─── Sessions ───────────────────────────────────────────────────
  const sessMap = new Map<string, string>()
  const sessions = await query(`SELECT id, workout_template_id, started_at, completed_at, duration_seconds, total_volume, notes, perceived_exertion FROM workout_sessions WHERE user_id = '${srcId}'`)
  for (const s of sessions) {
    const mtid = tplMap.get(s.workout_template_id)
    if (!mtid) continue
    const nid = crypto.randomUUID()
    sessMap.set(s.id, nid)
    await exec(`INSERT INTO workout_sessions (id, user_id, workout_template_id, started_at, completed_at, duration_seconds, total_volume, notes, perceived_exertion) VALUES (${esc(nid)}, ${esc(demoId)}, ${esc(mtid)}, ${esc(s.started_at)}, ${esc(s.completed_at)}, ${s.duration_seconds}, ${s.total_volume}, ${esc(s.notes)}, ${esc(s.perceived_exertion)})`)
  }
  console.log(`  ${sessions.length} sessions`)

  // ─── Session Exercises + Sets ───────────────────────────────────
  let setN = 0
  for (const [oldSid, newSid] of sessMap) {
    const ses = await query(`SELECT id, exercise_id, "order" FROM session_exercises WHERE workout_session_id = '${oldSid}'`)
    for (const se of ses) {
      const nSeId = crypto.randomUUID()
      await exec(`INSERT INTO session_exercises (id, workout_session_id, exercise_id, "order") VALUES (${esc(nSeId)}, ${esc(newSid)}, ${esc(se.exercise_id)}, ${se.order})`)
      const sets = await query(`SELECT set_number, reps, weight, rest_seconds, is_completed, is_pr, completed_at, notes FROM exercise_sets WHERE session_exercise_id = '${se.id}'`)
      for (const st of sets) {
        await exec(`INSERT INTO exercise_sets (id, session_exercise_id, set_number, reps, weight, rest_seconds, is_completed, is_pr, completed_at, notes) VALUES (${esc(crypto.randomUUID())}, ${esc(nSeId)}, ${st.set_number}, ${st.reps}, ${st.weight}, ${st.rest_seconds}, ${st.is_completed}, ${st.is_pr}, ${esc(st.completed_at)}, ${esc(st.notes)})`)
        setN++
      }
    }
  }
  console.log(`  ${setN} exercise sets`)

  // ─── Personal Records ───────────────────────────────────────────
  const prs = await query(`SELECT exercise_id, weight, reps, volume, achieved_at, session_id FROM personal_records WHERE user_id = '${srcId}'`)
  let prN = 0
  for (const pr of prs) {
    const msid = sessMap.get(pr.session_id)
    if (!msid) continue
    await exec(`INSERT INTO personal_records (id, user_id, exercise_id, weight, reps, volume, achieved_at, session_id) VALUES (${esc(crypto.randomUUID())}, ${esc(demoId)}, ${esc(pr.exercise_id)}, ${pr.weight}, ${pr.reps}, ${pr.volume}, ${esc(pr.achieved_at)}, ${esc(msid)})`)
    prN++
  }
  console.log(`  ${prN} personal records`)

  // ─── Weight Entries ─────────────────────────────────────────────
  try {
    const weights = await query(`SELECT weight_kg, measured_at, source FROM weight_entries WHERE user_id = '${srcId}'`)
    for (const w of weights) {
      await exec(`INSERT INTO weight_entries (id, user_id, weight_kg, measured_at, source, created_at) VALUES (${esc(crypto.randomUUID())}, ${esc(demoId)}, ${w.weight_kg}, ${esc(w.measured_at)}, ${esc(w.source)}, NOW())`)
    }
    console.log(`  ${weights.length} weight entries`)
  } catch { console.log('  Skipped weight entries') }

  // ─── Diet (try v2 tables, fall back to v1, skip if neither) ──────
  try {
    const intakeMap = new Map<string, string>()
    const intakes = await query(`SELECT * FROM diet_intakes WHERE user_id = '${srcId}'`)
    for (const i of intakes) {
      const nid = crypto.randomUUID()
      intakeMap.set(i.id, nid)
      await exec(`INSERT INTO diet_intakes (id, user_id, age, biological_sex, height_cm, current_weight_kg, goal_weight_kg, goal_feel, pace, job_type, exercise_frequency_per_week, exercise_type, sleep_hours, stress_level, alcohol_drinks_per_week, top_5_meals, hated_foods, restrictions, cooking_style, adventurousness, current_snacks, snack_motivation, snack_preference, night_snacking, created_at) VALUES (${esc(nid)}, ${esc(demoId)}, ${i.age}, ${esc(i.biological_sex)}, ${i.height_cm}, ${i.current_weight_kg}, ${esc(i.goal_weight_kg)}, ${esc(i.goal_feel)}, ${esc(i.pace)}, ${esc(i.job_type)}, ${i.exercise_frequency_per_week}, ${esc(i.exercise_type)}, ${i.sleep_hours}, ${esc(i.stress_level)}, ${i.alcohol_drinks_per_week}, ${esc(i.top_5_meals)}, ${esc(i.hated_foods)}, '${i.restrictions ? `{${i.restrictions.map((r: string) => `"${r}"`).join(',')}}` : '{}'}', ${esc(i.cooking_style)}, ${i.adventurousness}, ${esc(i.current_snacks)}, ${esc(i.snack_motivation)}, ${esc(i.snack_preference)}, ${esc(i.night_snacking)}, ${esc(i.created_at)})`)
    }
    console.log(`  ${intakes.length} diet intakes`)

    const dietPlans = await query(`SELECT * FROM diet_plans_v2 WHERE user_id = '${srcId}'`)
    for (const p of dietPlans) {
      const mIntake = intakeMap.get(p.intake_id)
      if (!mIntake) continue
      const nPlanId = crypto.randomUUID()
      await exec(`INSERT INTO diet_plans_v2 (id, user_id, intake_id, goal, bmr_kcal, tdee_kcal, target_kcal, target_protein_g, target_carbs_g, target_fat_g, ai_explanation, ai_personal_rules, ai_timeline, ai_supplements, ai_snack_swaps, locale, status, created_at, replaced_at, deleted_at) VALUES (${esc(nPlanId)}, ${esc(demoId)}, ${esc(mIntake)}, ${esc(p.goal)}, ${p.bmr_kcal}, ${p.tdee_kcal}, ${p.target_kcal}, ${p.target_protein_g}, ${p.target_carbs_g}, ${p.target_fat_g}, ${esc(p.ai_explanation)}, ${esc(JSON.stringify(p.ai_personal_rules))}, ${esc(p.ai_timeline)}, ${esc(JSON.stringify(p.ai_supplements))}, ${esc(JSON.stringify(p.ai_snack_swaps))}, ${esc(p.locale)}, ${esc(p.status)}, ${esc(p.created_at)}, ${esc(p.replaced_at)}, ${esc(p.deleted_at)})`)

      const days = await query(`SELECT * FROM diet_plan_days WHERE plan_id = '${p.id}'`)
      for (const d of days) {
        const nDayId = crypto.randomUUID()
        await exec(`INSERT INTO diet_plan_days (id, plan_id, day_number, day_label, theme, target_kcal) VALUES (${esc(nDayId)}, ${esc(nPlanId)}, ${d.day_number}, ${esc(d.day_label)}, ${esc(d.theme)}, ${d.target_kcal})`)

        const meals = await query(`SELECT * FROM diet_meals WHERE plan_day_id = '${d.id}'`)
        for (const m of meals) {
          await exec(`INSERT INTO diet_meals (id, plan_day_id, meal_type, suggested_time, order_index, name, kcal, protein_g, carbs_g, fat_g, prep_time_min, difficulty, is_batch_cook_friendly, is_low_cal_treat, ingredients, recipe_steps, youtube_url, youtube_channel_name, youtube_duration_sec) VALUES (${esc(crypto.randomUUID())}, ${esc(nDayId)}, ${esc(m.meal_type)}, ${esc(m.suggested_time)}, ${m.order_index}, ${esc(m.name)}, ${m.kcal}, ${m.protein_g}, ${m.carbs_g}, ${m.fat_g}, ${m.prep_time_min}, ${esc(m.difficulty)}, ${m.is_batch_cook_friendly}, ${m.is_low_cal_treat}, ${esc(JSON.stringify(m.ingredients))}, ${esc(JSON.stringify(m.recipe_steps))}, ${esc(m.youtube_url)}, ${esc(m.youtube_channel_name)}, ${esc(m.youtube_duration_sec)})`)
        }
      }

      const grocery = await query(`SELECT * FROM diet_grocery_items WHERE plan_id = '${p.id}'`)
      for (const g of grocery) {
        await exec(`INSERT INTO diet_grocery_items (id, plan_id, section, name, quantity, order_index, is_checked) VALUES (${esc(crypto.randomUUID())}, ${esc(nPlanId)}, ${esc(g.section)}, ${esc(g.name)}, ${esc(g.quantity)}, ${g.order_index}, FALSE)`)
      }
    }
    console.log(`  ${dietPlans.length} diet plans (with days, meals, grocery)`)
  } catch {
    console.log('  Skipped diet data (v2 tables not found)')
  }

  console.log('\nDemo account seeded!')
  console.log(`  Email: ${DEMO_EMAIL}`)
  console.log(`  OTP:   749382`)
  console.log(`  Role:  user`)
  process.exit(0)
}

seedDemo().catch((err) => {
  console.error('Failed to seed demo account:', err)
  process.exit(1)
})
