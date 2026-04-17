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
import * as AppleAuthentication from 'expo-apple-authentication'
import { useAuth } from '@/contexts/AuthContext'
import { useTheme } from '@/theme/ThemeContext'
import { useTranslation } from 'react-i18next'
import { router, useLocalSearchParams } from 'expo-router'

// Email OTP flow states
type EmailStep = 'idle' | 'emailInput' | 'sending' | 'otpInput' | 'verifying'

export default function SignInScreen() {
  const { colors, typography, spacing, radius } = useTheme()
  const { t } = useTranslation()
  const params = useLocalSearchParams<{ upgrade?: string }>()
  // upgrade=1 means a guest is coming here to sign in — don't auto-redirect, don't create new guest
  const isUpgrade = params.upgrade === '1'

  const {
    signInWithApple, signInWithGoogle, googleAvailable,
    requestOtp, verifyOtp, signInAsGuest,
    devSignIn, status,
  } = useAuth()

  // Apple/Google loading
  const [socialLoading, setSocialLoading] = useState(false)

  // Email OTP state machine
  const [emailStep, setEmailStep] = useState<EmailStep>('idle')
  const [emailValue, setEmailValue] = useState('')
  const [otpCode, setOtpCode] = useState('')
  const [otpError, setOtpError] = useState('')
  const [resendCountdown, setResendCountdown] = useState(0)

  const otpInputRef = useRef<TextInput>(null)

  // Redirect once authenticated — suppressed in upgrade mode (guest coming to sign in)
  useEffect(() => {
    if (status === 'authenticated' && !isUpgrade) {
      router.replace('/(tabs)/' as any)
    }
  }, [status, isUpgrade])

  // Resend countdown tick
  useEffect(() => {
    if (resendCountdown <= 0) return
    const timer = setTimeout(() => setResendCountdown((c) => c - 1), 1000)
    return () => clearTimeout(timer)
  }, [resendCountdown])

  // Auto-submit OTP when all 6 digits entered
  useEffect(() => {
    if (otpCode.length === 6 && emailStep === 'otpInput') {
      handleVerifyOtp()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [otpCode])

  // ── Social sign-in handlers ──────────────────────────────────────────────────

  async function handleAppleSignIn() {
    setSocialLoading(true)
    try {
      await signInWithApple()
      router.replace('/(tabs)/' as any)
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
      router.replace('/(tabs)/' as any)
    } catch (err: any) {
      Alert.alert(t('signIn.errorTitle'), err?.message ?? t('signIn.errorGoogle'))
    } finally {
      setSocialLoading(false)
    }
  }

  // ── Email OTP handlers ───────────────────────────────────────────────────────

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
      // Auto-focus OTP input after a short delay
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
      router.replace('/(tabs)/' as any)
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

  // ── Guest handler ────────────────────────────────────────────────────────────

  async function handleGuestSignIn() {
    // In upgrade mode (guest came here to sign in), "Continue as guest" means
    // "go back without changing anything" — do NOT create a new guest account.
    if (status === 'authenticated') {
      router.replace('/(tabs)/' as any)
      return
    }
    setSocialLoading(true)
    try {
      await signInAsGuest()
      router.replace('/(tabs)/' as any)
    } catch (err: any) {
      Alert.alert(t('signIn.errorTitle'), err?.message ?? t('signIn.errorGuest'))
    } finally {
      setSocialLoading(false)
    }
  }

  // ── Dev handler ──────────────────────────────────────────────────────────────

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

  // ── Render ───────────────────────────────────────────────────────────────────

  const inEmailFlow = emailStep !== 'idle'

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={[styles.container, { backgroundColor: colors.background }]}
        keyboardShouldPersistTaps="handled"
        bounces={false}
      >
        {/* Hero */}
        <View style={styles.hero}>
          <Text
            style={[styles.logo, { color: colors.primary, fontFamily: typography.family.extraBold }]}
            accessibilityRole="header"
          >
            TANREN
          </Text>
          <Text style={[styles.tagline, { color: colors.textMuted, fontFamily: typography.family.regular, fontSize: typography.size.base }]}>
            {t('signIn.tagline')}
          </Text>
        </View>

        {/* Auth area */}
        <View style={[styles.authArea, { paddingHorizontal: spacing.lg }]}>

          {socialLoading && !inEmailFlow ? (
            <ActivityIndicator size="large" color={colors.primary} />
          ) : inEmailFlow ? (
            /* ── Email OTP flow ── */
            <View style={{ width: '100%', gap: spacing.md }}>

              {emailStep === 'emailInput' || emailStep === 'sending' ? (
                <>
                  <Text style={[styles.formLabel, { color: colors.textMuted, fontFamily: typography.family.semiBold, fontSize: typography.size.base }]}>
                    {t('signIn.emailLabel')}
                  </Text>
                  <TextInput
                    value={emailValue}
                    onChangeText={setEmailValue}
                    placeholder={t('signIn.emailPlaceholder')}
                    placeholderTextColor={colors.textMuted}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    autoFocus
                    returnKeyType="go"
                    onSubmitEditing={handleSendCode}
                    style={[styles.input, {
                      backgroundColor: colors.surface,
                      borderRadius: radius.md,
                      color: colors.textPrimary,
                      fontFamily: typography.family.regular,
                      fontSize: typography.size.body,
                      borderColor: emailValue ? colors.primary : 'transparent',
                    }]}
                    accessibilityLabel={t('signIn.emailLabel')}
                  />
                  <TouchableOpacity
                    onPress={handleSendCode}
                    disabled={emailStep === 'sending' || !emailValue.trim()}
                    style={[styles.primaryButton, {
                      backgroundColor: emailValue.trim() ? colors.primary : colors.surface2,
                      borderRadius: radius.lg,
                    }]}
                    accessibilityLabel={t('signIn.sendCode')}
                    accessibilityRole="button"
                  >
                    {emailStep === 'sending' ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <Text style={[styles.primaryButtonText, { fontFamily: typography.family.extraBold, color: emailValue.trim() ? '#fff' : colors.textMuted }]}>
                        {t('signIn.sendCode')}
                      </Text>
                    )}
                  </TouchableOpacity>
                </>
              ) : (
                <>
                  <Text style={[styles.formLabel, { color: colors.textMuted, fontFamily: typography.family.regular, fontSize: typography.size.base }]}>
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
                    placeholderTextColor={colors.textMuted}
                    keyboardType="number-pad"
                    textContentType="oneTimeCode"
                    maxLength={6}
                    autoFocus
                    style={[styles.otpInput, {
                      backgroundColor: colors.surface,
                      borderRadius: radius.md,
                      color: colors.textPrimary,
                      fontFamily: typography.family.extraBold,
                      borderColor: otpError ? colors.danger : otpCode.length === 6 ? colors.primary : 'transparent',
                    }]}
                    accessibilityLabel={t('signIn.codeLabel')}
                  />
                  {otpError ? (
                    <Text style={[styles.errorText, { color: colors.danger, fontFamily: typography.family.regular, fontSize: typography.size.xs }]}>
                      {otpError}
                    </Text>
                  ) : null}
                  <TouchableOpacity
                    onPress={handleVerifyOtp}
                    disabled={emailStep === 'verifying' || otpCode.length !== 6}
                    style={[styles.primaryButton, {
                      backgroundColor: otpCode.length === 6 ? colors.primary : colors.surface2,
                      borderRadius: radius.lg,
                    }]}
                    accessibilityLabel={t('signIn.verify')}
                    accessibilityRole="button"
                  >
                    {emailStep === 'verifying' ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <Text style={[styles.primaryButtonText, { fontFamily: typography.family.extraBold, color: otpCode.length === 6 ? '#fff' : colors.textMuted }]}>
                        {t('signIn.verify')}
                      </Text>
                    )}
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={handleResendCode}
                    disabled={resendCountdown > 0}
                    accessibilityRole="button"
                  >
                    <Text style={[styles.linkText, { color: resendCountdown > 0 ? colors.textMuted : colors.primary, fontFamily: typography.family.regular, fontSize: typography.size.base }]}>
                      {resendCountdown > 0
                        ? t('signIn.resendIn', { s: resendCountdown })
                        : t('signIn.resendCode')}
                    </Text>
                  </TouchableOpacity>
                </>
              )}

              {/* Back to all options */}
              <TouchableOpacity
                onPress={resetEmailFlow}
                accessibilityRole="button"
                style={{ alignItems: 'center', marginTop: spacing.xs }}
              >
                <Text style={[styles.linkText, { color: colors.textMuted, fontFamily: typography.family.regular, fontSize: typography.size.base }]}>
                  {t('signIn.useOtherMethod')}
                </Text>
              </TouchableOpacity>
            </View>

          ) : (
            /* ── Normal sign-in options ── */
            <>
              {Platform.OS === 'ios' && (
                <AppleAuthentication.AppleAuthenticationButton
                  buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
                  buttonStyle={
                    colors.background === '#0E0E0E'
                      ? AppleAuthentication.AppleAuthenticationButtonStyle.WHITE
                      : AppleAuthentication.AppleAuthenticationButtonStyle.BLACK
                  }
                  cornerRadius={12}
                  style={styles.appleButton}
                  onPress={handleAppleSignIn}
                />
              )}

              {googleAvailable && (
                <>
                  {Platform.OS === 'ios' && (
                    <Text style={[styles.orText, { color: colors.textMuted, fontFamily: typography.family.regular }]}>
                      {t('common.or')}
                    </Text>
                  )}
                  <TouchableOpacity
                    style={[styles.socialButton, { backgroundColor: colors.surface, borderColor: colors.surface2 }]}
                    onPress={handleGoogleSignIn}
                    accessibilityLabel={t('signIn.continueWithGoogle')}
                    accessibilityRole="button"
                  >
                    <Text style={{ fontSize: 18 }}>G</Text>
                    <Text style={[styles.socialButtonText, { color: colors.textPrimary, fontFamily: typography.family.semiBold }]}>
                      {t('signIn.continueWithGoogle')}
                    </Text>
                  </TouchableOpacity>
                </>
              )}

              {(Platform.OS === 'ios' || googleAvailable) && (
                <Text style={[styles.orText, { color: colors.textMuted, fontFamily: typography.family.regular }]}>
                  {t('common.or')}
                </Text>
              )}

              {/* Email CTA */}
              <TouchableOpacity
                style={[styles.socialButton, { backgroundColor: colors.surface, borderColor: colors.surface2 }]}
                onPress={() => setEmailStep('emailInput')}
                accessibilityLabel={t('signIn.continueWithEmail')}
                accessibilityRole="button"
              >
                <Text style={{ fontSize: 18 }}>✉️</Text>
                <Text style={[styles.socialButtonText, { color: colors.textPrimary, fontFamily: typography.family.semiBold }]}>
                  {t('signIn.continueWithEmail')}
                </Text>
              </TouchableOpacity>
            </>
          )}

          {/* ── Guest button — always visible ── */}
          {!inEmailFlow && (
            <TouchableOpacity
              onPress={handleGuestSignIn}
              style={{ marginTop: spacing.sm, paddingVertical: spacing.sm }}
              accessibilityLabel={t('signIn.continueAsGuest')}
              accessibilityRole="button"
            >
              <Text style={[styles.guestText, { color: colors.textMuted, fontFamily: typography.family.regular, fontSize: typography.size.base }]}>
                {t('signIn.continueAsGuest')}
              </Text>
            </TouchableOpacity>
          )}

          {/* ── Dev bypass ── */}
          {__DEV__ && !inEmailFlow && (
            <TouchableOpacity
              style={[styles.devButton, { borderColor: colors.textMuted }]}
              onPress={handleDevSignIn}
              accessibilityLabel="Dev bypass sign-in"
              accessibilityRole="button"
            >
              <Text style={[styles.devButtonText, { color: colors.textMuted, fontFamily: typography.family.regular }]}>
                DEV — Skip sign-in
              </Text>
            </TouchableOpacity>
          )}

          <Text style={[styles.legal, { color: colors.textMuted, fontFamily: typography.family.regular, fontSize: typography.size.xs }]}>
            {t('signIn.legal')}
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    justifyContent: 'space-between',
    paddingTop: 120,
    paddingBottom: 60,
  },
  hero: {
    alignItems: 'center',
    gap: 12,
  },
  logo: {
    fontSize: 48,
    letterSpacing: -1,
  },
  tagline: {
    textAlign: 'center',
  },
  authArea: {
    gap: 16,
    alignItems: 'center',
  },
  appleButton: {
    width: '100%',
    height: 50,
  },
  orText: {
    fontSize: 14,
  },
  socialButton: {
    width: '100%',
    height: 50,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  socialButtonText: {
    fontSize: 15,
  },
  formLabel: {
    width: '100%',
  },
  input: {
    width: '100%',
    height: 50,
    paddingHorizontal: 16,
    borderWidth: 2,
  },
  otpInput: {
    width: '100%',
    height: 64,
    paddingHorizontal: 16,
    fontSize: 32,
    letterSpacing: 10,
    textAlign: 'center',
    borderWidth: 2,
  },
  errorText: {
    width: '100%',
    marginTop: -8,
  },
  primaryButton: {
    width: '100%',
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    fontSize: 17,
  },
  linkText: {
    textAlign: 'center',
    paddingVertical: 4,
  },
  guestText: {
    textAlign: 'center',
    textDecorationLine: 'underline',
  },
  devButton: {
    width: '100%',
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  devButtonText: {
    fontSize: 13,
    letterSpacing: 0.5,
  },
  legal: {
    textAlign: 'center',
    lineHeight: 18,
    marginTop: 4,
  },
})
