import React from 'react'
import { View, Text, ScrollView, TouchableOpacity } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { useTheme } from '@/theme/ThemeContext'
import { useTranslation } from 'react-i18next'

export default function CGUScreen() {
  const { tokens, fonts, label } = useTheme()
  const { t } = useTranslation()

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: tokens.bg }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12 }}>
        <TouchableOpacity onPress={() => router.back()} accessibilityRole="button">
          <Text style={{ ...label.md, color: tokens.accent }}>
            {'< RETOUR'}
          </Text>
        </TouchableOpacity>
        <Text style={{ fontFamily: fonts.sansX, fontSize: 20, color: tokens.text, textTransform: 'uppercase' }}>
          {t('legal.cguTitle')}
        </Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, gap: 20, paddingBottom: 40 }}>
        <Text style={{ fontFamily: fonts.sans, fontSize: 11, color: tokens.textMute }}>
          {t('legal.lastUpdated')} : 26/04/2026
        </Text>

        <Section title={t('legal.cgu1Title')} fonts={fonts} tokens={tokens}>
          <P fonts={fonts} tokens={tokens}>{t('legal.cgu1Body')}</P>
        </Section>

        <Section title={t('legal.cgu2Title')} fonts={fonts} tokens={tokens}>
          <P fonts={fonts} tokens={tokens}>{t('legal.cgu2Body')}</P>
        </Section>

        <Section title={t('legal.cgu3Title')} fonts={fonts} tokens={tokens}>
          <P fonts={fonts} tokens={tokens}>{t('legal.cgu3Body')}</P>
        </Section>

        <Section title={t('legal.cgu4Title')} fonts={fonts} tokens={tokens}>
          <P fonts={fonts} tokens={tokens}>{t('legal.cgu4Body')}</P>
        </Section>

        <Section title={t('legal.cgu5Title')} fonts={fonts} tokens={tokens}>
          <P fonts={fonts} tokens={tokens}>{t('legal.cgu5Body')}</P>
        </Section>

        <Section title={t('legal.cgu6Title')} fonts={fonts} tokens={tokens}>
          <P fonts={fonts} tokens={tokens}>{t('legal.cgu6Body')}</P>
        </Section>

        <Section title={t('legal.cgu7Title')} fonts={fonts} tokens={tokens}>
          <P fonts={fonts} tokens={tokens}>{t('legal.cgu7Body')}</P>
        </Section>

        <Text style={{ fontFamily: fonts.sans, fontSize: 11, color: tokens.textGhost, textAlign: 'center', marginTop: 12 }}>
          {t('legal.contact')} : contact@tanren.fr
        </Text>
      </ScrollView>
    </SafeAreaView>
  )
}

function Section({ title, children, fonts, tokens }: { title: string; children: React.ReactNode; fonts: any; tokens: any }) {
  return (
    <View style={{ gap: 8 }}>
      <Text style={{ fontFamily: fonts.sansB, fontSize: 14, color: tokens.text, textTransform: 'uppercase', letterSpacing: 0.8 }}>
        {title}
      </Text>
      {children}
    </View>
  )
}

function P({ children, fonts, tokens }: { children: React.ReactNode; fonts: any; tokens: any }) {
  return (
    <Text style={{ fontFamily: fonts.sans, fontSize: 13, color: tokens.textDim, lineHeight: 20 }}>
      {children}
    </Text>
  )
}
