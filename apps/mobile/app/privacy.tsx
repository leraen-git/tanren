import React from 'react'
import { View, Text, ScrollView, TouchableOpacity, Linking } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { useTranslation } from 'react-i18next'
import { useTheme } from '@/theme/ThemeContext'

function Section({ icon, title, children }: { icon: string; title: string; children: React.ReactNode }) {
  const { colors, typography, spacing, radius } = useTheme()
  return (
    <View style={{ backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.base, gap: spacing.sm }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
        <Text style={{ fontSize: 20 }}>{icon}</Text>
        <Text style={{ fontFamily: typography.family.bold, fontSize: typography.size.body, color: colors.textPrimary, flex: 1 }}>
          {title}
        </Text>
      </View>
      {children}
    </View>
  )
}

function Bullet({ text }: { text: string }) {
  const { colors, typography } = useTheme()
  return (
    <View style={{ flexDirection: 'row', gap: 8 }}>
      <Text style={{ fontFamily: typography.family.regular, fontSize: typography.size.base, color: colors.primary, marginTop: 1 }}>•</Text>
      <Text style={{ fontFamily: typography.family.regular, fontSize: typography.size.base, color: colors.textMuted, flex: 1, lineHeight: 20 }}>
        {text}
      </Text>
    </View>
  )
}

function Body({ text }: { text: string }) {
  const { colors, typography } = useTheme()
  return (
    <Text style={{ fontFamily: typography.family.regular, fontSize: typography.size.base, color: colors.textMuted, lineHeight: 22 }}>
      {text}
    </Text>
  )
}

export default function PrivacyScreen() {
  const { colors, typography, spacing } = useTheme()
  const { t, i18n } = useTranslation()
  const isFr = i18n.language === 'fr'

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', padding: spacing.base, gap: spacing.md }}>
        <TouchableOpacity
          onPress={() => router.back()}
          accessibilityLabel={t('common.back')}
          accessibilityRole="button"
        >
          <Text style={{ fontFamily: typography.family.bold, fontSize: typography.size.title, color: colors.primary }}>←</Text>
        </TouchableOpacity>
        <Text style={{ fontFamily: typography.family.extraBold, fontSize: typography.size.xl, color: colors.textPrimary }}>
          {t('profile.dataUsage')}
        </Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: spacing.base, gap: spacing.md, paddingBottom: spacing.xl }}>

        {/* Intro */}
        <View style={{ gap: spacing.xs }}>
          <Text style={{ fontFamily: typography.family.bold, fontSize: typography.size.xl, color: colors.textPrimary }}>
            {isFr ? 'Tes données, ton contrôle.' : 'Your data, your control.'}
          </Text>
          <Text style={{ fontFamily: typography.family.regular, fontSize: typography.size.base, color: colors.textMuted, lineHeight: 22 }}>
            {isFr
              ? 'Tanren collecte uniquement ce dont il a besoin pour fonctionner. Aucune publicité, aucun profilage, aucune revente de données.'
              : 'Tanren only collects what it needs to work. No ads, no profiling, no data selling.'}
          </Text>
        </View>

        {/* What we collect */}
        <Section
          icon="📋"
          title={isFr ? 'Ce que nous collectons' : 'What we collect'}
        >
          <Body text={isFr
            ? 'Trois sources distinctes :'
            : 'Three distinct sources:'
          } />

          <View style={{ gap: 4, paddingTop: 4 }}>
            <Text style={{ fontFamily: typography.family.semiBold, fontSize: typography.size.base, color: colors.textPrimary }}>
              {isFr ? 'Fourni par Apple Sign-In (automatique)' : 'Provided by Apple Sign-In (automatic)'}
            </Text>
            <Bullet text={isFr
              ? 'Adresse e-mail — Apple peut fournir une adresse privée relay (@privaterelay.appleid.com) à ta place'
              : 'Email address — Apple may provide a private relay address (@privaterelay.appleid.com) on your behalf'
            } />
            <Bullet text={isFr
              ? 'Nom et prénom — fourni uniquement lors de la première connexion, jamais lors des suivantes'
              : 'Full name — provided only on first sign-in, never on subsequent ones'
            } />
            <Bullet text={isFr
              ? 'Identifiant Apple opaque (jamais ton Apple ID visible)'
              : 'Opaque Apple user identifier (never your visible Apple ID)'
            } />
          </View>

          <View style={{ gap: 4, paddingTop: 4 }}>
            <Text style={{ fontFamily: typography.family.semiBold, fontSize: typography.size.base, color: colors.textPrimary }}>
              {isFr ? 'Fourni par Google Sign-In (automatique)' : 'Provided by Google Sign-In (automatic)'}
            </Text>
            <Bullet text={isFr
              ? 'Adresse e-mail vérifiée (toujours ton adresse Google réelle)'
              : 'Verified email address (always your real Google address)'
            } />
            <Bullet text={isFr
              ? 'Nom complet — fourni à chaque connexion'
              : 'Full name — provided on every sign-in'
            } />
            <Bullet text={isFr
              ? 'Photo de profil Google — mise à jour à chaque connexion'
              : 'Google profile photo — refreshed on every sign-in'
            } />
            <Bullet text={isFr
              ? 'Identifiant Google opaque (jamais ton adresse e-mail utilisée comme clé)'
              : 'Opaque Google user identifier (your email is never used as a key)'
            } />
          </View>

          <View style={{ gap: 4, paddingTop: 4 }}>
            <Text style={{ fontFamily: typography.family.semiBold, fontSize: typography.size.base, color: colors.textPrimary }}>
              {isFr ? 'Saisi par toi lors de l\'inscription' : 'Entered by you during sign-up'}
            </Text>
            <Bullet text={isFr ? 'Genre' : 'Gender'} />
            <Bullet text={isFr ? 'Niveau d\'expérience et objectif fitness' : 'Experience level and fitness goal'} />
            <Bullet text={isFr ? 'Taille et poids (facultatif)' : 'Height and weight (optional)'} />
            <Bullet text={isFr ? 'Nombre de séances par semaine souhaitées' : 'Desired weekly training sessions'} />
          </View>

          <View style={{ gap: 4, paddingTop: 4 }}>
            <Text style={{ fontFamily: typography.family.semiBold, fontSize: typography.size.base, color: colors.textPrimary }}>
              {isFr ? 'Généré par ton utilisation de l\'app' : 'Generated by your use of the app'}
            </Text>
            <Bullet text={isFr ? 'Séances d\'entraînement, exercices, séries, répétitions et charges' : 'Training sessions, exercises, sets, reps and weights'} />
            <Bullet text={isFr ? 'Profil alimentaire et plans de repas générés par l\'IA' : 'Diet profile and AI-generated meal plans'} />
            <Bullet text={isFr ? 'Records personnels et historique de progression' : 'Personal records and progression history'} />
            <Bullet text={isFr ? 'Préférences de rappels (activées par toi)' : 'Reminder preferences (enabled by you)'} />
          </View>
        </Section>

        {/* Where it's stored */}
        <Section
          icon="🗄️"
          title={isFr ? 'Où sont stockées tes données' : 'Where your data is stored'}
        >
          <Body text={isFr
            ? 'Tes données sont hébergées sur une base de données PostgreSQL sécurisée. Elles ne sont jamais partagées, vendues ou transmises à des tiers, sauf exceptions listées ci-dessous.'
            : 'Your data is hosted on a secure PostgreSQL database. It is never shared, sold or transferred to third parties, except as listed below.'
          } />
          <Bullet text={isFr ? 'Sur l\'appareil : préférences de rappels (stockage local AsyncStorage)' : 'On device: reminder preferences (local AsyncStorage)'} />
          <Bullet text={isFr ? 'Serveur : toutes les autres données (authentification, séances, plans)' : 'Server: all other data (authentication, sessions, plans)'} />
        </Section>

        {/* Third parties */}
        <Section
          icon="🤝"
          title={isFr ? 'Tiers impliqués' : 'Third parties involved'}
        >
          <Body text={isFr
            ? 'Seuls trois services tiers accèdent à des données dans le cadre du fonctionnement normal de l\'app :'
            : 'Only three third-party services access data as part of normal app operation:'
          } />

          <View style={{ gap: 4, paddingTop: 4 }}>
            <Text style={{ fontFamily: typography.family.semiBold, fontSize: typography.size.base, color: colors.textPrimary }}>
              Apple Sign-In {isFr ? '(authentification)' : '(authentication)'}
            </Text>
            <Body text={isFr
              ? 'Utilisé pour t\'identifier de façon sécurisée. Apple nous transmet un identifiant opaque, ton e-mail (ou une adresse relay privée) et ton nom uniquement lors de la première connexion. Nous ne stockons jamais de mot de passe. Apple ne reçoit aucune donnée de ta progression.'
              : 'Used to identify you securely. Apple sends us an opaque user ID, your email (or a private relay address) and your name only on first sign-in. We never store a password. Apple does not receive any of your training data.'
            } />
          </View>

          <View style={{ gap: 4, paddingTop: 4 }}>
            <Text style={{ fontFamily: typography.family.semiBold, fontSize: typography.size.base, color: colors.textPrimary }}>
              Google Sign-In {isFr ? '(authentification)' : '(authentication)'}
            </Text>
            <Body text={isFr
              ? 'Utilisé comme alternative de connexion. Google nous transmet ton adresse e-mail vérifiée, ton nom et ta photo de profil à chaque connexion. Nous ne stockons jamais de mot de passe. Google ne reçoit aucune donnée de ta progression ou de ton alimentation.'
              : 'Used as an alternative sign-in method. Google sends us your verified email, name and profile photo on every sign-in. We never store a password. Google does not receive any of your training or diet data.'
            } />
          </View>

          <View style={{ gap: 4, paddingTop: 4 }}>
            <Text style={{ fontFamily: typography.family.semiBold, fontSize: typography.size.base, color: colors.textPrimary }}>
              Anthropic / Claude (IA)
            </Text>
            <Body text={isFr
              ? 'Utilisé uniquement pour générer des plans alimentaires et de workout. Les requêtes contiennent tes préférences alimentaires, niveau et objectifs — jamais ton nom, e-mail ou données identifiantes. Anthropic ne stocke pas ces requêtes au-delà du traitement immédiat.'
              : 'Used only to generate diet and workout plans. Requests contain your food preferences, level and goals — never your name, email or identifying data. Anthropic does not retain these requests beyond immediate processing.'
            } />
          </View>
        </Section>

        {/* AI & your data */}
        <Section
          icon="🤖"
          title={isFr ? 'L\'IA et tes données' : 'AI and your data'}
        >
          <Body text={isFr
            ? 'Quand tu génères un plan alimentaire ou un programme, Tanren envoie un prompt à l\'API Claude (Anthropic). Ce prompt inclut tes préférences (aliments, style de cuisine, niveau d\'activité, objectif) mais aucune donnée personnellement identifiable.'
            : 'When you generate a diet plan or workout program, Tanren sends a prompt to the Claude API (Anthropic). This prompt includes your preferences (foods, cooking style, activity level, goal) but no personally identifiable data.'
          } />
          <Body text={isFr
            ? 'La réponse générée (ton plan) est stockée dans notre base de données liée à ton compte. Elle n\'est pas réutilisée pour entraîner des modèles d\'IA.'
            : 'The generated response (your plan) is stored in our database linked to your account. It is not reused to train AI models.'
          } />
        </Section>

        {/* Notifications */}
        <Section
          icon="🔔"
          title={isFr ? 'Notifications locales' : 'Local notifications'}
        >
          <Body text={isFr
            ? 'Les rappels (entraînement, repas, hydratation) sont des notifications locales planifiées directement sur ton appareil par iOS/Android. Aucune donnée n\'est envoyée à un serveur pour les déclencher.'
            : 'Reminders (workout, meal, hydration) are local notifications scheduled directly on your device by iOS/Android. No data is sent to a server to trigger them.'
          } />
        </Section>

        {/* Your rights */}
        <Section
          icon="⚖️"
          title={isFr ? 'Tes droits' : 'Your rights'}
        >
          <Bullet text={isFr ? 'Consulter toutes tes données via les écrans de l\'app' : 'View all your data via the app screens'} />
          <Bullet text={isFr ? 'Modifier tes données à tout moment (profil, séances, plans)' : 'Edit your data at any time (profile, sessions, plans)'} />
          <Bullet text={isFr ? 'Supprimer ton compte et toutes tes données définitivement depuis le profil' : 'Delete your account and all data permanently from the profile screen'} />
          <Bullet text={isFr ? 'Désactiver les rappels à tout moment sans perdre tes données' : 'Disable reminders at any time without losing your data'} />
        </Section>

        {/* Data retention */}
        <Section
          icon="🕐"
          title={isFr ? 'Conservation des données' : 'Data retention'}
        >
          <Body text={isFr
            ? 'Tes données sont conservées tant que ton compte est actif. La suppression du compte entraîne la suppression irréversible de toutes tes données dans les 30 jours.'
            : 'Your data is retained as long as your account is active. Deleting your account results in permanent deletion of all your data within 30 days.'
          } />
        </Section>

        {/* Contact */}
        <View style={{ alignItems: 'center', paddingTop: spacing.sm, gap: spacing.xs }}>
          <Text style={{ fontFamily: typography.family.regular, fontSize: typography.size.base, color: colors.textMuted, textAlign: 'center' }}>
            {isFr ? 'Des questions ? Contact :' : 'Questions? Contact:'}
          </Text>
          <TouchableOpacity
            onPress={() => Linking.openURL('mailto:privacy@tanren.app')}
            accessibilityRole="link"
          >
            <Text style={{ fontFamily: typography.family.semiBold, fontSize: typography.size.base, color: colors.primary }}>
              privacy@tanren.app
            </Text>
          </TouchableOpacity>
          <Text style={{ fontFamily: typography.family.regular, fontSize: typography.size.xs, color: colors.textMuted, marginTop: spacing.sm }}>
            {isFr ? 'Dernière mise à jour : avril 2026' : 'Last updated: April 2026'}
          </Text>
        </View>

      </ScrollView>
    </SafeAreaView>
  )
}
