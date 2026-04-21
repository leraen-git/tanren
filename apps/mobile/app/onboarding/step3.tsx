import React, { useState } from 'react'
import { View, Text, TextInput, TouchableOpacity } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { useTheme } from '@/theme/ThemeContext'
import { trpc } from '@/lib/trpc'
import { useTranslation } from 'react-i18next'

export default function OnboardingStep3() {
  const { tokens, fonts } = useTheme()
  const { t } = useTranslation()
  const [height, setHeight] = useState('')
  const [weight, setWeight] = useState('')
  const updateMe = trpc.users.updateMe.useMutation()

  const handleFinish = async () => {
    await updateMe.mutateAsync({
      heightCm: height ? parseFloat(height) : null,
      weightKg: weight ? parseFloat(weight) : null,
      onboardingDone: true,
    })
    router.replace('/')
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: tokens.bg }}>
      <View style={{ flex: 1, padding: 20, gap: 24, justifyContent: 'center' }}>

        {/* Progress dots */}
        <View style={{ flexDirection: 'row', gap: 4, justifyContent: 'center' }}>
          <View style={{ width: 6, height: 6, backgroundColor: tokens.border }} />
          <View style={{ width: 6, height: 6, backgroundColor: tokens.border }} />
          <View style={{ width: 16, height: 6, backgroundColor: tokens.accent }} />
        </View>

        {/* Title */}
        <View style={{ gap: 6 }}>
          <Text style={{ fontFamily: fonts.sansX, fontSize: 24, color: tokens.text, textTransform: 'uppercase' }}>
            {t('onboarding.step3TitlePre', { defaultValue: 'Body' })}{'\n'}
            <Text style={{ color: tokens.accent }}>{t('onboarding.step3Title', { defaultValue: 'Measurements' })}</Text>
          </Text>
          <Text style={{ fontFamily: fonts.sans, fontSize: 13, color: tokens.textMute, lineHeight: 20 }}>
            {t('onboarding.step3Subtitle', { defaultValue: 'Optional — helps us tailor volume and intensity recommendations.' })}
          </Text>
        </View>

        {/* Height */}
        <View style={{ gap: 6 }}>
          <Text style={{ fontFamily: fonts.sansB, fontSize: 9, color: tokens.textMute, textTransform: 'uppercase', letterSpacing: 2 }}>
            {t('onboarding.heightLabel', { defaultValue: 'HEIGHT' })}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <TextInput
              value={height}
              onChangeText={setHeight}
              placeholder="178"
              placeholderTextColor={tokens.textGhost}
              keyboardType="decimal-pad"
              style={{
                flex: 1,
                fontFamily: fonts.monoB,
                fontSize: 24,
                color: tokens.text,
                borderBottomWidth: 1,
                borderBottomColor: height ? tokens.accent : tokens.border,
                paddingVertical: 8,
                textAlign: 'center',
              }}
              accessibilityLabel="Height in centimeters"
            />
            <View style={{ borderWidth: 1, borderColor: tokens.border, paddingHorizontal: 12, paddingVertical: 8 }}>
              <Text style={{ fontFamily: fonts.sansB, fontSize: 11, color: tokens.textMute, textTransform: 'uppercase' }}>cm</Text>
            </View>
          </View>
        </View>

        {/* Weight */}
        <View style={{ gap: 6 }}>
          <Text style={{ fontFamily: fonts.sansB, fontSize: 9, color: tokens.textMute, textTransform: 'uppercase', letterSpacing: 2 }}>
            {t('onboarding.weightLabel', { defaultValue: 'WEIGHT' })}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <TextInput
              value={weight}
              onChangeText={setWeight}
              placeholder="75"
              placeholderTextColor={tokens.textGhost}
              keyboardType="decimal-pad"
              style={{
                flex: 1,
                fontFamily: fonts.monoB,
                fontSize: 24,
                color: tokens.text,
                borderBottomWidth: 1,
                borderBottomColor: weight ? tokens.accent : tokens.border,
                paddingVertical: 8,
                textAlign: 'center',
              }}
              accessibilityLabel="Weight in kilograms"
            />
            <View style={{ borderWidth: 1, borderColor: tokens.border, paddingHorizontal: 12, paddingVertical: 8 }}>
              <Text style={{ fontFamily: fonts.sansB, fontSize: 11, color: tokens.textMute, textTransform: 'uppercase' }}>kg</Text>
            </View>
          </View>
        </View>

        {/* Privacy disclaimer */}
        <Text style={{
          fontFamily: fonts.sans, fontSize: 10, color: tokens.textMute,
          textAlign: 'center', lineHeight: 16,
        }}>
          {t('onboarding.privacyDisclaimer', { defaultValue: 'Your data is stored securely on our servers and never shared with third parties.' })}
        </Text>

        {/* Finish */}
        <TouchableOpacity
          onPress={handleFinish}
          disabled={updateMe.isPending}
          style={{
            backgroundColor: tokens.accent,
            height: 48,
            alignItems: 'center',
            justifyContent: 'center',
          }}
          accessibilityLabel="Start training"
          accessibilityRole="button"
        >
          <Text style={{ fontFamily: fonts.sansX, fontSize: 14, color: '#FFFFFF', textTransform: 'uppercase', letterSpacing: 1 }}>
            {t('onboarding.letsGo', { defaultValue: "LET'S GO" })}
          </Text>
        </TouchableOpacity>

        {/* Skip */}
        <TouchableOpacity
          onPress={() => handleFinish()}
          accessibilityLabel="Skip this step"
          accessibilityRole="button"
          style={{ height: 44, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: tokens.border }}
        >
          <Text style={{ fontFamily: fonts.sansB, fontSize: 11, color: tokens.textMute, textTransform: 'uppercase', letterSpacing: 1 }}>
            {t('onboarding.skip', { defaultValue: 'SKIP FOR NOW' })}
          </Text>
        </TouchableOpacity>

      </View>
    </SafeAreaView>
  )
}
