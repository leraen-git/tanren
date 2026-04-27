import { useState } from 'react'
import { View, Text, Pressable, StyleSheet } from 'react-native'
import { StatusBar } from 'expo-status-bar'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router, useNavigation } from 'expo-router'
import { useTheme } from '@/theme/ThemeContext'

const PAGES = [
  {
    eyebrow: "L'origine",
    heading: [
      { text: 'Tanren,\n', accent: false },
      { text: 'deux kanji', accent: true },
      { text: '\npour un mot', accent: false },
    ],
    body: [
      {
        segments: [
          { text: 'Tanren (鍛錬)', bold: true },
          { text: ' est un mot japonais qui désigne la pratique de la forge.', bold: false },
        ],
      },
      {
        segments: [
          { text: 'Au Japon ancien, c\'est ainsi qu\'on travaillait l\'acier des sabres : par ', bold: false },
          { text: 'la chauffe et la frappe répétées', bold: true },
          { text: ', jour après jour, pendant des années.', bold: false },
        ],
      },
    ],
    infoBlock: {
      type: 'etymology' as const,
      label: 'Étymologie',
    },
  },
  {
    eyebrow: 'La philosophie',
    heading: [
      { text: 'Le corps\ncomme\nune ', accent: false },
      { text: 'lame', accent: true },
    ],
    body: [
      {
        segments: [
          { text: 'Les arts martiaux japonais ont étendu le mot au-delà du métal.', bold: false },
        ],
      },
      {
        segments: [
          { text: 'Tanren', bold: true },
          { text: ', c\'est la discipline qui transforme un corps ordinaire en outil précis. Par la répétition. Par la patience. Par ', bold: false },
          { text: 'l\'effort soutenu sur le long terme', bold: true },
          { text: '.', bold: false },
        ],
      },
    ],
    infoBlock: {
      type: 'tradition' as const,
      label: 'Dans la tradition',
      text: '"Forger le corps avec la même rigueur que l\'acier."',
    },
  },
  {
    eyebrow: "L'application",
    heading: [
      { text: 'Ton corps,\nta ', accent: false },
      { text: 'forge', accent: true },
    ],
    body: [
      {
        segments: [
          { text: 'Tanren n\'est pas une app de fitness. C\'est une ', bold: false },
          { text: 'application de forgeage', bold: true },
          { text: '.', bold: false },
        ],
      },
      {
        segments: [
          { text: 'Chaque séance enregistrée, chaque rep loggée, chaque kilo soulevé est ', bold: false },
          { text: 'un coup de marteau', bold: true },
          { text: '. Le résultat n\'apparaît pas en 10 jours. Il apparaît dans 10 ans.', bold: false },
        ],
      },
    ],
    closingQuestion: 'Tu es prêt à commencer ?',
  },
] as const

export default function MantraScreen() {
  const { isDark, tokens, fonts } = useTheme()
  const navigation = useNavigation()
  const [page, setPage] = useState(0)

  const accent = tokens.accent
  const textDim = isDark ? 'rgba(255,255,255,0.92)' : 'rgba(0,0,0,0.85)'
  const textMute = isDark ? 'rgba(255,255,255,0.55)' : 'rgba(0,0,0,0.55)'
  const textGhost = isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)'
  const stepInactive = isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.12)'
  const btnPrevBorder = isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)'
  const btnPrevText = isDark ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.7)'
  const traditionBg = isDark ? 'rgba(255,45,63,0.05)' : 'rgba(232,25,44,0.04)'
  const traditionBorder = isDark ? 'rgba(255,45,63,0.4)' : 'rgba(232,25,44,0.4)'

  const current = PAGES[page]!
  const isFirst = page === 0
  const isLast = page === PAGES.length - 1

  const finish = () => {
    if (navigation.canGoBack()) {
      router.back()
    } else {
      router.replace('/')
    }
  }

  return (
    <View style={[styles.root, { backgroundColor: tokens.bg }]}>
      <StatusBar style={isDark ? 'light' : 'dark'} />

      {/* Background glyph */}
      <Text
        style={[styles.glyphBg, { color: accent, opacity: 0.08 }]}
        numberOfLines={1}
        pointerEvents="none"
      >
        鍛 錬
      </Text>

      <SafeAreaView style={styles.screen}>
        {/* Stepper */}
        <View style={styles.stepper}>
          {[0, 1, 2].map((i) => (
            <View
              key={i}
              style={[
                styles.stepBar,
                { backgroundColor: i === page ? accent : stepInactive },
              ]}
            />
          ))}
        </View>

        {/* Eyebrow */}
        <View style={styles.eyebrow}>
          <Text style={[styles.kanjiMini, { color: accent }]}>鍛 錬</Text>
          <Text style={{ color: textGhost, fontSize: 11 }}>·</Text>
          <Text style={[styles.eyebrowLabel, { color: accent }]}>
            {current.eyebrow}
          </Text>
        </View>

        {/* Heading */}
        <Text style={[styles.heading, { color: tokens.text }]}>
          {current.heading.map((seg, i) => (
            <Text key={i} style={seg.accent ? { color: accent } : undefined}>
              {seg.text}
            </Text>
          ))}
        </Text>

        {/* Body area */}
        <View style={styles.bodyArea}>
          {current.body.map((para, pi) => (
            <Text key={pi} style={[styles.bodyText, { color: textDim }]}>
              {para.segments.map((seg, si) => (
                <Text
                  key={si}
                  style={seg.bold ? { fontFamily: fonts.sansB, color: tokens.text } : undefined}
                >
                  {seg.text}
                </Text>
              ))}
            </Text>
          ))}

          {/* Info block — screens 1 & 2 */}
          {'infoBlock' in current && current.infoBlock && (
            <View style={[styles.infoBlock, { backgroundColor: traditionBg, borderLeftColor: traditionBorder }]}>
              <Text style={[styles.infoLabel, { color: textMute }]}>
                {current.infoBlock.label}
              </Text>
              {current.infoBlock.type === 'etymology' ? (
                <View>
                  <Text style={[styles.etyLine, { color: textDim }]}>
                    <Text style={[styles.etyKanji, { color: accent }]}>鍛 </Text>
                    (tan) = forger
                  </Text>
                  <Text style={[styles.etyLine, { color: textDim }]}>
                    <Text style={[styles.etyKanji, { color: accent }]}>錬 </Text>
                    (ren) = affiner
                  </Text>
                </View>
              ) : (
                <Text style={[styles.infoText, { color: textDim }]}>
                  {'text' in current.infoBlock ? current.infoBlock.text : ''}
                </Text>
              )}
            </View>
          )}

          {/* Closing question — screen 3 */}
          {'closingQuestion' in current && (
            <Text style={[styles.closingQuestion, { color: accent }]}>
              {current.closingQuestion}
            </Text>
          )}
        </View>

        {/* Nav row */}
        <View style={[styles.navRow, isFirst && styles.navRowFirst]}>
          {!isFirst && (
            <Pressable
              onPress={() => setPage(page - 1)}
              style={({ pressed }) => [
                styles.btnPrev,
                { borderColor: btnPrevBorder, opacity: pressed ? 0.7 : 1 },
              ]}
              accessibilityRole="button"
              accessibilityLabel="Précédent"
            >
              <Text style={[styles.btnPrevText, { color: btnPrevText }]}>‹</Text>
            </Pressable>
          )}
          <Pressable
            onPress={isLast ? finish : () => setPage(page + 1)}
            style={({ pressed }) => [
              styles.btnNext,
              { backgroundColor: accent, opacity: pressed ? 0.85 : 1 },
            ]}
            accessibilityRole="button"
            accessibilityLabel={isLast ? 'Commencer' : 'Suivant'}
          >
            <Text style={styles.btnNextText}>
              {isLast ? 'Commencer' : 'Suivant'}
            </Text>
          </Pressable>
        </View>
      </SafeAreaView>
    </View>
  )
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  screen: {
    flex: 1,
    paddingHorizontal: 26,
    paddingBottom: 24,
    paddingTop: 8,
  },
  glyphBg: {
    position: 'absolute',
    right: -90,
    bottom: 80,
    fontFamily: 'NotoSerifJP_900Black_subset',
    fontWeight: '900',
    fontSize: 250,
    lineHeight: 250 * 0.85,
    letterSpacing: 250 * 0.05,
  },
  stepper: {
    flexDirection: 'row',
    gap: 4,
    marginBottom: 18,
  },
  stepBar: {
    flex: 1,
    height: 2,
  },
  eyebrow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  kanjiMini: {
    fontFamily: 'NotoSerifJP_700Bold_subset',
    fontWeight: '700',
    fontSize: 14,
    letterSpacing: 14 * 0.15,
  },
  eyebrowLabel: {
    fontFamily: 'BarlowCondensed_700Bold',
    fontWeight: '700',
    fontSize: 12,
    letterSpacing: 12 * 0.22,
    textTransform: 'uppercase',
  },
  heading: {
    fontFamily: 'BarlowCondensed_900Black',
    fontWeight: '900',
    fontSize: 44,
    lineHeight: 46,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: 24,
  },
  bodyArea: {
    flex: 1,
    gap: 14,
  },
  bodyText: {
    fontFamily: 'BarlowCondensed_400Regular',
    fontWeight: '400',
    fontSize: 17,
    lineHeight: 26,
  },
  infoBlock: {
    padding: 14,
    paddingHorizontal: 16,
    borderLeftWidth: 2,
    marginTop: 'auto',
  },
  infoLabel: {
    fontFamily: 'BarlowCondensed_700Bold',
    fontWeight: '700',
    fontSize: 10,
    letterSpacing: 10 * 0.28,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  infoText: {
    fontFamily: 'BarlowCondensed_300Light',
    fontStyle: 'italic',
    fontSize: 15,
    lineHeight: 22,
  },
  etyLine: {
    fontFamily: 'JetBrainsMono_400Regular',
    fontSize: 13,
    lineHeight: 22,
  },
  etyKanji: {
    fontFamily: 'NotoSerifJP_700Bold_subset',
    fontWeight: '700',
  },
  closingQuestion: {
    fontFamily: 'BarlowCondensed_300Light',
    fontStyle: 'italic',
    fontSize: 19,
    marginTop: 16,
  },
  navRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
  },
  navRowFirst: {},
  btnPrev: {
    width: 56,
    borderWidth: 1,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnPrevText: {
    fontFamily: 'BarlowCondensed_700Bold',
    fontWeight: '700',
    fontSize: 18,
  },
  btnNext: {
    flex: 1,
    paddingVertical: 18,
    borderRadius: 4,
    alignItems: 'center',
  },
  btnNextText: {
    fontFamily: 'BarlowCondensed_700Bold',
    fontWeight: '700',
    fontSize: 14,
    letterSpacing: 14 * 0.24,
    textTransform: 'uppercase',
    color: '#FFFFFF',
  },
})
