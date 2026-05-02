import React, { useRef, useCallback } from 'react'
import {
  View, Text, TextInput, ScrollView, TouchableOpacity,
  Alert, KeyboardAvoidingView, Platform, PanResponder, LayoutChangeEvent,
} from 'react-native'
import { router } from 'expo-router'
import { useTheme } from '@/theme/ThemeContext'
import { Screen } from '@/components/Screen'
import { ScreenHeader } from '@/components/ScreenHeader'
import { Button } from '@/components/Button'
import { Chip } from '@/components/Chip'
import { useIntakeDraftV2Store } from '@/stores/intakeDraftV2Store'
import type { CookingStyle } from '@/stores/intakeDraftV2Store'
import { useTranslation } from 'react-i18next'

function ProgressPills({ step }: { step: number }) {
  const { tokens } = useTheme()
  return (
    <View style={{ flexDirection: 'row', gap: 4 }}>
      {[0, 1, 2, 3].map((i) => (
        <View key={i} style={{
          flex: 1, height: 3,
          backgroundColor: i <= step ? tokens.accent : tokens.surface2,
        }} />
      ))}
    </View>
  )
}

function MiniLabel({ children }: { children: string }) {
  const { tokens, fonts, label } = useTheme()
  return (
    <Text style={{ ...label.sm, color: tokens.textMute }}>
      {children}
    </Text>
  )
}

function RadioCard({
  title, desc, selected, onPress,
}: { title: string; desc: string; selected: boolean; onPress: () => void }) {
  const { tokens, fonts, label } = useTheme()
  return (
    <TouchableOpacity
      onPress={onPress}
      style={{
        padding: 14,
        borderWidth: 1,
        borderColor: selected ? tokens.accent : tokens.border,
        backgroundColor: selected ? `${tokens.accent}10` : 'transparent',
      }}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
    >
      <Text style={{ fontFamily: fonts.sansB, fontSize: 14, color: tokens.text }}>
        {title}
      </Text>
      <Text style={{ fontFamily: fonts.sans, fontSize: 12, color: tokens.textMute, marginTop: 2 }}>
        {desc}
      </Text>
    </TouchableOpacity>
  )
}

function AdventureSlider({
  value, onChange, tokens, fonts, minLabel, maxLabel,
}: {
  value: number; onChange: (v: number) => void
  tokens: any; fonts: any; minLabel: string; maxLabel: string
}) {
  const trackWidth = useRef(0)
  const clamp = (v: number) => Math.max(1, Math.min(10, Math.round(v)))

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt) => {
        if (trackWidth.current > 0) {
          const x = evt.nativeEvent.locationX
          onChange(clamp(1 + (x / trackWidth.current) * 9))
        }
      },
      onPanResponderMove: (evt) => {
        if (trackWidth.current > 0) {
          const x = evt.nativeEvent.locationX
          onChange(clamp(1 + (x / trackWidth.current) * 9))
        }
      },
    }),
  ).current

  const onLayout = useCallback((e: LayoutChangeEvent) => {
    trackWidth.current = e.nativeEvent.layout.width
  }, [])

  const pct = ((value - 1) / 9) * 100

  return (
    <View style={{ backgroundColor: tokens.surface2, padding: 14, gap: 12 }}>
      <Text style={{ fontFamily: fonts.sansX, fontSize: 28, color: tokens.text }}>
        {value}<Text style={{ fontFamily: fonts.sans, fontSize: 14, color: tokens.textMute }}>{'  / 10'}</Text>
      </Text>
      <View
        onLayout={onLayout}
        {...panResponder.panHandlers}
        style={{ height: 32, justifyContent: 'center' }}
      >
        <View style={{ height: 4, backgroundColor: tokens.border, overflow: 'hidden' }}>
          <View style={{ height: 4, width: `${pct}%`, backgroundColor: tokens.accent }} />
        </View>
        <View style={{
          position: 'absolute', left: `${pct}%`, marginLeft: -12,
          width: 24, height: 24, backgroundColor: tokens.accent,
          alignItems: 'center', justifyContent: 'center',
        }}>
          <Text style={{ fontFamily: fonts.monoB, fontSize: 10, color: '#FFFFFF' }}>{value}</Text>
        </View>
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <Text style={{ fontFamily: fonts.sans, fontSize: 11, color: tokens.textMute }}>{minLabel}</Text>
        <Text style={{ fontFamily: fonts.sans, fontSize: 11, color: tokens.textMute }}>{maxLabel}</Text>
      </View>
    </View>
  )
}

const RESTRICTIONS = [
  { key: 'Végétarien', i18n: 'restrictionVegetarian' },
  { key: 'Végan', i18n: 'restrictionVegan' },
  { key: 'Sans gluten', i18n: 'restrictionGlutenFree' },
  { key: 'Sans lactose', i18n: 'restrictionLactoseFree' },
  { key: 'Fruits à coque', i18n: 'restrictionNutFree' },
  { key: 'Sans œufs', i18n: 'restrictionEggFree' },
] as const

export default function IntakeFoodPreferencesScreen() {
  const { tokens, fonts, label } = useTheme()
  const { t } = useTranslation()
  const { draft, update } = useIntakeDraftV2Store()

  function toggleRestriction(key: string) {
    const next = draft.restrictions.includes(key)
      ? draft.restrictions.filter((r) => r !== key)
      : [...draft.restrictions, key]
    update({ restrictions: next })
  }

  function validate(): boolean {
    if (!draft.top5Meals.trim()) {
      Alert.alert(t('intakeV2.errTop5')); return false
    }
    return true
  }

  return (
    <Screen showKanji kanjiChar="錬">
      <ScreenHeader showBack onBack={() => router.back()} />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={{ padding: 16, paddingBottom: 40, gap: 16 }}
          keyboardShouldPersistTaps="handled"
        >
          <ProgressPills step={2} />

          <Text style={{ ...label.md, color: tokens.textMute }}>
            {t('intakeV2.step3Label')}
          </Text>

          <Text style={{
            fontFamily: fonts.sansX, fontSize: 26, color: tokens.text,
            textTransform: 'uppercase', letterSpacing: 0.6,
          }}>
            {t('intakeV2.step3Title')}
          </Text>

          <Text style={{ fontFamily: fonts.sans, fontSize: 13, color: tokens.textDim, lineHeight: 18 }}>
            {t('intakeV2.step3Sub')}
          </Text>

          {/* Top 5 meals */}
          <View style={{ gap: 8 }}>
            <MiniLabel>{t('intakeV2.top5Label')}</MiniLabel>
            <TextInput
              value={draft.top5Meals}
              onChangeText={(v) => update({ top5Meals: v })}
              placeholder={t('intakeV2.top5Placeholder')}
              placeholderTextColor={tokens.textGhost}
              multiline
              style={{
                fontFamily: fonts.sans, fontSize: 14, color: tokens.text,
                backgroundColor: tokens.surface2,
                padding: 12, minHeight: 80,
              }}
            />
          </View>

          {/* Hated foods */}
          <View style={{ gap: 8 }}>
            <MiniLabel>{t('intakeV2.hatedLabel')}</MiniLabel>
            <TextInput
              value={draft.hatedFoods}
              onChangeText={(v) => update({ hatedFoods: v })}
              placeholder={t('intakeV2.hatedPlaceholder')}
              placeholderTextColor={tokens.textGhost}
              style={{
                fontFamily: fonts.sans, fontSize: 14, color: tokens.text,
                backgroundColor: tokens.surface2,
                padding: 12,
              }}
            />
          </View>

          {/* Restrictions */}
          <View style={{ gap: 8 }}>
            <MiniLabel>{t('intakeV2.restrictionsLabel')}</MiniLabel>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {RESTRICTIONS.map(({ key, i18n }) => (
                <Chip
                  key={key}
                  label={t(`intakeV2.${i18n}`)}
                  selected={draft.restrictions.includes(key)}
                  onPress={() => toggleRestriction(key)}
                />
              ))}
            </View>
          </View>

          {/* Cooking style */}
          <View style={{ gap: 8 }}>
            <MiniLabel>{t('intakeV2.cookingLabel')}</MiniLabel>
            <RadioCard
              title={t('intakeV2.cookingHome')}
              desc={t('intakeV2.cookingHomeDesc')}
              selected={draft.cookingStyle === 'HOME_COOKING'}
              onPress={() => update({ cookingStyle: 'HOME_COOKING' as CookingStyle })}
            />
            <RadioCard
              title={t('intakeV2.cookingQuick')}
              desc={t('intakeV2.cookingQuickDesc')}
              selected={draft.cookingStyle === 'QUICK_SIMPLE'}
              onPress={() => update({ cookingStyle: 'QUICK_SIMPLE' as CookingStyle })}
            />
            <RadioCard
              title={t('intakeV2.cookingBatch')}
              desc={t('intakeV2.cookingBatchDesc')}
              selected={draft.cookingStyle === 'MEAL_PREP'}
              onPress={() => update({ cookingStyle: 'MEAL_PREP' as CookingStyle })}
            />
          </View>

          {/* Adventurousness slider */}
          <View style={{ gap: 8 }}>
            <MiniLabel>{t('intakeV2.adventureLabel')}</MiniLabel>
            <AdventureSlider
              value={draft.adventurousness}
              onChange={(v) => update({ adventurousness: v })}
              tokens={tokens}
              fonts={fonts}
              minLabel={t('intakeV2.adventureMin')}
              maxLabel={t('intakeV2.adventureMax')}
            />
          </View>

          <Button
            label={t('intakeV2.continue')}
            onPress={() => { if (validate()) router.push('/diet/intake-v2/snacks') }}
            style={{ marginTop: 4 }}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  )
}
