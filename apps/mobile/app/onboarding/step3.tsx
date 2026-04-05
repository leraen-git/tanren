import React, { useState } from 'react'
import { View, Text, TextInput, TouchableOpacity } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { useTheme } from '@/theme/ThemeContext'
import { colors as tokenColors } from '@/theme/tokens'
import { trpc } from '@/lib/trpc'

export default function OnboardingStep3() {
  const { colors, typography, spacing, radius } = useTheme()
  const [height, setHeight] = useState('')
  const [weight, setWeight] = useState('')
  const updateMe = trpc.users.updateMe.useMutation()

  const handleFinish = async () => {
    await updateMe.mutateAsync({
      heightCm: height ? parseFloat(height) : null,
      weightKg: weight ? parseFloat(weight) : null,
      onboardingDone: true,
    })
    router.replace('/' as any)
  }

  const inputStyle = {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.base,
    fontFamily: typography.family.semiBold,
    fontSize: typography.size['2xl'],
    color: colors.textPrimary,
    textAlign: 'center' as const,
    borderWidth: 2,
    borderColor: colors.surface2,
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ flex: 1, padding: spacing.xl, gap: spacing.xl, justifyContent: 'center' }}>

        {/* Progress dots */}
        <View style={{ flexDirection: 'row', gap: spacing.sm, justifyContent: 'center' }}>
          <View style={{ width: 8, height: 6, borderRadius: 3, backgroundColor: colors.surface2 }} />
          <View style={{ width: 8, height: 6, borderRadius: 3, backgroundColor: colors.surface2 }} />
          <View style={{ width: 24, height: 6, borderRadius: 3, backgroundColor: colors.primary }} />
        </View>

        {/* Title */}
        <View style={{ gap: spacing.sm }}>
          <Text style={{ fontFamily: typography.family.extraBold, fontSize: typography.size['3xl'], color: colors.textPrimary }}>
            Body{'\n'}<Text style={{ color: colors.primary }}>Measurements</Text>
          </Text>
          <Text style={{ fontFamily: typography.family.regular, fontSize: typography.size.body, color: colors.textMuted }}>
            Optional — helps us tailor volume and intensity recommendations.
          </Text>
        </View>

        {/* Height */}
        <View style={{ gap: spacing.sm }}>
          <Text style={{ fontFamily: typography.family.semiBold, fontSize: typography.size.body, color: colors.textPrimary }}>
            Height
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
            <TextInput
              value={height}
              onChangeText={setHeight}
              placeholder="178"
              placeholderTextColor={colors.textMuted}
              keyboardType="decimal-pad"
              style={inputStyle}
              accessibilityLabel="Height in centimeters"
            />
            <View style={{
              backgroundColor: colors.surface2,
              borderRadius: radius.md,
              paddingHorizontal: spacing.base,
              paddingVertical: spacing.base,
            }}>
              <Text style={{ fontFamily: typography.family.semiBold, fontSize: typography.size.body, color: colors.textMuted }}>cm</Text>
            </View>
          </View>
        </View>

        {/* Weight */}
        <View style={{ gap: spacing.sm }}>
          <Text style={{ fontFamily: typography.family.semiBold, fontSize: typography.size.body, color: colors.textPrimary }}>
            Weight
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
            <TextInput
              value={weight}
              onChangeText={setWeight}
              placeholder="75"
              placeholderTextColor={colors.textMuted}
              keyboardType="decimal-pad"
              style={inputStyle}
              accessibilityLabel="Weight in kilograms"
            />
            <View style={{
              backgroundColor: colors.surface2,
              borderRadius: radius.md,
              paddingHorizontal: spacing.base,
              paddingVertical: spacing.base,
            }}>
              <Text style={{ fontFamily: typography.family.semiBold, fontSize: typography.size.body, color: colors.textMuted }}>kg</Text>
            </View>
          </View>
        </View>

        {/* Privacy disclaimer */}
        <Text style={{
          fontFamily: typography.family.regular,
          fontSize: typography.size.xs,
          color: colors.textMuted,
          textAlign: 'center',
          lineHeight: 16,
        }}>
          🔒 Your data is stored securely on our servers and never shared with third parties.
        </Text>

        {/* Finish */}
        <TouchableOpacity
          onPress={handleFinish}
          disabled={updateMe.isPending}
          style={{
            backgroundColor: colors.primary,
            borderRadius: radius.lg,
            paddingVertical: spacing.base,
            alignItems: 'center',
          }}
          accessibilityLabel="Start training"
          accessibilityRole="button"
        >
          <Text style={{ fontFamily: typography.family.extraBold, fontSize: typography.size.xl, color: tokenColors.white }}>
            Let's go 🚀
          </Text>
        </TouchableOpacity>

        {/* Skip */}
        <TouchableOpacity
          onPress={() => handleFinish()}
          accessibilityLabel="Skip this step"
          accessibilityRole="button"
          style={{ alignItems: 'center' }}
        >
          <Text style={{ fontFamily: typography.family.regular, fontSize: typography.size.base, color: colors.textMuted }}>
            Skip for now
          </Text>
        </TouchableOpacity>

      </View>
    </SafeAreaView>
  )
}
