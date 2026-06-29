import React from 'react'
import { View, Text, ScrollView, TouchableOpacity, Linking } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { useTranslation } from 'react-i18next'
import { useTheme } from '@/theme/ThemeContext'

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  const { tokens, fonts, label } = useTheme()
  return (
    <View style={{ borderWidth: 1, borderColor: tokens.border, padding: 12, gap: 8 }}>
      <Text style={{ fontFamily: fonts.sansB, fontSize: 13, color: tokens.text, textTransform: 'uppercase' }}>
        {title}
      </Text>
      {children}
    </View>
  )
}

function Bullet({ text }: { text: string }) {
  const { tokens, fonts, label } = useTheme()
  return (
    <View style={{ flexDirection: 'row', gap: 8 }}>
      <Text style={{ fontFamily: fonts.sans, fontSize: 12, color: tokens.accent, marginTop: 1 }}>-</Text>
      <Text style={{ fontFamily: fonts.sans, fontSize: 12, color: tokens.textMute, flex: 1, lineHeight: 18 }}>
        {text}
      </Text>
    </View>
  )
}

function Body({ text }: { text: string }) {
  const { tokens, fonts, label } = useTheme()
  return (
    <Text style={{ fontFamily: fonts.sans, fontSize: 12, color: tokens.textMute, lineHeight: 18 }}>
      {text}
    </Text>
  )
}

export default function PrivacyScreen() {
  const { tokens, fonts, label } = useTheme()
  const { t } = useTranslation()

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: tokens.bg }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12 }}>
        <TouchableOpacity
          onPress={() => router.back()}
          accessibilityLabel={t('common.back')}
          accessibilityRole="button"
        >
          <Text style={{ ...label.md, color: tokens.accent }}>
            {'< '}{t('common.back').toUpperCase()}
          </Text>
        </TouchableOpacity>
        <Text style={{ fontFamily: fonts.sansX, fontSize: 20, color: tokens.text, textTransform: 'uppercase' }}>
          {t('profile.dataUsage')}
        </Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 40 }}>
        <View style={{ gap: 6 }}>
          <Text style={{ fontFamily: fonts.sansX, fontSize: 20, color: tokens.text, textTransform: 'uppercase' }}>
            {t('privacyPage.heroTitle')}
          </Text>
          <Text style={{ fontFamily: fonts.sans, fontSize: 13, color: tokens.textMute, lineHeight: 20 }}>
            {t('privacyPage.heroDesc')}
          </Text>
        </View>

        <Section title={t('privacyPage.collectTitle')}>
          <Body text={t('privacyPage.collectIntro')} />

          <View style={{ gap: 4, paddingTop: 4 }}>
            <Text style={{ fontFamily: fonts.sansB, fontSize: 11, color: tokens.text, textTransform: 'uppercase' }}>
              {t('privacyPage.appleTitle')}
            </Text>
            <Bullet text={t('privacyPage.appleEmail')} />
            <Bullet text={t('privacyPage.appleName')} />
            <Bullet text={t('privacyPage.appleId')} />
          </View>

          <View style={{ gap: 4, paddingTop: 4 }}>
            <Text style={{ fontFamily: fonts.sansB, fontSize: 11, color: tokens.text, textTransform: 'uppercase' }}>
              {t('privacyPage.googleTitle')}
            </Text>
            <Bullet text={t('privacyPage.googleEmail')} />
            <Bullet text={t('privacyPage.googleName')} />
            <Bullet text={t('privacyPage.googlePhoto')} />
            <Bullet text={t('privacyPage.googleId')} />
          </View>

          <View style={{ gap: 4, paddingTop: 4 }}>
            <Text style={{ fontFamily: fonts.sansB, fontSize: 11, color: tokens.text, textTransform: 'uppercase' }}>
              {t('privacyPage.emailOtpTitle')}
            </Text>
            <Bullet text={t('privacyPage.emailOtpEmail')} />
          </View>

          <View style={{ gap: 4, paddingTop: 4 }}>
            <Text style={{ fontFamily: fonts.sansB, fontSize: 11, color: tokens.text, textTransform: 'uppercase' }}>
              {t('privacyPage.userInputTitle')}
            </Text>
            <Bullet text={t('privacyPage.userGender')} />
            <Bullet text={t('privacyPage.userLevel')} />
            <Bullet text={t('privacyPage.userHeight')} />
            <Bullet text={t('privacyPage.userSessions')} />
          </View>

          <View style={{ gap: 4, paddingTop: 4 }}>
            <Text style={{ fontFamily: fonts.sansB, fontSize: 11, color: tokens.text, textTransform: 'uppercase' }}>
              {t('privacyPage.appDataTitle')}
            </Text>
            <Bullet text={t('privacyPage.appSessions')} />
            <Bullet text={t('privacyPage.appDiet')} />
            <Bullet text={t('privacyPage.appRecords')} />
            <Bullet text={t('privacyPage.appReminders')} />
            <Bullet text={t('privacyPage.appPhotos')} />
          </View>
        </Section>

        <Section title={t('privacyPage.storageTitle')}>
          <Body text={t('privacyPage.storageBody')} />
          <Bullet text={t('privacyPage.storageDevice')} />
          <Bullet text={t('privacyPage.storageServer')} />
          <Bullet text={t('privacyPage.storageSessions')} />
        </Section>

        <Section title={t('privacyPage.thirdPartiesTitle')}>
          <Body text={t('privacyPage.thirdPartiesBody')} />
          {[
            { name: 'Apple Sign-In', key: 'tpApple' as const },
            { name: 'Google Sign-In', key: 'tpGoogle' as const },
            { name: 'Anthropic / Claude', key: 'tpAnthropic' as const },
            { name: 'Resend', key: 'tpResend' as const },
            { name: 'Sentry', key: 'tpSentry' as const },
          ].map((tp) => (
            <View key={tp.name} style={{ gap: 2, paddingTop: 4 }}>
              <Text style={{ fontFamily: fonts.sansB, fontSize: 11, color: tokens.text, textTransform: 'uppercase' }}>{tp.name}</Text>
              <Body text={t(`privacyPage.${tp.key}`)} />
            </View>
          ))}
        </Section>

        <Section title={t('privacyPage.aiTitle')}>
          <Body text={t('privacyPage.aiBody')} />
        </Section>

        <Section title={t('privacyPage.rightsTitle')}>
          <Bullet text={t('privacyPage.rightsView')} />
          <Bullet text={t('privacyPage.rightsEdit')} />
          <Bullet text={t('privacyPage.rightsDelete')} />
        </Section>

        <View style={{ alignItems: 'center', paddingTop: 8, gap: 4 }}>
          <Text style={{ fontFamily: fonts.sans, fontSize: 12, color: tokens.textMute, textAlign: 'center' }}>
            {t('privacyPage.contactQuestion')}
          </Text>
          <TouchableOpacity
            onPress={() => Linking.openURL('mailto:privacy@tanren.fr')}
            accessibilityRole="link"
            accessibilityLabel="Email privacy@tanren.fr"
          >
            <Text style={{ fontFamily: fonts.sansB, fontSize: 12, color: tokens.accent }}>
              privacy@tanren.fr
            </Text>
          </TouchableOpacity>
          <Text style={{ fontFamily: fonts.sans, fontSize: 10, color: tokens.textMute, marginTop: 8 }}>
            {t('privacyPage.lastUpdated')}
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}
