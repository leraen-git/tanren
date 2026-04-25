import React, { useState } from 'react'
import { View, Text, TextInput, TouchableOpacity, Alert } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useTheme } from '@/theme/ThemeContext'
import { trpc } from '@/lib/trpc'
import { useTranslation } from 'react-i18next'
import { useOnboardingStore } from '@/stores/onboardingStore'

export default function OnboardingStep3() {
  const { tokens, fonts } = useTheme()
  const { t } = useTranslation()
  const ob = useOnboardingStore()
  const [height, setHeight] = useState(ob.heightCm)
  const [weight, setWeight] = useState(ob.weightKg)

  React.useEffect(() => { ob.setStep(3) }, [])
  const updateMe = trpc.users.updateMe.useMutation({
    onError: (err) => Alert.alert(t('common.error'), err.message),
  })
  const utils = trpc.useUtils()

  const handleFinish = async () => {
    ob.setField('heightCm', height)
    ob.setField('weightKg', weight)
    await updateMe.mutateAsync({
      heightCm: height ? parseFloat(height) : null,
      weightKg: weight ? parseFloat(weight) : null,
      onboardingDone: true,
    })
    ob.reset()
    await utils.auth.me.invalidate()
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
            {t('onboarding.step3TitlePre')}{'\n'}
            <Text style={{ color: tokens.accent }}>{t('onboarding.step3Title')}</Text>
          </Text>
          <Text style={{ fontFamily: fonts.sans, fontSize: 13, color: tokens.textMute, lineHeight: 20 }}>
            {t('onboarding.step3Subtitle')}
          </Text>
        </View>

        {/* Height */}
        <View style={{ gap: 6 }}>
          <Text style={{ fontFamily: fonts.sansB, fontSize: 9, color: tokens.textMute, textTransform: 'uppercase', letterSpacing: 2 }}>
            {t('onboarding.heightLabel')}
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
              accessibilityLabel={t('onboarding.heightLabel')}
            />
            <View style={{ borderWidth: 1, borderColor: tokens.border, paddingHorizontal: 12, paddingVertical: 8 }}>
              <Text style={{ fontFamily: fonts.sansB, fontSize: 11, color: tokens.textMute, textTransform: 'uppercase' }}>cm</Text>
            </View>
          </View>
        </View>

        {/* Weight */}
        <View style={{ gap: 6 }}>
          <Text style={{ fontFamily: fonts.sansB, fontSize: 9, color: tokens.textMute, textTransform: 'uppercase', letterSpacing: 2 }}>
            {t('onboarding.weightLabel')}
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
              accessibilityLabel={t('onboarding.weightLabel')}
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
          {t('onboarding.privacyDisclaimer')}
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
          accessibilityLabel={t('onboarding.letsGo')}
          accessibilityRole="button"
        >
          <Text style={{ fontFamily: fonts.sansX, fontSize: 14, color: '#FFFFFF', textTransform: 'uppercase', letterSpacing: 1 }}>
            {t('onboarding.letsGo')}
          </Text>
        </TouchableOpacity>

        {/* Skip */}
        <TouchableOpacity
          onPress={() => handleFinish()}
          accessibilityLabel={t('onboarding.skip')}
          accessibilityRole="button"
          style={{ height: 44, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: tokens.border }}
        >
          <Text style={{ fontFamily: fonts.sansB, fontSize: 11, color: tokens.textMute, textTransform: 'uppercase', letterSpacing: 1 }}>
            {t('onboarding.skip')}
          </Text>
        </TouchableOpacity>

      </View>
    </SafeAreaView>
  )
}
