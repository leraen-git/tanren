import React, { useState, useEffect, useRef } from 'react'
import {
  View,
  Text,
  StyleSheet,
  Alert,
  Platform,
  ActivityIndicator,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  ScrollView,
} from 'react-native'
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  withRepeat,
  withSequence,
  Easing,
} from 'react-native-reanimated'
import Svg, { Path, Rect, Circle, Defs, RadialGradient, Stop } from 'react-native-svg'
import { useAuth } from '@/contexts/AuthContext'
import { useTheme } from '@/theme/ThemeContext'
import { useTranslation } from 'react-i18next'
import { useLocalSearchParams } from 'expo-router'
import { KanjiWatermark } from '@/components/KanjiWatermark'
import { ForgeMark } from '@/components/ForgeMark'

type EmailStep = 'idle' | 'emailInput' | 'sending' | 'otpInput' | 'verifying'

function AppleIcon() {
  return (
    <Svg width={18} height={18} viewBox="0 0 384 512" fill="#FFFFFF">
      <Path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5q0 39.3 14.4 81.2c12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.7-90-61.7-91.9zm-56.6-164.2c27.3-32.4 24.8-61.9 24-72.5-24.1 1.4-52 16.4-67.9 34.9-17.5 19.8-27.8 44.3-25.6 71.9 26.1 2 49.9-11.4 69.5-34.3z" />
    </Svg>
  )
}

function GoogleIcon() {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24">
      <Path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
      <Path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <Path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
      <Path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </Svg>
  )
}

function MailIcon({ color }: { color: string }) {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2}>
      <Rect x={3} y={5} width={18} height={14} rx={0} />
      <Path d="m3 7 9 6 9-6" />
    </Svg>
  )
}

export default function SignInScreen() {
  const { tokens, fonts, isDark } = useTheme()
  const { t } = useTranslation()
  const params = useLocalSearchParams<{ upgrade?: string }>()
  const isUpgrade = params.upgrade === '1'

  const {
    signInWithApple, signInWithGoogle, googleAvailable,
    requestOtp, verifyOtp, signInAsGuest,
    devSignIn, status,
  } = useAuth()

  const [socialLoading, setSocialLoading] = useState(false)
  const [emailStep, setEmailStep] = useState<EmailStep>('idle')
  const [emailValue, setEmailValue] = useState('')
  const [otpCode, setOtpCode] = useState('')
  const [otpError, setOtpError] = useState('')
  const [resendCountdown, setResendCountdown] = useState(0)
  const otpInputRef = useRef<TextInput>(null)

  const logoOpacity = useSharedValue(0)
  const logoY = useSharedValue(8)
  const ctaOpacity = useSharedValue(0)
  const ctaY = useSharedValue(8)
  const glowScale = useSharedValue(1)
  const glowOpacity = useSharedValue(0.6)

  useEffect(() => {
    const ease = Easing.out(Easing.exp)
    logoOpacity.value = withTiming(1, { duration: 400, easing: ease })
    logoY.value = withTiming(0, { duration: 400, easing: ease })
    ctaOpacity.value = withDelay(200, withTiming(1, { duration: 400, easing: ease }))
    ctaY.value = withDelay(200, withTiming(0, { duration: 400, easing: ease }))

    glowScale.value = withRepeat(
      withSequence(
        withTiming(1.10, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
      ), -1, false,
    )
    glowOpacity.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.6, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
      ), -1, false,
    )
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const logoStyle = useAnimatedStyle(() => ({
    opacity: logoOpacity.value,
    transform: [{ translateY: logoY.value }],
  }))
  const ctaStyle = useAnimatedStyle(() => ({
    opacity: ctaOpacity.value,
    transform: [{ translateY: ctaY.value }],
  }))
  const glowStyle = useAnimatedStyle(() => ({
    transform: [{ scale: glowScale.value }],
    opacity: glowOpacity.value,
  }))

  useEffect(() => {
    if (resendCountdown <= 0) return
    const timer = setTimeout(() => setResendCountdown((c) => c - 1), 1000)
    return () => clearTimeout(timer)
  }, [resendCountdown])

  useEffect(() => {
    if (otpCode.length === 6 && emailStep === 'otpInput') handleVerifyOtp()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [otpCode])

  async function handleAppleSignIn() {
    setSocialLoading(true)
    try {
      await signInWithApple()
    } catch (err: any) {
      if (err?.code !== 'ERR_CANCELED') {
        Alert.alert(t('signIn.errorTitle'), t('signIn.errorApple'))
      }
    } finally {
      setSocialLoading(false)
    }
  }

  async function handleGoogleSignIn() {
    setSocialLoading(true)
    try {
      await signInWithGoogle()
    } catch (err: any) {
      Alert.alert(t('signIn.errorTitle'), err?.message ?? t('signIn.errorGoogle'))
    } finally {
      setSocialLoading(false)
    }
  }

  async function handleSendCode() {
    const email = emailValue.trim()
    if (!email) return
    setEmailStep('sending')
    try {
      await requestOtp(email)
      setEmailStep('otpInput')
      setOtpCode('')
      setOtpError('')
      setResendCountdown(60)
      setTimeout(() => otpInputRef.current?.focus(), 300)
    } catch (err: any) {
      setEmailStep('emailInput')
      Alert.alert(t('signIn.errorTitle'), err?.message ?? t('signIn.errorSendCode'))
    }
  }

  async function handleVerifyOtp() {
    if (otpCode.length !== 6) return
    setEmailStep('verifying')
    setOtpError('')
    try {
      await verifyOtp(emailValue.trim(), otpCode)
    } catch (err: any) {
      setEmailStep('otpInput')
      setOtpCode('')
      setOtpError(err?.message ?? t('signIn.errorInvalidCode'))
    }
  }

  async function handleResendCode() {
    if (resendCountdown > 0) return
    try {
      await requestOtp(emailValue.trim())
      setOtpCode('')
      setOtpError('')
      setResendCountdown(60)
    } catch (err: any) {
      Alert.alert(t('signIn.errorTitle'), err?.message ?? t('signIn.errorSendCode'))
    }
  }

  function resetEmailFlow() {
    setEmailStep('idle')
    setEmailValue('')
    setOtpCode('')
    setOtpError('')
    setResendCountdown(0)
  }

  async function handleGuestSignIn() {
    if (status === 'authenticated') return
    setSocialLoading(true)
    try {
      await signInAsGuest()
    } catch (err: any) {
      Alert.alert(t('signIn.errorTitle'), err?.message ?? t('signIn.errorGuest'))
    } finally {
      setSocialLoading(false)
    }
  }

  async function handleDevSignIn() {
    setSocialLoading(true)
    try {
      await devSignIn()
    } catch (err: any) {
      Alert.alert('Dev sign-in failed', err?.message ?? 'Unknown error')
    } finally {
      setSocialLoading(false)
    }
  }

  const red = tokens.accent
  const fg = tokens.text
  const muted = tokens.textMute
  const secondaryBg = isDark ? '#FFFFFF' : '#000000'
  const secondaryFg = isDark ? '#000000' : '#FFFFFF'

  const inEmailFlow = emailStep !== 'idle'

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={[styles.container, { backgroundColor: tokens.bg }]}
        keyboardShouldPersistTaps="handled"
        bounces={false}
      >
        <KanjiWatermark color={fg} />

        {/* Logo block */}
        <Animated.View style={[styles.logoBlock, logoStyle]}>
          <View style={styles.markWrap}>
            <Animated.View style={[styles.glow, glowStyle]}>
              <Svg width={200} height={200} viewBox="0 0 200 200">
                <Defs>
                  <RadialGradient id="glowGrad" cx="50%" cy="50%" r="50%">
                    <Stop offset="0%" stopColor={red} stopOpacity={isDark ? 0.45 : 0.3} />
                    <Stop offset="70%" stopColor={red} stopOpacity={0} />
                  </RadialGradient>
                </Defs>
                <Circle cx={100} cy={100} r={100} fill="url(#glowGrad)" />
              </Svg>
            </Animated.View>
            <ForgeMark size={88} isDark={isDark} />
          </View>

          <Text
            style={[styles.wordmark, { color: fg, fontFamily: fonts.sansX }]}
            accessibilityRole="header"
          >
            TANREN
          </Text>

          <Text style={[styles.kanjiSmall, { color: red, fontFamily: fonts.jp }]}>
            鍛{'  '}錬
          </Text>

          <Text style={[styles.baseline, { color: red, fontFamily: fonts.sans }]}>
            {t('signIn.tagline')}
          </Text>
        </Animated.View>

        <View style={styles.spacer} />

        {/* CTA block */}
        <Animated.View style={[styles.ctaBlock, { paddingHorizontal: 24 }, ctaStyle]}>

          {socialLoading && !inEmailFlow ? (
            <ActivityIndicator size="large" color={red} />
          ) : inEmailFlow ? (
            <View style={{ width: '100%', gap: 12 }}>
              {emailStep === 'emailInput' || emailStep === 'sending' ? (
                <>
                  <Text style={{ fontFamily: fonts.sansB, fontSize: 9, color: muted, textTransform: 'uppercase', letterSpacing: 2 }}>
                    {t('signIn.emailLabel').toUpperCase()}
                  </Text>
                  <TextInput
                    value={emailValue}
                    onChangeText={setEmailValue}
                    placeholder={t('signIn.emailPlaceholder')}
                    placeholderTextColor={tokens.textGhost}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    autoFocus
                    returnKeyType="go"
                    onSubmitEditing={handleSendCode}
                    style={[styles.input, {
                      backgroundColor: tokens.surface1,
                      color: fg,
                      fontFamily: fonts.mono,
                      fontSize: 14,
                      borderColor: emailValue ? red : tokens.border,
                    }]}
                    accessibilityLabel={t('signIn.emailLabel')}
                  />
                  <TouchableOpacity
                    onPress={handleSendCode}
                    disabled={emailStep === 'sending' || !emailValue.trim()}
                    style={[styles.cta, {
                      backgroundColor: emailValue.trim() ? red : tokens.surface2,
                    }]}
                    accessibilityLabel={t('signIn.sendCode')}
                    accessibilityRole="button"
                  >
                    {emailStep === 'sending' ? (
                      <ActivityIndicator color="#FFFFFF" />
                    ) : (
                      <Text style={[styles.ctaText, { fontFamily: fonts.sansB, color: emailValue.trim() ? '#FFFFFF' : muted }]}>
                        {t('signIn.sendCode').toUpperCase()}
                      </Text>
                    )}
                  </TouchableOpacity>
                </>
              ) : (
                <>
                  <Text style={{ fontFamily: fonts.sans, fontSize: 13, color: muted }}>
                    {t('signIn.codeSentTo', { email: emailValue.trim() })}
                  </Text>
                  <TextInput
                    ref={otpInputRef}
                    value={otpCode}
                    onChangeText={(v) => {
                      setOtpCode(v.replace(/\D/g, '').slice(0, 6))
                      setOtpError('')
                    }}
                    placeholder={t('signIn.codePlaceholder')}
                    placeholderTextColor={tokens.textGhost}
                    keyboardType="number-pad"
                    textContentType="oneTimeCode"
                    maxLength={6}
                    autoFocus
                    style={[styles.otpInput, {
                      backgroundColor: tokens.surface1,
                      color: fg,
                      fontFamily: fonts.monoB,
                      borderColor: otpError ? tokens.accent : otpCode.length === 6 ? red : tokens.border,
                    }]}
                    accessibilityLabel={t('signIn.codeLabel')}
                  />
                  {otpError ? (
                    <Text style={{ fontFamily: fonts.sans, fontSize: 11, color: tokens.accent, width: '100%', marginTop: -4 }}>
                      {otpError}
                    </Text>
                  ) : null}
                  <TouchableOpacity
                    onPress={handleVerifyOtp}
                    disabled={emailStep === 'verifying' || otpCode.length !== 6}
                    style={[styles.cta, {
                      backgroundColor: otpCode.length === 6 ? red : tokens.surface2,
                    }]}
                    accessibilityLabel={t('signIn.verify')}
                    accessibilityRole="button"
                  >
                    {emailStep === 'verifying' ? (
                      <ActivityIndicator color="#FFFFFF" />
                    ) : (
                      <Text style={[styles.ctaText, { fontFamily: fonts.sansB, color: otpCode.length === 6 ? '#FFFFFF' : muted }]}>
                        {t('signIn.verify').toUpperCase()}
                      </Text>
                    )}
                  </TouchableOpacity>
                  <TouchableOpacity onPress={handleResendCode} disabled={resendCountdown > 0} accessibilityRole="button">
                    <Text style={{ textAlign: 'center', paddingVertical: 4, fontSize: 13, fontFamily: fonts.sans, color: resendCountdown > 0 ? muted : red }}>
                      {resendCountdown > 0 ? t('signIn.resendIn', { s: resendCountdown }) : t('signIn.resendCode')}
                    </Text>
                  </TouchableOpacity>
                </>
              )}

              <TouchableOpacity
                onPress={resetEmailFlow}
                accessibilityRole="button"
                style={{ alignItems: 'center', marginTop: 4 }}
              >
                <Text style={{ textAlign: 'center', paddingVertical: 4, fontSize: 13, fontFamily: fonts.sans, color: muted }}>
                  {t('signIn.useOtherMethod')}
                </Text>
              </TouchableOpacity>
            </View>

          ) : (
            <>
              {/* Apple */}
              {Platform.OS === 'ios' && (
                <TouchableOpacity
                  style={[styles.cta, { backgroundColor: red }]}
                  onPress={handleAppleSignIn}
                  accessibilityLabel={t('signIn.continueWithApple')}
                  accessibilityRole="button"
                >
                  <AppleIcon />
                  <Text style={[styles.ctaText, { color: '#FFFFFF', fontFamily: fonts.sansB }]}>
                    {t('signIn.continueWithApple').toUpperCase()}
                  </Text>
                </TouchableOpacity>
              )}

              {/* Google */}
              {googleAvailable && (
                <TouchableOpacity
                  style={[styles.cta, { backgroundColor: secondaryBg }]}
                  onPress={handleGoogleSignIn}
                  accessibilityLabel={t('signIn.continueWithGoogle')}
                  accessibilityRole="button"
                >
                  <GoogleIcon />
                  <Text style={[styles.ctaText, { color: secondaryFg, fontFamily: fonts.sansB }]}>
                    {t('signIn.continueWithGoogle').toUpperCase()}
                  </Text>
                </TouchableOpacity>
              )}

              {/* Email */}
              <TouchableOpacity
                style={[styles.cta, {
                  backgroundColor: 'transparent',
                  borderWidth: 1,
                  borderColor: tokens.border,
                }]}
                onPress={() => setEmailStep('emailInput')}
                accessibilityLabel={t('signIn.continueWithEmail')}
                accessibilityRole="button"
              >
                <MailIcon color={fg} />
                <Text style={[styles.ctaText, { color: fg, fontFamily: fonts.sansB }]}>
                  {t('signIn.continueWithEmail').toUpperCase()}
                </Text>
              </TouchableOpacity>

              {/* Guest */}
              <TouchableOpacity
                onPress={handleGuestSignIn}
                style={styles.guestWrap}
                accessibilityLabel={t('signIn.continueAsGuest')}
                accessibilityRole="button"
              >
                <Text style={[styles.guestText, { color: fg, fontFamily: fonts.sansM }]}>
                  {t('signIn.continueAsGuest')}
                </Text>
              </TouchableOpacity>

              {/* DEV bypass */}
              {__DEV__ && (
                <TouchableOpacity
                  style={[styles.devButton, { borderColor: tokens.border }]}
                  onPress={handleDevSignIn}
                  accessibilityLabel="Dev bypass sign-in"
                  accessibilityRole="button"
                >
                  <Text style={[styles.devText, { color: muted, fontFamily: fonts.sansB }]}>
                    DEV — SKIP SIGN-IN
                  </Text>
                </TouchableOpacity>
              )}
            </>
          )}

          {/* Legal */}
          {!inEmailFlow && (
            <Text style={[styles.legalText, { color: muted, fontFamily: fonts.sans }]}>
              {t('signIn.legalPrefix')}
              <Text style={{ textDecorationLine: 'underline', color: fg }}>{t('signIn.legalTerms')}</Text>
              {t('signIn.legalAnd')}
              <Text style={{ textDecorationLine: 'underline', color: fg }}>{t('signIn.legalPrivacy')}</Text>
              {t('signIn.legalSuffix')}
            </Text>
          )}
        </Animated.View>

      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    paddingTop: 80,
    paddingBottom: 32,
  },
  logoBlock: {
    alignItems: 'center',
    zIndex: 10,
    marginTop: 40,
  },
  markWrap: {
    width: 88,
    height: 88,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 32,
  },
  glow: {
    position: 'absolute',
    width: 200,
    height: 200,
    alignItems: 'center',
    justifyContent: 'center',
  },
  wordmark: {
    fontSize: 56,
    letterSpacing: 56 * 0.16,
    lineHeight: 64,
    marginBottom: 10,
    textTransform: 'uppercase',
  },
  kanjiSmall: {
    fontSize: 16,
    letterSpacing: 16 * 0.4,
    marginBottom: 20,
  },
  baseline: {
    fontSize: 18,
    fontStyle: 'italic',
    textAlign: 'center',
  },
  spacer: {
    flex: 1,
    minHeight: 40,
  },
  ctaBlock: {
    zIndex: 10,
    gap: 12,
    alignItems: 'center',
  },
  cta: {
    width: '100%',
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  ctaText: {
    fontSize: 13,
    letterSpacing: 13 * 0.08,
  },
  input: {
    width: '100%',
    height: 50,
    paddingHorizontal: 16,
    borderWidth: 1,
  },
  otpInput: {
    width: '100%',
    height: 64,
    paddingHorizontal: 16,
    fontSize: 32,
    letterSpacing: 10,
    textAlign: 'center',
    borderWidth: 1,
  },
  guestWrap: {
    marginTop: 4,
    paddingVertical: 12,
  },
  guestText: {
    fontSize: 14,
    textAlign: 'center',
    textDecorationLine: 'underline',
    textDecorationStyle: 'solid',
    letterSpacing: 14 * 0.02,
  },
  devButton: {
    width: '100%',
    height: 44,
    borderWidth: 1,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  devText: {
    fontSize: 11,
    letterSpacing: 11 * 0.16,
    textTransform: 'uppercase',
  },
  legalText: {
    fontSize: 11,
    textAlign: 'center',
    lineHeight: 16,
    letterSpacing: 11 * 0.02,
    marginTop: 4,
  },
})
