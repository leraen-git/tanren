import React, { useEffect } from 'react'
import { View, Text, StyleSheet } from 'react-native'
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  withRepeat,
  withSequence,
  Easing,
  runOnJS,
} from 'react-native-reanimated'

const RED = '#E8192C'
const BG = '#0A0A0A'
const WHITE = '#F0F0F0'
const MUTED = '#2a2a2a'

interface Props {
  onFinish: () => void
}

export function SplashScreen({ onFinish }: Props) {
  const containerOpacity = useSharedValue(1)
  const logoOpacity = useSharedValue(0)
  const logoScale = useSharedValue(0.7)
  const wordOpacity = useSharedValue(0)
  const wordY = useSharedValue(12)
  const tagOpacity = useSharedValue(0)
  const glowScale = useSharedValue(1)
  const glowOpacity = useSharedValue(1)
  const lineTopOpacity = useSharedValue(0)
  const lineBottomOpacity = useSharedValue(0)
  const loaderOpacity = useSharedValue(0)
  const loaderWidth = useSharedValue(0)

  useEffect(() => {
    const ease = Easing.out(Easing.exp)

    lineTopOpacity.value = withDelay(400, withTiming(1, { duration: 600 }))
    lineBottomOpacity.value = withDelay(600, withTiming(1, { duration: 600 }))

    glowScale.value = withRepeat(
      withSequence(
        withTiming(1.1, { duration: 1400, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 1400, easing: Easing.inOut(Easing.ease) }),
      ), -1, false,
    )
    glowOpacity.value = withRepeat(
      withSequence(withTiming(0.7, { duration: 1400 }), withTiming(1, { duration: 1400 })),
      -1, false,
    )

    logoOpacity.value = withDelay(200, withTiming(1, { duration: 600, easing: ease }))
    logoScale.value = withDelay(200, withTiming(1, { duration: 600, easing: ease }))
    wordOpacity.value = withDelay(500, withTiming(1, { duration: 600, easing: ease }))
    wordY.value = withDelay(500, withTiming(0, { duration: 600, easing: ease }))
    tagOpacity.value = withDelay(800, withTiming(1, { duration: 500 }))
    loaderOpacity.value = withDelay(900, withTiming(1, { duration: 400 }))
    loaderWidth.value = withDelay(1000, withTiming(1, {
      duration: 1600,
      easing: Easing.bezier(0.4, 0, 0.2, 1),
    }))

    containerOpacity.value = withDelay(3000, withTiming(0, { duration: 400 }, (done) => {
      if (done) runOnJS(onFinish)()
    }))
  }, [])

  const containerStyle = useAnimatedStyle(() => ({ opacity: containerOpacity.value }))
  const logoStyle = useAnimatedStyle(() => ({ opacity: logoOpacity.value, transform: [{ scale: logoScale.value }] }))
  const wordStyle = useAnimatedStyle(() => ({ opacity: wordOpacity.value, transform: [{ translateY: wordY.value }] }))
  const tagStyle = useAnimatedStyle(() => ({ opacity: tagOpacity.value }))
  const glowStyle = useAnimatedStyle(() => ({ transform: [{ scale: glowScale.value }], opacity: glowOpacity.value }))
  const lineTopStyle = useAnimatedStyle(() => ({ opacity: lineTopOpacity.value }))
  const lineBottomStyle = useAnimatedStyle(() => ({ opacity: lineBottomOpacity.value }))
  const loaderWrapStyle = useAnimatedStyle(() => ({ opacity: loaderOpacity.value }))
  const loaderBarStyle = useAnimatedStyle(() => ({ width: `${loaderWidth.value * 100}%` as any }))

  return (
    <Animated.View style={[styles.root, containerStyle]}>
      {/* Glow */}
      <Animated.View style={[styles.glow, glowStyle]} />

      {/* Lines */}
      <Animated.View style={[styles.lineTop, lineTopStyle]} />
      <Animated.View style={[styles.lineBottom, lineBottomStyle]} />

      {/* Corners */}
      <View style={[styles.corner, styles.cornerTL]} />
      <View style={[styles.corner, styles.cornerTR]} />
      <View style={[styles.corner, styles.cornerBL]} />
      <View style={[styles.corner, styles.cornerBR]} />

      {/* Center content */}
      <View style={styles.center}>
        {/* Logo */}
        <Animated.View style={[styles.logoBox, logoStyle]}>
          <View style={styles.plate} />
          <View style={styles.bar} />
          <View style={styles.plate} />
        </Animated.View>

        {/* Wordmark */}
        <Animated.Text style={[styles.wordmark, wordStyle]}>
          {'TAN'}<Text style={{ color: RED }}>{'REN'}</Text>
        </Animated.Text>

        {/* Tagline */}
        <Animated.Text style={[styles.tagline, tagStyle]}>
          Forge your body. Own your progress.
        </Animated.Text>
      </View>

      {/* Loader */}
      <Animated.View style={[styles.loaderWrap, loaderWrapStyle]}>
        <View style={styles.loaderTrack}>
          <Animated.View style={[styles.loaderBar, loaderBarStyle]} />
        </View>
      </Animated.View>

      {/* Bottom label */}
      <View style={styles.brandWrap}>
        <Text style={styles.brandText}>tanren.app</Text>
      </View>
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: BG,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
    elevation: 9999,
  },
  glow: {
    position: 'absolute',
    bottom: '8%',
    alignSelf: 'center',
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: 'rgba(232,25,44,0.18)',
  },
  lineTop: {
    position: 'absolute',
    top: '18%',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: 'rgba(232,25,44,0.3)',
  },
  lineBottom: {
    position: 'absolute',
    bottom: '22%',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  corner: {
    position: 'absolute',
    width: 18,
    height: 18,
    borderColor: MUTED,
  },
  cornerTL: { top: '10%', left: '8%', borderTopWidth: 1, borderLeftWidth: 1 },
  cornerTR: { top: '10%', right: '8%', borderTopWidth: 1, borderRightWidth: 1 },
  cornerBL: { bottom: '10%', left: '8%', borderBottomWidth: 1, borderLeftWidth: 1 },
  cornerBR: { bottom: '10%', right: '8%', borderBottomWidth: 1, borderRightWidth: 1 },
  center: {
    alignItems: 'center',
    zIndex: 2,
  },
  logoBox: {
    width: 72,
    height: 72,
    borderRadius: 18,
    backgroundColor: RED,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
  },
  plate: {
    width: 10,
    height: 28,
    borderRadius: 5,
    backgroundColor: 'rgba(255,255,255,0.9)',
  },
  bar: {
    width: 18,
    height: 8,
    borderRadius: 4,
    backgroundColor: WHITE,
  },
  wordmark: {
    fontFamily: 'BarlowCondensed_700Bold',
    fontSize: 64,
    color: WHITE,
    letterSpacing: 4,
    marginTop: 20,
    lineHeight: 68,
    textTransform: 'uppercase',
  },
  tagline: {
    fontFamily: 'BarlowCondensed_300Light',
    fontSize: 11,
    color: '#555',
    letterSpacing: 4,
    textTransform: 'uppercase',
    marginTop: 12,
  },
  loaderWrap: {
    position: 'absolute',
    bottom: '13%',
    width: 80,
  },
  loaderTrack: {
    height: 2,
    backgroundColor: '#1a1a1a',
    borderRadius: 1,
    overflow: 'hidden',
  },
  loaderBar: {
    height: '100%',
    backgroundColor: RED,
    borderRadius: 1,
  },
  brandWrap: {
    position: 'absolute',
    bottom: '7%',
  },
  brandText: {
    fontFamily: 'BarlowCondensed_300Light',
    fontSize: 10,
    letterSpacing: 3,
    textTransform: 'uppercase',
    color: MUTED,
  },
})
