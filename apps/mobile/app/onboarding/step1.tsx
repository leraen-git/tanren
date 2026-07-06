import React, { useState, useEffect } from 'react'
import { View, Text, TextInput, TouchableOpacity, Alert, ScrollView } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { useTheme } from '@/theme/ThemeContext'
import { trpc } from '@/lib/trpc'
import { useProfile } from '@/data/useProfile'
import { useTranslation } from 'react-i18next'
import { useOnboardingStore } from '@/stores/onboardingStore'

export default function OnboardingStep1() {
  const { tokens, fonts, label } = useTheme()
  const { t } = useTranslation()
  const { data: me } = useProfile()
  const providerName = me?.name && me.name !== 'Athlete' ? me.name : ''
  const isGoogle = me?.authProvider === 'google'
  const ob = useOnboardingStore()
  const [name, setName] = useState(ob.name ?? providerName)
  const [gender, setGender] = useState<'male' | 'female' | null>(ob.gender)
  const updateMe = trpc.users.updateMe.useMutation({
    onError: (err) => Alert.alert(t('common.error'), err.message),
  })
  const canContinue = !!name.trim() && !!gender

  useEffect(() => { ob.setStep(1) }, [])
  useEffect(() => {
    if (providerName && !name) setName(providerName)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [providerName])

  const handleNext = async () => {
    if (!name.trim()) {
      Alert.alert(t('onboarding.alertMissingName'), t('onboarding.alertMissingNameDesc'))
      return
    }
    if (!gender) {
      Alert.alert(t('onboarding.alertMissingGender'), t('onboarding.alertMissingGenderDesc'))
      return
    }
    ob.setField('name', name.trim())
    ob.setField('gender', gender)
    try {
      await updateMe.mutateAsync({ name: name.trim(), gender })
      router.push('/onboarding/step2')
    } catch {
      // onError already shows the alert
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: tokens.bg }}>
      {/* Top bar: back + continue */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 12 }}>
        <TouchableOpacity
          onPress={() => router.back()}
          accessibilityLabel={t('common.back')}
          accessibilityRole="button"
        >
          <Text style={{ fontFamily: fonts.sansB, fontSize: 13, color: tokens.accent, textTransform: 'uppercase', letterSpacing: 0.5 }}>
            {'< '}{t('common.back').toUpperCase()}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={handleNext}
          disabled={!canContinue || updateMe.isPending}
          accessibilityLabel={t('onboarding.continue')}
          accessibilityRole="button"
        >
          <Text style={{
            fontFamily: fonts.sansX, fontSize: 13,
            color: canContinue ? tokens.accent : tokens.textGhost,
            textTransform: 'uppercase', letterSpacing: 0.5,
          }}>
            {t('onboarding.continue').toUpperCase()}{' >'}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 20, gap: 24, paddingBottom: 40 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Progress dots */}
        <View style={{ flexDirection: 'row', gap: 4, justifyContent: 'center' }}>
          <View style={{ width: 16, height: 6, backgroundColor: tokens.accent }} />
          <View style={{ width: 6, height: 6, backgroundColor: tokens.border }} />
        </View>

        {/* Title */}
        <View style={{ gap: 6 }}>
          <Text style={{ fontFamily: fonts.sansX, fontSize: 24, color: tokens.text, textTransform: 'uppercase' }}>
            {t('onboarding.welcomeTo')}{'\n'}<Text style={{ color: tokens.accent }}>Tanren</Text>
          </Text>
          <Text style={{ fontFamily: fonts.sans, fontSize: 13, color: tokens.textMute }}>
            {t('onboarding.step1Subtitle')}
          </Text>
        </View>

        {/* Name */}
        <View style={{ gap: 6 }}>
          <Text style={{ ...label.sm, color: tokens.textMute }}>
            {t('onboarding.nameLabel')}
          </Text>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder={t('onboarding.namePlaceholder')}
            placeholderTextColor={tokens.textGhost}
            autoFocus
            style={{
              fontFamily: fonts.sansX,
              fontSize: 20,
              color: tokens.text,
              borderBottomWidth: 1,
              borderBottomColor: name ? tokens.accent : tokens.border,
              paddingVertical: 8,
            }}
            accessibilityLabel={t('onboarding.nameLabel')}
          />
          {providerName ? (
            <Text style={{ fontFamily: fonts.sans, fontSize: 10, color: tokens.textMute }}>
              {isGoogle ? t('onboarding.nameFromGoogle') : t('onboarding.nameFromApple')}
            </Text>
          ) : null}
        </View>

        {/* Gender */}
        <View style={{ gap: 6 }}>
          <Text style={{ ...label.sm, color: tokens.textMute }}>
            {t('onboarding.genderLabel')}
          </Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {(['male', 'female'] as const).map((g) => {
              const selected = gender === g
              const label = g === 'male' ? t('intake.male') : t('intake.female')
              return (
                <TouchableOpacity
                  key={g}
                  onPress={() => setGender(g)}
                  style={{
                    flex: 1,
                    paddingVertical: 16,
                    borderWidth: 1,
                    borderColor: selected ? tokens.accent : tokens.border,
                    backgroundColor: selected ? tokens.accent : 'transparent',
                    alignItems: 'center',
                  }}
                  accessibilityLabel={label}
                  accessibilityRole="button"
                >
                  <Text style={{
                    fontFamily: fonts.sansB,
                    fontSize: 13,
                    color: selected ? '#FFFFFF' : tokens.textMute,
                    textTransform: 'uppercase',
                    letterSpacing: 1,
                  }}>
                    {label}
                  </Text>
                </TouchableOpacity>
              )
            })}
          </View>
        </View>

        {/* Privacy disclaimer */}
        <Text style={{
          fontFamily: fonts.sans, fontSize: 10, color: tokens.textMute,
          textAlign: 'center', lineHeight: 16, marginTop: 8,
        }}>
          {t('onboarding.privacyDisclaimer')}
        </Text>
      </ScrollView>
    </SafeAreaView>
  )
}
