import React from 'react'
import { View, Text, ScrollView, TouchableOpacity, Linking } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { useTranslation } from 'react-i18next'
import { useTheme } from '@/theme/ThemeContext'

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  const { tokens, fonts } = useTheme()
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
  const { tokens, fonts } = useTheme()
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
  const { tokens, fonts } = useTheme()
  return (
    <Text style={{ fontFamily: fonts.sans, fontSize: 12, color: tokens.textMute, lineHeight: 18 }}>
      {text}
    </Text>
  )
}

export default function PrivacyScreen() {
  const { tokens, fonts } = useTheme()
  const { t, i18n } = useTranslation()
  const isFr = i18n.language === 'fr'

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: tokens.bg }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12 }}>
        <TouchableOpacity
          onPress={() => router.back()}
          accessibilityLabel={t('common.back')}
          accessibilityRole="button"
        >
          <Text style={{ fontFamily: fonts.sansB, fontSize: 10, color: tokens.accent, textTransform: 'uppercase', letterSpacing: 2 }}>
            {'< BACK'}
          </Text>
        </TouchableOpacity>
        <Text style={{ fontFamily: fonts.sansX, fontSize: 20, color: tokens.text, textTransform: 'uppercase' }}>
          {t('profile.dataUsage')}
        </Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 40 }}>
        <View style={{ gap: 6 }}>
          <Text style={{ fontFamily: fonts.sansX, fontSize: 20, color: tokens.text, textTransform: 'uppercase' }}>
            {isFr ? 'Tes données, ton contrôle.' : 'Your data, your control.'}
          </Text>
          <Text style={{ fontFamily: fonts.sans, fontSize: 13, color: tokens.textMute, lineHeight: 20 }}>
            {isFr
              ? 'Tanren collecte uniquement ce dont il a besoin pour fonctionner. Aucune publicité, aucun profilage, aucune revente de données.'
              : 'Tanren only collects what it needs to work. No ads, no profiling, no data selling.'}
          </Text>
        </View>

        <Section title={isFr ? 'Ce que nous collectons' : 'What we collect'}>
          <Body text={isFr ? 'Trois sources distinctes :' : 'Three distinct sources:'} />

          <View style={{ gap: 4, paddingTop: 4 }}>
            <Text style={{ fontFamily: fonts.sansB, fontSize: 11, color: tokens.text, textTransform: 'uppercase' }}>
              {isFr ? 'Fourni par Apple Sign-In (automatique)' : 'Provided by Apple Sign-In (automatic)'}
            </Text>
            <Bullet text={isFr ? 'Adresse e-mail — Apple peut fournir une adresse privée relay (@privaterelay.appleid.com) à ta place' : 'Email address — Apple may provide a private relay address (@privaterelay.appleid.com) on your behalf'} />
            <Bullet text={isFr ? 'Nom et prénom — fourni uniquement lors de la première connexion' : 'Full name — provided only on first sign-in'} />
            <Bullet text={isFr ? 'Identifiant Apple opaque (jamais ton Apple ID visible)' : 'Opaque Apple user identifier (never your visible Apple ID)'} />
          </View>

          <View style={{ gap: 4, paddingTop: 4 }}>
            <Text style={{ fontFamily: fonts.sansB, fontSize: 11, color: tokens.text, textTransform: 'uppercase' }}>
              {isFr ? 'Fourni par Google Sign-In (automatique)' : 'Provided by Google Sign-In (automatic)'}
            </Text>
            <Bullet text={isFr ? 'Adresse e-mail vérifiée (toujours ton adresse Google réelle)' : 'Verified email address (always your real Google address)'} />
            <Bullet text={isFr ? 'Nom complet — fourni à chaque connexion' : 'Full name — provided on every sign-in'} />
            <Bullet text={isFr ? 'Photo de profil Google' : 'Google profile photo'} />
            <Bullet text={isFr ? 'Identifiant Google opaque' : 'Opaque Google user identifier'} />
          </View>

          <View style={{ gap: 4, paddingTop: 4 }}>
            <Text style={{ fontFamily: fonts.sansB, fontSize: 11, color: tokens.text, textTransform: 'uppercase' }}>
              {isFr ? 'Saisi par toi lors de l\'inscription' : 'Entered by you during sign-up'}
            </Text>
            <Bullet text={isFr ? 'Genre' : 'Gender'} />
            <Bullet text={isFr ? 'Niveau d\'expérience et objectif fitness' : 'Experience level and fitness goal'} />
            <Bullet text={isFr ? 'Taille et poids (facultatif)' : 'Height and weight (optional)'} />
            <Bullet text={isFr ? 'Nombre de séances par semaine souhaitées' : 'Desired weekly training sessions'} />
          </View>

          <View style={{ gap: 4, paddingTop: 4 }}>
            <Text style={{ fontFamily: fonts.sansB, fontSize: 11, color: tokens.text, textTransform: 'uppercase' }}>
              {isFr ? 'Généré par ton utilisation de l\'app' : 'Generated by your use of the app'}
            </Text>
            <Bullet text={isFr ? 'Séances d\'entraînement, exercices, séries, répétitions et charges' : 'Training sessions, exercises, sets, reps and weights'} />
            <Bullet text={isFr ? 'Profil alimentaire et plans de repas générés par l\'IA' : 'Diet profile and AI-generated meal plans'} />
            <Bullet text={isFr ? 'Records personnels et historique de progression' : 'Personal records and progression history'} />
            <Bullet text={isFr ? 'Préférences de rappels (activées par toi)' : 'Reminder preferences (enabled by you)'} />
          </View>
        </Section>

        <Section title={isFr ? 'Où sont stockées tes données' : 'Where your data is stored'}>
          <Body text={isFr
            ? 'Tes données sont hébergées sur une base de données sécurisée. Tes informations personnelles (nom, e-mail) sont chiffrées au repos.'
            : 'Your data is hosted on a secure database. Your personal information (name, email) is encrypted at rest.'
          } />
          <Bullet text={isFr ? 'Sur l\'appareil : préférences de rappels et catalogue d\'exercices' : 'On device: reminder preferences and exercise catalog'} />
          <Bullet text={isFr ? 'Serveur : toutes les autres données' : 'Server: all other data'} />
          <Bullet text={isFr ? 'Les sessions expirent automatiquement' : 'Login sessions expire automatically'} />
        </Section>

        <Section title={isFr ? 'Tiers impliqués' : 'Third parties involved'}>
          <Body text={isFr
            ? 'Seuls quatre services tiers accèdent à des données :'
            : 'Only four third-party services access data:'
          } />
          {[
            { name: 'Apple Sign-In', desc: isFr ? 'Authentification sécurisée. Apple ne reçoit aucune donnée de ta progression.' : 'Secure authentication. Apple does not receive any of your training data.' },
            { name: 'Google Sign-In', desc: isFr ? 'Alternative de connexion. Google ne reçoit aucune donnée de ta progression.' : 'Alternative sign-in. Google does not receive any of your training data.' },
            { name: 'Anthropic / Claude', desc: isFr ? 'Génération de plans. Jamais ton nom ou e-mail.' : 'Plan generation. Never your name or email.' },
            { name: 'Resend', desc: isFr ? 'Envoi de codes OTP. Seul ton e-mail est transmis.' : 'OTP code delivery. Only your email is transmitted.' },
          ].map((tp) => (
            <View key={tp.name} style={{ gap: 2, paddingTop: 4 }}>
              <Text style={{ fontFamily: fonts.sansB, fontSize: 11, color: tokens.text, textTransform: 'uppercase' }}>{tp.name}</Text>
              <Body text={tp.desc} />
            </View>
          ))}
        </Section>

        <Section title={isFr ? 'L\'IA et tes données' : 'AI and your data'}>
          <Body text={isFr
            ? 'Les prompts incluent tes préférences mais aucune donnée personnellement identifiable. La réponse n\'est pas réutilisée pour entraîner des modèles.'
            : 'Prompts include your preferences but no personally identifiable data. Responses are not reused to train models.'
          } />
        </Section>

        <Section title={isFr ? 'Tes droits' : 'Your rights'}>
          <Bullet text={isFr ? 'Consulter toutes tes données via l\'app' : 'View all your data via the app'} />
          <Bullet text={isFr ? 'Modifier tes données à tout moment' : 'Edit your data at any time'} />
          <Bullet text={isFr ? 'Supprimer ton compte définitivement depuis le profil' : 'Delete your account permanently from profile'} />
        </Section>

        <View style={{ alignItems: 'center', paddingTop: 8, gap: 4 }}>
          <Text style={{ fontFamily: fonts.sans, fontSize: 12, color: tokens.textMute, textAlign: 'center' }}>
            {isFr ? 'Des questions ? Contact :' : 'Questions? Contact:'}
          </Text>
          <TouchableOpacity
            onPress={() => Linking.openURL('mailto:privacy@tanren.app')}
            accessibilityRole="link"
            accessibilityLabel="Email privacy@tanren.app"
          >
            <Text style={{ fontFamily: fonts.sansB, fontSize: 12, color: tokens.accent }}>
              privacy@tanren.app
            </Text>
          </TouchableOpacity>
          <Text style={{ fontFamily: fonts.sans, fontSize: 10, color: tokens.textMute, marginTop: 8 }}>
            {isFr ? 'Dernière mise à jour : avril 2026' : 'Last updated: April 2026'}
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}
