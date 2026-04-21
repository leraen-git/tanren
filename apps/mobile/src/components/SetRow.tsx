import React from 'react'
import { View, Text, TextInput, TouchableOpacity } from 'react-native'
import { useTheme } from '@/theme/ThemeContext'

interface SetRowProps {
  setNumber: number
  reps: number
  weight: number
  isCompleted: boolean
  previousReps?: number
  previousWeight?: number
  onRepsChange: (v: number) => void
  onWeightChange: (v: number) => void
  onComplete: () => void
}

export function SetRow({
  setNumber,
  reps,
  weight,
  isCompleted,
  previousReps,
  previousWeight,
  onRepsChange,
  onWeightChange,
  onComplete,
}: SetRowProps) {
  const { tokens, fonts } = useTheme()

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        borderBottomWidth: 1,
        borderBottomColor: tokens.border,
        paddingVertical: 10,
        borderLeftWidth: isCompleted ? 3 : 0,
        borderLeftColor: tokens.green,
      }}
    >
      {/* Set number */}
      <View style={{ width: 24, height: 24, borderWidth: 1, borderColor: tokens.accent, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ fontFamily: fonts.sansB, fontSize: 11, color: tokens.accent }}>
          {setNumber}
        </Text>
      </View>

      {/* Previous ghost values */}
      <Text style={{ fontFamily: fonts.mono, fontSize: 10, color: tokens.textGhost, width: 60, textAlign: 'center' }}>
        {previousReps != null && previousWeight != null
          ? `${previousReps}x${previousWeight}kg`
          : '--'}
      </Text>

      {/* Reps input */}
      <TextInput
        value={reps > 0 ? String(reps) : ''}
        onChangeText={(v) => onRepsChange(parseInt(v) || 0)}
        keyboardType="numeric"
        placeholder="Reps"
        placeholderTextColor={tokens.textGhost}
        style={{
          flex: 1,
          color: tokens.text,
          fontFamily: fonts.monoB,
          fontSize: 14,
          borderBottomWidth: 1,
          borderBottomColor: tokens.border,
          paddingVertical: 4,
          textAlign: 'center',
        }}
        accessibilityLabel={`Set ${setNumber} reps`}
        accessibilityRole="none"
        editable={!isCompleted}
      />

      {/* Weight input */}
      <TextInput
        value={weight > 0 ? String(weight) : ''}
        onChangeText={(v) => onWeightChange(parseFloat(v) || 0)}
        keyboardType="decimal-pad"
        placeholder="kg"
        placeholderTextColor={tokens.textGhost}
        style={{
          flex: 1,
          color: tokens.text,
          fontFamily: fonts.monoB,
          fontSize: 14,
          borderBottomWidth: 1,
          borderBottomColor: tokens.border,
          paddingVertical: 4,
          textAlign: 'center',
        }}
        accessibilityLabel={`Set ${setNumber} weight`}
        accessibilityRole="none"
        editable={!isCompleted}
      />

      {/* Complete button */}
      <TouchableOpacity
        onPress={onComplete}
        disabled={isCompleted}
        style={{
          width: 28,
          height: 28,
          borderWidth: 1,
          borderColor: isCompleted ? tokens.green : tokens.border,
          backgroundColor: isCompleted ? tokens.green : 'transparent',
          alignItems: 'center',
          justifyContent: 'center',
        }}
        accessibilityLabel={isCompleted ? 'Set completed' : `Complete set ${setNumber}`}
        accessibilityRole="button"
      >
        <Text style={{ color: isCompleted ? '#FFFFFF' : tokens.textMute, fontFamily: fonts.sansB, fontSize: 12 }}>
          {isCompleted ? 'V' : 'O'}
        </Text>
      </TouchableOpacity>
    </View>
  )
}
