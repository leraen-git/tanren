import { SafeAreaView } from 'react-native-safe-area-context'
import React, { useState, useEffect } from 'react'
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  Alert,
  type ViewStyle,
} from 'react-native'
import * as ImagePicker from 'expo-image-picker'
import { router } from 'expo-router'
import { useTheme } from '@/theme/ThemeContext'
import { trpc } from '@/lib/trpc'
import { colors as tokenColors } from '@/theme/tokens'

const LEVELS = ['BEGINNER', 'INTERMEDIATE', 'ADVANCED'] as const
const GOALS = ['WEIGHT_LOSS', 'MUSCLE_GAIN', 'MAINTENANCE'] as const
const GOAL_LABELS: Record<string, string> = {
  WEIGHT_LOSS: 'Weight Loss',
  MUSCLE_GAIN: 'Muscle Gain',
  MAINTENANCE: 'Maintenance',
}

function SectionTitle({ label }: { label: string }) {
  const { colors, typography, spacing } = useTheme()
  return (
    <Text style={{
      fontFamily: typography.family.semiBold,
      fontSize: typography.size.xs,
      color: colors.textMuted,
      letterSpacing: 1,
      marginTop: spacing.base,
      marginBottom: spacing.xs,
    }}>
      {label.toUpperCase()}
    </Text>
  )
}

function InlineField({
  label,
  value,
  onSave,
  placeholder,
  keyboardType = 'default',
  editable = true,
  unit,
}: {
  label: string
  value: string
  onSave?: (v: string) => void
  placeholder?: string
  keyboardType?: 'default' | 'decimal-pad' | 'number-pad'
  editable?: boolean
  unit?: string
}) {
  const { colors, typography, spacing } = useTheme()
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)

  useEffect(() => { setDraft(value) }, [value])

  const handleSave = () => {
    setEditing(false)
    if (draft !== value) onSave?.(draft)
  }

  return (
    <View style={{
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: colors.surface2,
    }}>
      <Text style={{ fontFamily: typography.family.regular, fontSize: typography.size.body, color: colors.textMuted, width: 110 }}>
        {label}
      </Text>
      {editing ? (
        <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
          <TextInput
            value={draft}
            onChangeText={setDraft}
            onBlur={handleSave}
            onSubmitEditing={handleSave}
            returnKeyType="done"
            keyboardType={keyboardType}
            autoFocus
            style={{
              flex: 1,
              fontFamily: typography.family.semiBold,
              fontSize: typography.size.body,
              color: colors.textPrimary,
              borderBottomWidth: 1,
              borderBottomColor: colors.primary,
              paddingVertical: spacing.xs,
            }}
            accessibilityLabel={`Edit ${label}`}
          />
          {unit && <Text style={{ fontFamily: typography.family.regular, fontSize: typography.size.base, color: colors.textMuted }}>{unit}</Text>}
        </View>
      ) : (
        <TouchableOpacity
          style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }}
          onPress={() => editable && setEditing(true)}
          disabled={!editable}
          accessibilityLabel={`${label}: ${value || placeholder}`}
          accessibilityRole={editable ? 'button' : 'text'}
        >
          <Text style={{ fontFamily: typography.family.semiBold, fontSize: typography.size.body, color: value ? colors.textPrimary : colors.textMuted }}>
            {value || placeholder || '—'}
          </Text>
          {unit && value ? <Text style={{ fontFamily: typography.family.regular, fontSize: typography.size.base, color: colors.textMuted, marginLeft: 4 }}>{unit}</Text> : null}
        </TouchableOpacity>
      )}
    </View>
  )
}

function ChipSelector<T extends string>({
  label,
  options,
  value,
  labelMap,
  onChange,
}: {
  label: string
  options: readonly T[]
  value: T
  labelMap?: Record<string, string>
  onChange: (v: T) => void
}) {
  const { colors, typography, spacing, radius } = useTheme()
  return (
    <View style={{ paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.surface2, gap: spacing.sm }}>
      <Text style={{ fontFamily: typography.family.regular, fontSize: typography.size.body, color: colors.textMuted }}>{label}</Text>
      <View style={{ flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' }}>
        {options.map((opt) => {
          const selected = opt === value
          return (
            <TouchableOpacity
              key={opt}
              onPress={() => onChange(opt)}
              style={{
                paddingVertical: spacing.xs,
                paddingHorizontal: spacing.md,
                borderRadius: radius.pill,
                backgroundColor: selected ? colors.primary : colors.surface2,
              }}
              accessibilityLabel={`${label}: ${labelMap?.[opt] ?? opt}`}
              accessibilityRole="button"
            >
              <Text style={{
                fontFamily: selected ? typography.family.semiBold : typography.family.regular,
                fontSize: typography.size.base,
                color: selected ? tokenColors.white : colors.textMuted,
              }}>
                {labelMap?.[opt] ?? opt.charAt(0) + opt.slice(1).toLowerCase()}
              </Text>
            </TouchableOpacity>
          )
        })}
      </View>
    </View>
  )
}

const THEME_OPTIONS: { value: 'light' | 'dark' | 'system'; label: string; icon: string }[] = [
  { value: 'light', label: 'Light', icon: '☀️' },
  { value: 'dark', label: 'Dark', icon: '🌙' },
  { value: 'system', label: 'Auto', icon: '⚙️' },
]

export default function ProfileScreen() {
  const { colors, typography, spacing, radius, preference, setTheme } = useTheme()
  const { data: user, refetch } = trpc.users.me.useQuery()
  const { data: sessions } = trpc.sessions.history.useQuery({ limit: 100 })
  const { data: records } = trpc.progress.records.useQuery()
  const utils = trpc.useUtils()
  const updateMe = trpc.users.updateMe.useMutation({ onSuccess: () => refetch() })
  const deleteMe = trpc.users.deleteMe.useMutation({
    onSuccess: async () => {
      await utils.invalidate() // wipe entire query cache so new account starts fresh
      router.replace('/onboarding/step1' as any)
    },
    onError: (err) => Alert.alert('Error', err.message),
  })

  const save = (data: Parameters<typeof updateMe.mutate>[0]) => updateMe.mutate(data)

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete account',
      'This will permanently delete your account and all your data. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete my account',
          style: 'destructive',
          onPress: () => deleteMe.mutate(),
        },
      ],
    )
  }

  const totalVolume = sessions?.reduce((sum, s) => sum + s.totalVolume, 0) ?? 0

  const handlePickPhoto = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Allow photo access to set a profile picture.')
      return
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    })
    if (!result.canceled && result.assets[0]) {
      // Store URI locally — in production this would upload to a CDN
      save({ avatarUrl: result.assets[0].uri })
    }
  }

  const cardStyle: ViewStyle = {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.base,
    overflow: 'hidden',
  }

  if (!user) return null

  return (
    <SafeAreaView edges={["top"]} style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView contentContainerStyle={{ padding: spacing.base, gap: spacing.sm, paddingBottom: spacing.xl }}>

        <Text style={{ fontFamily: typography.family.extraBold, fontSize: typography.size['2xl'], color: colors.textPrimary }}>
          Profile
        </Text>

        {/* Avatar */}
        <View style={{ alignItems: 'center', paddingVertical: spacing.base }}>
          <TouchableOpacity onPress={handlePickPhoto} accessibilityLabel="Change profile photo" accessibilityRole="button">
            {user.avatarUrl ? (
              <Image
                source={{ uri: user.avatarUrl }}
                style={{ width: 96, height: 96, borderRadius: 48, backgroundColor: colors.surface2 }}
              />
            ) : (
              <View style={{
                width: 96, height: 96, borderRadius: 48,
                backgroundColor: colors.primary,
                alignItems: 'center', justifyContent: 'center',
              }}>
                <Text style={{ fontFamily: typography.family.extraBold, fontSize: typography.size['2xl'], color: tokenColors.white }}>
                  {user.name.charAt(0).toUpperCase()}
                </Text>
              </View>
            )}
            <View style={{
              position: 'absolute', bottom: 0, right: 0,
              backgroundColor: colors.surface2,
              borderRadius: radius.pill,
              padding: 6,
            }}>
              <Text style={{ fontSize: 14 }}>📷</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Stats row */}
        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
          {[
            { label: 'Sessions', value: String(sessions?.length ?? 0) },
            { label: 'Volume', value: `${(totalVolume / 1000).toFixed(1)}t` },
            { label: 'PRs', value: String(records?.length ?? 0) },
          ].map(({ label, value }) => (
            <View key={label} style={{ flex: 1, backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.md, alignItems: 'center' }}>
              <Text style={{ fontFamily: typography.family.extraBold, fontSize: typography.size['2xl'], color: colors.primary }}>{value}</Text>
              <Text style={{ fontFamily: typography.family.regular, fontSize: typography.size.xs, color: colors.textMuted }}>{label}</Text>
            </View>
          ))}
        </View>

        {/* Identity */}
        <SectionTitle label="Identity" />
        <View style={cardStyle}>
          <InlineField
            label="Name"
            value={user.name}
            onSave={(v) => save({ name: v })}
            placeholder="Your name"
          />
          <InlineField
            label="Email"
            value={user.email}
            onSave={(v) => save({ email: v })}
            editable={true}
            keyboardType="default"
          />
        </View>

        {/* Physical */}
        <SectionTitle label="Physical" />
        <View style={cardStyle}>
          <InlineField
            label="Height"
            value={user.heightCm != null ? String(user.heightCm) : ''}
            onSave={(v) => save({ heightCm: parseFloat(v) || null })}
            placeholder="e.g. 178"
            keyboardType="decimal-pad"
            unit="cm"
          />
          <InlineField
            label="Weight"
            value={user.weightKg != null ? String(user.weightKg) : ''}
            onSave={(v) => save({ weightKg: parseFloat(v) || null })}
            placeholder="e.g. 75"
            keyboardType="decimal-pad"
            unit="kg"
          />
        </View>

        {/* Training */}
        <SectionTitle label="Training" />
        <View style={cardStyle}>
          <ChipSelector
            label="Level"
            options={LEVELS}
            value={user.level}
            onChange={(v) => save({ level: v })}
          />
          <ChipSelector
            label="Goal"
            options={GOALS}
            value={user.goal}
            labelMap={GOAL_LABELS}
            onChange={(v) => save({ goal: v })}
          />
          <View style={{ paddingVertical: spacing.md, gap: spacing.sm }}>
            <Text style={{ fontFamily: typography.family.regular, fontSize: typography.size.body, color: colors.textMuted }}>
              Weekly target
            </Text>
            <View style={{ flexDirection: 'row', gap: spacing.sm }}>
              {[1, 2, 3, 4, 5, 6, 7].map((n) => (
                <TouchableOpacity
                  key={n}
                  onPress={() => save({ weeklyTarget: n })}
                  style={{
                    flex: 1, paddingVertical: spacing.sm,
                    borderRadius: radius.sm,
                    backgroundColor: user.weeklyTarget === n ? colors.primary : colors.surface2,
                    alignItems: 'center',
                  }}
                  accessibilityLabel={`${n} sessions per week`}
                  accessibilityRole="button"
                >
                  <Text style={{
                    fontFamily: typography.family.bold,
                    fontSize: typography.size.base,
                    color: user.weeklyTarget === n ? tokenColors.white : colors.textMuted,
                  }}>
                    {n}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={{ fontFamily: typography.family.regular, fontSize: typography.size.xs, color: colors.textMuted, textAlign: 'center' }}>
              sessions / week
            </Text>
          </View>
        </View>

        {/* Appearance */}
        <SectionTitle label="Appearance" />
        <View style={{ ...cardStyle, flexDirection: 'row', paddingVertical: spacing.sm }}>
          {THEME_OPTIONS.map(({ value, label, icon }) => {
            const selected = preference === value
            return (
              <TouchableOpacity
                key={value}
                onPress={() => setTheme(value)}
                style={{
                  flex: 1,
                  alignItems: 'center',
                  paddingVertical: spacing.md,
                  borderRadius: radius.md,
                  backgroundColor: selected ? colors.primary : 'transparent',
                  margin: spacing.xs,
                }}
                accessibilityLabel={`${label} theme`}
                accessibilityRole="button"
              >
                <Text style={{ fontSize: 20, marginBottom: 4 }}>{icon}</Text>
                <Text style={{
                  fontFamily: selected ? typography.family.semiBold : typography.family.regular,
                  fontSize: typography.size.base,
                  color: selected ? tokenColors.white : colors.textMuted,
                }}>
                  {label}
                </Text>
              </TouchableOpacity>
            )
          })}
        </View>

        {/* Delete account */}
        <TouchableOpacity
          onPress={handleDeleteAccount}
          style={{
            marginTop: spacing.xl,
            paddingVertical: spacing.base,
            borderRadius: radius.lg,
            borderWidth: 1,
            borderColor: `${colors.danger}40`,
            alignItems: 'center',
          }}
          accessibilityLabel="Delete account"
          accessibilityRole="button"
        >
          <Text style={{ fontFamily: typography.family.semiBold, fontSize: typography.size.body, color: colors.danger }}>
            Delete account
          </Text>
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  )
}
