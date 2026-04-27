import { useEffect, useRef } from 'react'
import { View, Text, Pressable, Animated, Easing, StyleSheet, useColorScheme } from 'react-native'
import { StatusBar } from 'expo-status-bar'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router, useNavigation } from 'expo-router'
import { useIntroSeen } from '../src/hooks/useIntroSeen'

const TOKENS = {
  dark: {
    bg: '#000000',
    text: '#FFFFFF',
    textDim: 'rgba(255,255,255,0.95)',
    textMute: 'rgba(255,255,255,0.55)',
    textGhost: 'rgba(255,255,255,0.5)',
    accent: '#FF2D3F',
    glyphOpacity: 0.10,
  },
  light: {
    bg: '#FFFFFF',
    text: '#000000',
    textDim: 'rgba(0,0,0,0.85)',
    textMute: 'rgba(0,0,0,0.55)',
    textGhost: 'rgba(0,0,0,0.5)',
    accent: '#E8192C',
    glyphOpacity: 0.10,
  },
}

export default function IntroScreen() {
  const scheme = useColorScheme()
  const t = scheme === 'light' ? TOKENS.light : TOKENS.dark
  const navigation = useNavigation()
  const { markSeen } = useIntroSeen()

  const kanjiOpacity = useRef(new Animated.Value(0)).current
  const romajiOpacity = useRef(new Animated.Value(0)).current
  const quoteOpacity = useRef(new Animated.Value(0)).current
  const ctaOpacity = useRef(new Animated.Value(0)).current

  useEffect(() => {
    Animated.sequence([
      Animated.timing(kanjiOpacity, { toValue: 1, duration: 600, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.timing(romajiOpacity, { toValue: 1, duration: 400, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.timing(quoteOpacity, { toValue: 1, duration: 500, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.timing(ctaOpacity, { toValue: 1, duration: 400, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
    ]).start()
  }, [])

  const finish = () => {
    markSeen()
    if (navigation.canGoBack()) {
      router.back()
    } else {
      router.replace('/onboarding/step0')
    }
  }

  return (
    <View style={[styles.root, { backgroundColor: t.bg }]}>
      <StatusBar style={scheme === 'light' ? 'dark' : 'light'} />

      {/* Background glyph — both kanji horizontal, partially cropped right */}
      <Text
        style={[styles.glyphBg, { color: t.accent, opacity: t.glyphOpacity }]}
        numberOfLines={1}
        pointerEvents="none"
      >
        鍛 錬
      </Text>

      <SafeAreaView style={styles.screen}>
        {/* Skip */}
        <Pressable
          onPress={finish}
          hitSlop={12}
          style={styles.skipBtn}
          accessibilityRole="button"
          accessibilityLabel="Passer l'introduction"
        >
          <Text style={[styles.skipText, { color: t.textGhost }]}>PASSER</Text>
        </Pressable>

        {/* Kanji */}
        <Animated.Text
          style={[styles.kanjiPair, { color: t.accent, opacity: kanjiOpacity }]}
          accessibilityLabel="Tanren, écrit en kanji japonais"
        >
          鍛 錬
        </Animated.Text>

        {/* Romaji */}
        <Animated.Text style={[styles.romaji, { color: t.textMute, opacity: romajiOpacity }]}>
          tan · ren
        </Animated.Text>

        {/* Divider */}
        <Animated.View style={[styles.divider, { backgroundColor: t.accent, opacity: romajiOpacity }]} />

        {/* Quote */}
        <Animated.Text style={[styles.quote, { color: t.textDim, opacity: quoteOpacity }]}>
          L'acier ne devient lame qu'après{' '}
          <Text style={{ color: t.accent, fontStyle: 'italic' }}>
            mille coups de marteau
          </Text>
          .
        </Animated.Text>

        {/* Attribution */}
        <Animated.Text style={[styles.attribution, { color: t.textGhost, opacity: quoteOpacity }]}>
          {'— proverbe forgeron\njaponais'}
        </Animated.Text>

        {/* CTA */}
        <Animated.View style={[styles.ctaWrapper, { opacity: ctaOpacity }]}>
          <Pressable
            onPress={finish}
            accessibilityRole="button"
            accessibilityLabel="Commencer Tanren"
            style={({ pressed }) => [
              styles.ctaBtn,
              { backgroundColor: t.accent, opacity: pressed ? 0.85 : 1 },
            ]}
          >
            <Text style={styles.ctaText}>Commencer</Text>
          </Pressable>
        </Animated.View>
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
    paddingHorizontal: 32,
    paddingBottom: 16,
  },
  glyphBg: {
    position: 'absolute',
    right: -120,
    bottom: 60,
    fontFamily: 'NotoSerifJP_900Black_subset',
    fontWeight: '900',
    fontSize: 280,
    lineHeight: 280 * 0.85,
    letterSpacing: 280 * 0.05,
  },
  skipBtn: {
    alignSelf: 'flex-end',
    paddingVertical: 8,
    paddingHorizontal: 4,
    zIndex: 10,
  },
  skipText: {
    fontFamily: 'BarlowCondensed_400Regular',
    fontWeight: '400',
    fontSize: 12,
    letterSpacing: 12 * 0.32,
    textTransform: 'uppercase',
  },
  kanjiPair: {
    fontFamily: 'NotoSerifJP_900Black_subset',
    fontWeight: '900',
    fontSize: 130,
    lineHeight: 130,
    letterSpacing: 130 * 0.06,
    textAlign: 'center',
    marginTop: 20,
    marginBottom: 22,
  },
  romaji: {
    fontFamily: 'BarlowCondensed_400Regular',
    fontWeight: '400',
    fontSize: 14,
    letterSpacing: 14 * 0.5,
    textAlign: 'center',
    textTransform: 'uppercase',
    marginBottom: 38,
    paddingLeft: 7,
  },
  divider: {
    width: 36,
    height: 1.5,
    alignSelf: 'center',
    marginBottom: 38,
  },
  quote: {
    fontFamily: 'BarlowCondensed_300Light',
    fontStyle: 'italic',
    fontWeight: '300',
    fontSize: 26,
    lineHeight: 26 * 1.45,
    textAlign: 'center',
    paddingHorizontal: 4,
    marginBottom: 26,
  },
  attribution: {
    fontFamily: 'BarlowCondensed_400Regular',
    fontWeight: '400',
    fontSize: 12,
    letterSpacing: 12 * 0.32,
    textAlign: 'center',
    textTransform: 'uppercase',
    lineHeight: 12 * 1.6,
  },
  ctaWrapper: {
    marginTop: 'auto',
  },
  ctaBtn: {
    paddingVertical: 18,
    borderRadius: 6,
    alignItems: 'center',
  },
  ctaText: {
    fontFamily: 'BarlowCondensed_700Bold',
    fontWeight: '700',
    fontSize: 13,
    letterSpacing: 13 * 0.28,
    textTransform: 'uppercase',
    color: '#FFFFFF',
  },
})
