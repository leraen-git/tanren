# TANREN — User Manual

**Version 1.0 — April 2026**

---

## Table of Contents

1. [Getting Started](#1-getting-started)
2. [Sign In](#2-sign-in)
3. [Onboarding](#3-onboarding)
4. [Home Screen](#4-home-screen)
5. [Workouts Tab](#5-workouts-tab)
6. [Creating a Workout](#6-creating-a-workout)
7. [Creating a Plan](#7-creating-a-plan)
8. [AI Plan Generator](#8-ai-plan-generator)
9. [Starting a Session](#9-starting-a-session)
10. [Active Workout](#10-active-workout)
11. [Rest Timer](#11-rest-timer)
12. [Session Recap](#12-session-recap)
13. [Session Sharing](#13-session-sharing)
14. [History Tab](#14-history-tab)
15. [Exercise Library](#15-exercise-library)
16. [Quick Exercise](#16-quick-exercise)
17. [Diet Tab](#17-diet-tab)
18. [Diet Plan Intake](#18-diet-plan-intake)
19. [Profile Tab](#19-profile-tab)
20. [Reminders](#20-reminders)
21. [Explore](#21-explore)
22. [Privacy](#22-privacy)
23. [Guest Mode](#23-guest-mode)

---

## 1. Getting Started

When you first open Tanren, the app displays an animated splash screen featuring the forge-spark mark, the TANREN wordmark, and the tagline *Built rep by rep.* The app then loads the sign-in screen.

**Requirements:**
- iOS 16+ or Android 13+
- Internet connection (required for sign-in, plan generation, and data sync)

---

## 2. Sign In

The sign-in screen displays the Tanren logo with a red glow animation and the Japanese kanji watermark in the background.

**Sign-in options:**

| Method | Description |
|---|---|
| **Continue with Apple** | One-tap sign-in using your Apple ID (iOS only). Your email may be hidden via Apple Private Relay. |
| **Sign in with Google** | Sign in with your Google account. Your name, email, and avatar are imported. |
| **Continue with email** | Enter your email address. A 6-digit verification code is sent to your inbox. |
| **Continue as guest** | Start using Tanren immediately without an account. Some features are restricted (see [Guest Mode](#23-guest-mode)). |

**Email OTP flow:**
1. Tap **Continue with email**
2. Enter your email address and tap **Send code**
3. Check your inbox for a 6-digit code from Tanren
4. Enter the code in the app
5. If the code is incorrect, you have up to 5 attempts before it expires
6. You can request a new code after a 60-second cooldown (maximum 3 codes per 15 minutes)

On successful sign-in, you are taken to the onboarding flow (first time) or directly to the home screen.

---

## 3. Onboarding

First-time users complete a 4-step onboarding. Progress is shown as dots at the top of the screen.

### Step 0 — Data Consent

This screen explains what data was shared by your sign-in provider (Apple/Google) and what Tanren will ask next. A link to the full privacy policy is provided.

Tap **Continue** to proceed.

### Step 1 — Basic Profile

| Field | Description |
|---|---|
| **Name** | Your display name. Pre-filled from your sign-in provider if available. |
| **Gender** | Select Male or Female. Used for training recommendations. |

Both fields are required.

### Step 2 — Training Profile

| Field | Options |
|---|---|
| **Level** | Beginner (less than 1 year), Intermediate (1-3 years), Advanced (3+ years) |
| **Training days per week** | 1 to 7 (tap to select) |
| **Goal** | Weight Loss, Muscle Gain, Maintenance |

All fields are required. These settings influence AI plan generation and workout recommendations.

### Step 3 — Measurements (Optional)

| Field | Unit | Notes |
|---|---|---|
| **Height** | cm | Optional. Used for diet plan calculations. |
| **Weight** | kg | Optional. Used for diet plan calculations and progression tracking. |

You can skip this step. Tap **Finish** to complete onboarding and enter the app.

---

## 4. Home Screen

The home screen is your daily dashboard. It adapts based on whether you have an active workout plan, a diet plan, or both.

### Greeting

The top of the screen greets you by first name with a time-appropriate message (Good morning / Good afternoon / Good evening).

### Stats Strip

A compact row of three metrics:

| Stat | Description |
|---|---|
| **This week** | Number of sessions completed this week vs your weekly target (e.g. "2 / 4") |
| **Streak** | Consecutive weeks where you met your weekly target |
| **Last PRs** | Number of personal records set in your last session |

### Workout/Diet Toggle

If you have both a workout plan and a diet plan active, two tabs appear below the stats strip: **Workout** and **Diet**. The app automatically switches to the Diet tab once you have completed today's workout.

### Today's Workout Card

When you have an active plan with a workout scheduled for today:

- **Workout name** and estimated duration
- **Muscle group tags** (e.g. Chest, Triceps, Shoulders)
- **Exercise list** showing each exercise with its default sets, reps, and weight
- **Start** button to begin the session

If today is a rest day, a rest day card is displayed instead.

### No Active Plan State

If you do not have an active plan, the home screen shows:

- A hero card with a **Create a plan** button
- A **Generate with AI** button (locked for guest users)
- A **Just start an exercise** link for quick sessions

### Other Workouts This Week

Below today's workout, remaining workouts for the week are shown as compact cards.

### All Done

When you have completed all workouts for the week, a completion card is displayed.

### Today's Diet Section

When the Diet tab is active:

- **Day theme** and total calorie target
- **Macro pills** showing Protein / Carbs / Fat targets
- **Meal cards** for each meal (breakfast, lunch, snack, dinner, dessert) showing:
  - Meal name and calorie count
  - Protein / Carbs / Fat breakdown
  - Tap any meal to open a full recipe modal with ingredients, preparation steps, and a YouTube recipe link (when available)

### Pull to Refresh

Pull down on the home screen to refresh all data.

---

## 5. Workouts Tab

The Workouts tab has two sections: **My Plan** and **Workouts**.

### My Plan Section

- **Active plan** is displayed with an ACTIVE badge, showing the plan name, number of training days per week, and day-by-day workout assignments (Mon through Sun)
- **Inactive plans** are listed below with an **Activate** button on each
- The **+ New** button creates a new plan
- An empty state message appears if no plans exist

**Plan actions:**
- Tap the active plan to edit it
- Tap **Activate** on any inactive plan to make it current (the previously active plan is deactivated)

### Workouts Section

All your workout templates are listed as cards showing:
- Workout name
- Muscle groups (up to 3 displayed)
- Estimated duration

- The **+ New** button creates a new workout
- Tap any workout to view its details

---

## 6. Creating a Workout

The workout builder screen lets you create or edit a workout template.

### Fields

| Field | Description |
|---|---|
| **Workout name** | Free text (e.g. "Push Day", "Full Body A") |
| **Muscle groups** | Multi-select chips (Chest, Back, Shoulders, Biceps, Triceps, Quadriceps, Hamstrings, Glutes, Calves, Core) |
| **Estimated duration** | Select from 30, 45, 60, 75, or 90 minutes |

### Adding Exercises

1. Tap **Add exercise**
2. A picker modal opens with:
   - A search bar to find exercises by name
   - Muscle group filter chips to narrow the list
3. Tap one or more exercises to select them
4. Confirm to add them to the workout

### Configuring Exercises

For each exercise in the workout, you can set:

| Parameter | Default | Description |
|---|---|---|
| **Sets** | 3 | Number of sets |
| **Reps** | 10 | Target reps per set |
| **Weight** | 0 kg | Starting weight |
| **Rest** | 90 s | Rest time between sets |

You can also reorder, duplicate, or delete exercises.

Tap **Save** to save the workout template.

---

## 7. Creating a Plan

A plan assigns workouts to specific days of the week.

### Steps

1. Enter a **plan name** (e.g. "PPL 3x", "Upper/Lower 4x")
2. Tap each day you want to train (Monday through Sunday)
3. For each selected day, tap **Pick a workout** and choose from your workout templates
4. Tap **Save** to create the plan

When editing an existing plan, the current configuration is pre-loaded. A **Delete** button is available at the bottom with a confirmation dialog.

---

## 8. AI Plan Generator

The AI plan generator creates a complete workout plan based on your profile and preferences. This feature is not available for guest users.

### How to Use

1. Navigate to the AI generator from Home or Workouts tab
2. Your profile is shown as read-only chips: level, goal, weekly target, height, and weight
3. Either:
   - Type a description of what you want (e.g. "Push/pull/legs 3x per week, focus on compound lifts")
   - Or tap one of the 4 quick suggestions provided
4. Tap **Generate**

### Quick Suggestions

- Push/pull/legs 3x per week, focus on compound lifts
- Upper/lower split 4 days, I want to get stronger
- Full body 3 days, I have limited time (~45 min)
- 5 days per week, bodybuilding style

### Generation

The app shows a loading screen while the AI generates your plan. This typically takes 10-20 seconds.

### Plan Preview

Once generated, the plan preview screen shows:

- **Plan name** with session count and days per week
- **Day-by-day breakdown** (Monday through Sunday) with:
  - Workout name for each day
  - Full exercise list with sets, reps, and suggested weights
  - Muscle groups targeted

Review the plan and tap **Accept** to activate it, or go back to regenerate with different instructions.

### Refinement

After reviewing a generated plan, you can go back and ask for changes (e.g. "Add more back work" or "Reduce to 4 days"). The AI uses your previous conversation to refine the plan.

---

## 9. Starting a Session

### From a Plan

1. On the home screen, tap **Start** on today's workout card
2. The **preview screen** opens showing:
   - Workout name, estimated duration, muscle groups
   - Complete exercise list with numbered exercises
   - Sets, reps, and weight for each exercise
3. You can add, edit, or remove exercises before starting
4. Tap **Start** to begin the session

### Quick Start

1. Tap **Just start an exercise** from the home screen
2. Search or browse the exercise library
3. Select an exercise and configure sets, reps, weight, and rest time
4. Tap **Start** to begin a quick session with that single exercise

---

## 10. Active Workout

The active workout screen is where you log your training in real time. The screen stays awake during your session.

### Layout

- **Top bar:** Workout name and elapsed time
- **Exercise navigation:** Left/right arrows to move between exercises. The current exercise name and set progress (e.g. "2 / 4 sets") are displayed
- **Set input area:** The main area where you log each set

### Logging a Set

For each set, two input fields are displayed:

| Field | Description |
|---|---|
| **Reps** | Number of repetitions performed |
| **Weight** | Weight lifted in kg |

**Ghost values:** Below each input, the weight and reps from your last session for the same exercise are shown as reference values. These help you track progression without needing to remember your previous numbers.

### Completing a Set

Tap the **Complete set** button to log the current set. The rest timer starts automatically (see [Rest Timer](#11-rest-timer)).

After completing all sets for an exercise, navigate to the next exercise using the right arrow.

### Session Heartbeat

The app saves your session progress to disk every 30 seconds. If the app crashes or is force-closed, your session is recoverable when you reopen Tanren.

### Finishing the Workout

When all exercises and sets are completed, tap **Complete workout** to end the session and proceed to the recap screen.

If you navigate away before finishing, a prompt asks whether to save or discard the session.

---

## 11. Rest Timer

The rest timer activates automatically after completing a set.

### Display

- A circular red progress ring fills as time counts down
- The remaining time is displayed in **MM:SS** format in large text at the center
- The exercise name is shown above the timer

### Controls

| Button | Action |
|---|---|
| **-15s** | Subtract 15 seconds from the timer |
| **+15s** | Add 15 seconds to the timer |
| **Skip** | Skip the remaining rest and proceed to the next set |
| **Pause** | Pause the countdown |

### Background Notification

If you leave the app during rest, a local notification fires when the rest period ends, reminding you to return to your set.

---

## 12. Session Recap

After completing a workout, the recap screen summarizes your session.

### Session Metrics

| Metric | Description |
|---|---|
| **Duration** | Total session time |
| **Volume** | Total weight lifted (sets x reps x weight) in kg |
| **Sets** | Total sets completed |
| **PRs** | New personal records detected |

### Exercise Comparison

Each exercise is shown with a comparison to your previous session:

| Indicator | Color | Meaning |
|---|---|---|
| **Improved** | Green | Volume increased vs last session (> +1%) |
| **Stable** | Amber | Volume matched last session (within 1%) |
| **Declined** | Red | Volume decreased vs last session (> -1%) |

### Personal Records

New PRs are highlighted with the exercise name, weight, and reps achieved.

### Actions

- **Add more exercises** — Open a modal to add and log additional exercises to this session
- **Save & finish** — Save the session to your history and proceed to the share screen

---

## 13. Session Sharing

After saving a session, you can create a shareable card.

### Card Builder

The share card is a 9:16 image showing:

- **SESSION COMPLETE** title (draggable)
- **Stats block** with duration, volume, sets, and PR count (draggable)
- A red accent bar

### Adding a Photo

- **Camera** — Take a photo to use as the card background
- **Photo library** — Select a photo from your gallery
- **Remove** — Remove the current photo

### Positioning

Drag the title and stats blocks to reposition them on the card.

### Sharing

Tap **Share** to export the card as an image and open the native share sheet (Messages, Instagram Stories, etc.).

Tap **Finish session** to skip sharing and return to the home screen.

---

## 14. History Tab

The History tab shows all your past sessions with filtering options.

### Filters

**Date range** (horizontal scroll):
- 1 week
- 1 month
- 3 months
- All time

**Muscle groups** (horizontal scroll):
- All
- Chest, Back, Shoulders, Biceps, Triceps, Quadriceps, Hamstrings, Glutes, Calves, Core, Full Body

### Summary Row

Displays the total number of sessions and total volume (in kg) for the current filter selection.

### Session Cards

Each past session is displayed as a card showing:

| Field | Description |
|---|---|
| **Workout name** | Name of the workout performed |
| **Date & time** | When the session took place |
| **Duration** | How long the session lasted |
| **Volume** | Total weight lifted in kg |
| **Muscle groups** | Tags showing muscles worked (up to 4) |
| **Status** | Done or Incomplete |

---

## 15. Exercise Library

The exercise library contains 685+ exercises with detailed information.

### Browsing

- **Search bar** — Search exercises by name
- **Muscle group filters** — Filter by muscle group using horizontal chip pills

### Exercise Cards

Each exercise card shows:

| Field | Description |
|---|---|
| **Name** | Exercise name |
| **Muscle groups** | Primary muscles targeted |
| **Difficulty** | Beginner, Intermediate, or Advanced |
| **Equipment** | Equipment required |

### Exercise Detail

Tap an exercise to view its full detail page including:
- Description and form cues
- Long-term progression chart (toggle between Max Weight, Volume, and Reps)
- Coaching tips based on your history:
  - 3+ sessions improved: suggests increasing weight by +2,5 kg
  - 3+ sessions flat: suggests a deload
  - 2+ sessions declined: flags a recovery warning

---

## 16. Quick Exercise

Quick exercise lets you start a session with a single exercise without creating a full workout.

### Steps

1. Tap **Just start an exercise** from the home screen
2. Search or filter the exercise library
3. Select an exercise
4. Configure the session:
   - Number of sets (1 to 6)
   - Reps per set
   - Weight per set (kg)
   - Rest time per set (seconds)
5. Tap **Start workout** to begin

The session proceeds through the same active workout and recap flow as a full workout session.

---

## 17. Diet Tab

The Diet tab provides an AI-generated 7-day meal plan.

### No Plan State

If you do not have an active diet plan, the screen displays:

- A description of the diet plan feature
- Four feature highlights:
  - Calorie and macro targets calculated via Mifflin-St Jeor
  - 7-day meal plan built around your preferred foods
  - Snack substitutions with equivalent macros
  - Evidence-backed supplement recommendations
- **Build my diet plan** button (launches the intake form)
- **Restore previous plan** button (if a previous plan exists)

### Active Plan State

When you have an active plan:

**Header:**
- Daily calorie target
- **Reset** button to delete the current plan

**Macro Targets:**
- Protein, Carbs, Fat displayed as gram targets with percentage bars

**Hydration:**
- Daily water intake target in liters

**Day Selector:**
- Monday through Sunday pill buttons
- Each pill shows the day's total calorie count
- Tap a day to view its meals

**Day Detail:**
- Day theme (e.g. "Mediterranean Monday")
- Total calories and macro breakdown (P / C / F)
- Meal list with:

| Field | Description |
|---|---|
| **Type** | Breakfast, Lunch, Snack, Dinner, or Dessert |
| **Name** | Meal name |
| **Calories** | Calorie count |
| **P / C / F** | Protein, Carbs, Fat in grams |
| **Prep time** | Preparation time in minutes |
| **Batch cookable** | Marked if suitable for batch cooking |
| **Treat** | Marked if it feels indulgent but fits macros |

**Tap any meal** to open a detail modal with:
- Full ingredient list with quantities
- Step-by-step preparation instructions
- YouTube recipe video link (when available)

**Additional Sections:**
- **Snack swaps** — Alternatives for your current snacks with calorie comparisons
- **My 5 rules** — Personalized nutrition rules
- **Supplements** — Evidence-backed recommendations with dose, timing, and reasoning
- **Timeline** — Realistic week-by-week projection toward your goal

**Regenerate:** Tap the regenerate link to rebuild your diet plan. You can generate up to 2 plans per week.

---

## 18. Diet Plan Intake

The diet intake form collects your information across 4 steps. Progress is shown as dots at the top.

### Step 0 — Your Stats

| Field | Description |
|---|---|
| **Age** | Your age in years |
| **Biological sex** | Male or Female (used for BMR calculation) |
| **Goal weight** | Your target weight in kg (optional) |
| **Goal pace** | Steady & sustainable, or As fast as possible |

### Step 1 — Your Lifestyle

| Field | Description |
|---|---|
| **Job type** | Describe your work (e.g. "desk job", "on my feet all day") |
| **Exercise habits** | How often and what type of exercise you do |
| **Sleep hours** | Average hours of sleep per night |
| **Stress level** | Low, Moderate, or High |
| **Alcohol per week** | None, 1-2, 3-5, 6-10, or 10+ drinks |

### Step 2 — Your Food Preferences

| Field | Description |
|---|---|
| **Favourite meals** | Up to 5 dishes you enjoy (add/remove individually) |
| **Foods you hate** | Free text describing foods you want to avoid (optional) |
| **Dietary restrictions** | Allergies, intolerances, or dietary choices (optional) |
| **Cooking style** | From scratch, Quick & easy, or Batch prep |
| **Adventure score** | Slider from 1 (conservative) to 10 (adventurous) |

### Step 3 — Your Snack Habits

| Field | Description |
|---|---|
| **Current snacks** | What you typically snack on |
| **Why you snack** | Hunger, Boredom, or Habit |
| **Snack preference** | Sweet, Savoury, or Both |
| **Late night snacking** | Yes or No |

Tap **Generate** on the final step. The AI generates your plan in 15-30 seconds using your profile, measurements, and all intake answers.

---

## 19. Profile Tab

The profile tab displays your account information and app settings.

### Stats Section

Three metrics at the top:
- **Sessions** — Total workouts completed
- **Volume** — Total weight lifted (kg, lifetime)
- **PRs** — Total personal records achieved

### Personal Section

| Field | Editable | Description |
|---|---|---|
| **Name** | Yes | Your display name |
| **Email** | No | Your sign-in email |
| **Height** | Yes | In cm |
| **Weight** | Yes | In kg |

### Training Section

| Field | Options |
|---|---|
| **Level** | Beginner, Intermediate, Advanced |
| **Goal** | Weight Loss, Muscle Gain, Maintenance |
| **Weekly target** | 1-7 sessions per week |

Changes are saved automatically.

### Settings Section

| Item | Description |
|---|---|
| **Explore Tanren** | Discover all features and what you have not tried yet |
| **Reminders** | Configure workout, meal, and hydration notifications |

### Privacy & Account Section

| Item | Description |
|---|---|
| **How my data is used** | View the privacy policy |
| **Connected with** | Shows your sign-in provider (Apple, Google, Email, Guest) |
| **Sign out** | Signs you out with confirmation. Your session is revoked server-side. |
| **Delete my account** | Permanently deletes your account and all data. Requires 2-step confirmation. This action is irreversible. |

---

## 20. Reminders

Tanren can send local notifications to help you stay consistent. Notification permission is requested once on first launch.

### Workout Reminders

| Setting | Description |
|---|---|
| **Enable** | Toggle workout reminders on/off |
| **Training time** | What time your workout is scheduled (e.g. 18:00) |
| **Remind me before** | How many minutes before to notify (0, 15, or 30 min) |
| **Active days** | Which days of the week to send reminders |

### Meal Reminders

Individual toggles and time pickers for:
- **Breakfast** (default 08:00)
- **Lunch** (default 12:30)
- **Snack** (default 16:00)
- **Dinner** (default 20:00)

### Hydration Reminders

| Setting | Description |
|---|---|
| **Enable** | Toggle hydration reminders on/off |
| **Interval** | Reminder frequency (every 60, 90, or 120 minutes) |
| **Active from** | Start time for reminders (default 07:00) |
| **Active to** | End time for reminders (default 22:00) |

If notification permission is blocked at the system level, a banner appears with a link to open iOS/Android settings.

---

## 21. Explore

The Explore screen lists all Tanren features organized by category. A progress counter shows how many features you have discovered.

### Feature Categories

**Workouts:**
- Workout builder
- Active session tracker
- Rest timer
- Personal records

**Progress:**
- Progression charts
- Streak and volume stats
- Session recap

**Plans:**
- AI workout plan
- Guided programs

**Diet:**
- AI diet plan
- Meal recipes and macros

**Reminders:**
- Smart reminders

Each feature shows an icon, title, and description. Features you have not tried are marked as NEW. Tap **Try it** to navigate directly to the feature.

---

## 22. Privacy

The privacy screen explains how Tanren handles your data.

### Sections

**What we collect:**
- Provider data (email, name, avatar from Apple/Google)
- Profile data (gender, fitness level, measurements)
- Usage data (workouts, sessions, personal records, diet plans)

**How we use it:**
- Personalization (recommendations, pre-filled values)
- Personal record detection
- AI plan generation (sent to Claude API for processing)

**Storage:**
- All data is stored securely with AES-256-GCM encryption at rest
- PII fields (email, name) are encrypted in the database

**Your rights:**
- Export your data
- Delete your account permanently
- No ads, no tracking, no data sales

---

## 23. Guest Mode

Guest accounts let you try Tanren without signing up. Sessions expire after 7 days.

### Available Features

- Browse the exercise library
- Create workouts and plans manually
- Start and log workout sessions
- View session history and recaps
- Configure reminders

### Restricted Features

The following features require a full account (Apple, Google, or Email sign-in):

| Feature | Reason |
|---|---|
| **AI workout plan generation** | Requires authenticated account |
| **AI diet plan generation** | Requires authenticated account |
| **Diet plan regeneration** | Requires authenticated account |

When you tap a restricted feature, the app redirects you to the sign-in screen with an upgrade prompt. After signing in, your guest data is preserved.

---

## Units and Formatting

Tanren uses the metric system exclusively.

| Measurement | Unit | Display Example |
|---|---|---|
| Weight (load) | kg | 100 kg, 82,5 kg |
| Volume / tonnage | kg | 12 450 kg |
| Height | cm | 178 cm |
| Duration | min:sec | 45:30 |
| Dates | DD/MM/YYYY | 18/04/2026 |
| First day of week | Monday | — |

Decimal separator is a comma. Thousands separator is a space.

---

## Keyboard Shortcuts and Gestures

| Gesture | Screen | Action |
|---|---|---|
| Pull down | Home, Workouts, History | Refresh data |
| Swipe left/right | Active workout | Navigate between exercises |
| Long press | Session recap | View exercise detail |
| Drag | Share card | Reposition title or stats block |

---

*Tanren . Built rep by rep.*
