import { Pressable, Text, View, StyleSheet } from 'react-native'
import { useTheme } from '@/theme/ThemeContext'
import { useTranslation } from 'react-i18next'
import { TapValueCell } from './TapValueCell'
import { TapTimerCell } from './TapTimerCell'
import { translateMuscleGroup } from '@/hooks/useExercises'
import type { ExerciseEntry } from '@/stores/workoutDraftStore'

type Props = {
  index: number
  entry: ExerciseEntry
  onUpdate: (patch: Partial<ExerciseEntry>) => void
  onDelete: () => void
  onLongPress?: () => void
  isDragging?: boolean
}

export function ExerciseRow({ index, entry, onUpdate, onDelete, onLongPress, isDragging }: Props) {
  const { tokens, fonts } = useTheme()
  const { t } = useTranslation()

  return (
    <Pressable onLongPress={onLongPress} delayLongPress={300}>
      <View style={[
        styles.row,
        {
          borderColor: tokens.border,
          borderLeftColor: tokens.accent,
          backgroundColor: isDragging ? tokens.surface2 : tokens.surface1,
        },
      ]}>
        {/* Header */}
        <View style={styles.head}>
          <Text style={[styles.dragHandle, { color: tokens.textGhost, fontFamily: fonts.sansB }]}>
            {'\u2261'}
          </Text>
          <View style={styles.info}>
            <View style={[styles.orderBadge, { borderColor: tokens.accent }]}>
              <Text style={[styles.orderNum, { fontFamily: fonts.sansB, color: tokens.accent }]}>
                {String(index + 1).padStart(2, '0')}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.name, { fontFamily: fonts.sansB, color: tokens.text }]}>
                {entry.exerciseName}
              </Text>
              <Text style={[styles.muscle, { fontFamily: fonts.sans, color: tokens.textMute }]}>
                {entry.muscleGroups.slice(0, 2).map((mg) => translateMuscleGroup(mg, t)).join(' / ')}
              </Text>
            </View>
          </View>
          <Pressable onPress={onDelete} hitSlop={8}>
            <Text style={{ fontFamily: fonts.sansB, fontSize: 16, color: tokens.textMute }}>
              {'\u2715'}
            </Text>
          </Pressable>
        </View>

        {/* 4-cell value row */}
        <View style={[styles.stepperRow, { borderTopColor: tokens.border }]}>
          <TapValueCell label={t('workout.cellSets')} value={entry.sets} onChange={(v) => onUpdate({ sets: v })} min={1} max={20} />
          <TapValueCell label={t('workout.cellReps')} value={entry.reps} onChange={(v) => onUpdate({ reps: v })} min={1} max={100} />
          <TapValueCell label={t('workout.cellWeight')} value={entry.weight} unit=" kg" onChange={(v) => onUpdate({ weight: v })} keyboardType="decimal-pad" min={0} max={999} />
          <TapTimerCell label={t('workout.cellRest')} valueSeconds={entry.restSeconds} onChange={(s) => onUpdate({ restSeconds: s })} />
        </View>
      </View>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  row: {
    borderWidth: 1,
    borderLeftWidth: 3,
    marginBottom: 8,
  },
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    gap: 8,
  },
  dragHandle: {
    fontSize: 20,
  },
  info: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  orderBadge: {
    width: 28,
    height: 28,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  orderNum: {
    fontSize: 11,
  },
  name: {
    fontSize: 13,
    textTransform: 'uppercase',
  },
  muscle: {
    fontSize: 11,
  },
  stepperRow: {
    flexDirection: 'row',
    borderTopWidth: 1,
  },
})
