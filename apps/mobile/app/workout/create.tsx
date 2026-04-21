import React, { useState } from 'react'
import { View, Text, TextInput, ScrollView, TouchableOpacity } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { useTheme } from '@/theme/ThemeContext'
import { Button } from '@/components/Button'
import { trpc } from '@/lib/trpc'

export default function CreateWorkoutScreen() {
  const { tokens, fonts } = useTheme()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const utils = trpc.useUtils()

  const createWorkout = trpc.workouts.create.useMutation({
    onSuccess: () => {
      utils.workouts.list.invalidate()
      router.back()
    },
  })

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: tokens.bg }}>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 20 }}>
        <TouchableOpacity onPress={() => router.back()} accessibilityLabel="Go back" accessibilityRole="button">
          <Text style={{ fontFamily: fonts.sansB, fontSize: 10, color: tokens.accent, textTransform: 'uppercase', letterSpacing: 2 }}>
            {'< BACK'}
          </Text>
        </TouchableOpacity>

        <Text style={{ fontFamily: fonts.sansX, fontSize: 24, color: tokens.text, textTransform: 'uppercase' }}>
          New workout
        </Text>

        <View style={{ gap: 6 }}>
          <Text style={{ fontFamily: fonts.sansB, fontSize: 9, color: tokens.textMute, textTransform: 'uppercase', letterSpacing: 2 }}>
            NAME *
          </Text>
          <TextInput
            value={name}
            onChangeText={setName}
            style={{
              fontFamily: fonts.sansX,
              fontSize: 20,
              color: tokens.text,
              borderBottomWidth: 1,
              borderBottomColor: tokens.border,
              paddingVertical: 6,
            }}
            placeholder="e.g. Push Day A"
            placeholderTextColor={tokens.textGhost}
            accessibilityLabel="Workout name"
          />
        </View>

        <View style={{ gap: 6 }}>
          <Text style={{ fontFamily: fonts.sansB, fontSize: 9, color: tokens.textMute, textTransform: 'uppercase', letterSpacing: 2 }}>
            DESCRIPTION
          </Text>
          <TextInput
            value={description}
            onChangeText={setDescription}
            style={{
              fontFamily: fonts.sans,
              fontSize: 14,
              color: tokens.text,
              borderWidth: 1,
              borderColor: tokens.border,
              padding: 12,
              minHeight: 100,
              textAlignVertical: 'top',
            }}
            placeholder="Optional notes..."
            placeholderTextColor={tokens.textGhost}
            multiline
            accessibilityLabel="Workout description"
          />
        </View>

        <Button
          label="Create workout"
          onPress={() => createWorkout.mutate({ name, description })}
          loading={createWorkout.isPending}
          disabled={!name.trim()}
        />
        <TouchableOpacity
          onPress={() => router.back()}
          style={{ height: 44, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: tokens.border }}
          accessibilityLabel="Cancel"
          accessibilityRole="button"
        >
          <Text style={{ fontFamily: fonts.sansB, fontSize: 13, color: tokens.textDim, textTransform: 'uppercase', letterSpacing: 1 }}>
            CANCEL
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  )
}
