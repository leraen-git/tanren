import React, { useRef, useState } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
  StyleSheet,
  useWindowDimensions,
  PanResponder,
  Animated,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router, useLocalSearchParams } from 'expo-router'
import ViewShot from 'react-native-view-shot'
import * as ImagePicker from 'expo-image-picker'
import * as Sharing from 'expo-sharing'
import { useTheme } from '@/theme/ThemeContext'
import { useActiveSessionStore } from '@/stores/activeSessionStore'

// 9:16 ratio — standard portrait for Instagram / Stories / TikTok
const CARD_RATIO = 9 / 16
const RED = '#E8192C'
const BG = '#0A0A0A'
const WHITE = '#F0F0F0'

function makePanResponder(pan: Animated.ValueXY) {
  return PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onPanResponderGrant: () => {
      pan.setOffset({ x: (pan.x as any)._value, y: (pan.y as any)._value })
      pan.setValue({ x: 0, y: 0 })
    },
    onPanResponderMove: Animated.event([null, { dx: pan.x, dy: pan.y }], { useNativeDriver: false }),
    onPanResponderRelease: () => pan.flattenOffset(),
  })
}

export default function ShareScreen() {
  const { colors, typography, spacing, radius } = useTheme()
  const { width: screenWidth, height: screenHeight } = useWindowDimensions()
  const finishSession = useActiveSessionStore((s) => s.finishSession)

  const {
    workoutName,
    durationMins,
    totalVolume,
    completedSets,
    prCount,
  } = useLocalSearchParams<{
    workoutName: string
    durationMins: string
    totalVolume: string
    completedSets: string
    prCount: string
  }>()

  // Card dimensions: fill width, height = width * (16/9), cap to screen
  const HORIZONTAL_PAD = 32
  const CARD_WIDTH = screenWidth - HORIZONTAL_PAD * 2
  // Reserve ~180px for header + action row + safe area
  const maxCardHeight = screenHeight - 180
  const naturalCardHeight = CARD_WIDTH / CARD_RATIO  // width * 16/9
  const CARD_HEIGHT = Math.min(naturalCardHeight, maxCardHeight)
  // If height was capped, shrink width to maintain 9:16
  const FINAL_CARD_WIDTH = CARD_HEIGHT === maxCardHeight ? CARD_HEIGHT * CARD_RATIO : CARD_WIDTH

  // Draggable block positions
  const titlePan = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current
  const statsPan = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current
  const titlePanResponder = useRef(makePanResponder(titlePan)).current
  const statsPanResponder = useRef(makePanResponder(statsPan)).current

  const viewShotRef = useRef<ViewShot>(null)
  const [photoUri, setPhotoUri] = useState<string | null>(null)
  const [sharing, setSharing] = useState(false)

  const finishAndNavigate = () => {
    finishSession()
    router.replace('/' as any)
  }

  const pickPhoto = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Allow photo access to add a background.')
      return
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [9, 16],
      quality: 0.9,
    })
    if (!result.canceled && result.assets[0]) setPhotoUri(result.assets[0].uri)
  }

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync()
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Allow camera access to take a photo.')
      return
    }
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [9, 16],
      quality: 0.9,
    })
    if (!result.canceled && result.assets[0]) setPhotoUri(result.assets[0].uri)
  }

  const captureCard = async (): Promise<string | null> => {
    try {
      return await viewShotRef.current?.capture?.() ?? null
    } catch {
      return null
    }
  }

  const handleShare = async () => {
    setSharing(true)
    const uri = await captureCard()
    setSharing(false)
    if (!uri) { Alert.alert('Error', 'Could not capture card.'); return }
    const available = await Sharing.isAvailableAsync()
    if (!available) { Alert.alert('Sharing not available on this device.'); return }
    await Sharing.shareAsync(uri, { mimeType: 'image/png', dialogTitle: 'Share your session' })
  }

  const prs = parseInt(prCount ?? '0', 10)
  const volume = parseFloat(totalVolume ?? '0')
  const volumeDisplay = volume >= 1000 ? `${(volume / 1000).toFixed(1)}t` : `${Math.round(volume)}kg`

  // Initial positions for draggable blocks (as % of card height)
  const titleTop = CARD_HEIGHT * 0.42
  const statsTop = CARD_HEIGHT * 0.68

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.base, paddingVertical: spacing.sm }}>
        <TouchableOpacity onPress={() => router.back()} accessibilityLabel="Go back" accessibilityRole="button">
          <Text style={{ fontFamily: typography.family.bold, fontSize: typography.size.title, color: colors.primary }}>←</Text>
        </TouchableOpacity>
        <Text style={{ fontFamily: typography.family.extraBold, fontSize: typography.size.xl, color: colors.textPrimary, flex: 1, marginLeft: spacing.md }}>
          Share session
        </Text>
        <TouchableOpacity
          onPress={finishAndNavigate}
          style={{
            width: 36,
            height: 36,
            borderRadius: 18,
            backgroundColor: colors.success,
            alignItems: 'center',
            justifyContent: 'center',
          }}
          accessibilityLabel="Finish session"
          accessibilityRole="button"
        >
          <Text style={{ fontSize: 18, color: WHITE }}>✓</Text>
        </TouchableOpacity>
      </View>

      {/* Card preview */}
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ViewShot
          ref={viewShotRef}
          options={{ format: 'png', quality: 1 }}
          style={{
            width: FINAL_CARD_WIDTH,
            height: CARD_HEIGHT,
            borderRadius: radius.lg,
            overflow: 'hidden',
          }}
        >
          {/* Background */}
          <View style={[StyleSheet.absoluteFillObject, { backgroundColor: BG }]} />
          {photoUri && (
            <Image source={{ uri: photoUri }} style={StyleSheet.absoluteFillObject} resizeMode="cover" />
          )}
          <View style={[StyleSheet.absoluteFillObject, { backgroundColor: photoUri ? 'rgba(0,0,0,0.5)' : 'transparent' }]} />

          {/* Red accent line */}
          <View style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, backgroundColor: RED }} />

          {/* Draggable: Workout name + date */}
          <Animated.View
            style={{
              position: 'absolute',
              left: 20,
              top: titleTop,
              right: 20,
              transform: titlePan.getTranslateTransform(),
            }}
            {...titlePanResponder.panHandlers}
          >
            <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 10, color: 'rgba(255,255,255,0.5)', letterSpacing: 2.5, textTransform: 'uppercase' }}>
              Session complete
            </Text>
            <Text style={{ fontFamily: 'Inter_800ExtraBold', fontSize: 30, color: WHITE, lineHeight: 34, marginTop: 4 }} numberOfLines={2}>
              {workoutName ?? 'Workout'}
            </Text>
            <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 12, color: 'rgba(255,255,255,0.45)', marginTop: 4 }}>
              {new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
            </Text>
          </Animated.View>

          {/* Draggable: Stats + PR badge + tagline */}
          <Animated.View
            style={{
              position: 'absolute',
              left: 20,
              top: statsTop,
              right: 20,
              transform: statsPan.getTranslateTransform(),
            }}
            {...statsPanResponder.panHandlers}
          >
            <View style={{ height: 1, backgroundColor: 'rgba(255,255,255,0.12)', marginBottom: 10 }} />
            <View style={{ flexDirection: 'row' }}>
              {[
                { label: 'Duration', value: `${durationMins ?? 0}m` },
                { label: 'Volume', value: volumeDisplay },
                { label: 'Sets', value: completedSets ?? '0' },
              ].map((stat, i) => (
                <View key={stat.label} style={{ flex: 1, alignItems: i === 0 ? 'flex-start' : i === 2 ? 'flex-end' : 'center' }}>
                  <Text style={{ fontFamily: 'Inter_800ExtraBold', fontSize: 22, color: WHITE }}>{stat.value}</Text>
                  <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 10, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: 1 }}>{stat.label}</Text>
                </View>
              ))}
            </View>
            <View style={{ height: 1, backgroundColor: 'rgba(255,255,255,0.12)', marginTop: 10 }} />

            {prs > 0 && (
              <View style={{
                flexDirection: 'row', alignItems: 'center', gap: 6,
                backgroundColor: `${RED}22`, borderRadius: 6,
                borderWidth: 1, borderColor: `${RED}60`,
                paddingVertical: 6, paddingHorizontal: 10,
                alignSelf: 'flex-start', marginTop: 10,
              }}>
                <Text style={{ fontSize: 14 }}>🏆</Text>
                <Text style={{ fontFamily: 'Inter_700Bold', fontSize: 12, color: RED }}>
                  {prs} new PR{prs > 1 ? 's' : ''} today
                </Text>
              </View>
            )}

            <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 9, color: 'rgba(255,255,255,0.2)', letterSpacing: 2, textTransform: 'uppercase', marginTop: 10 }}>
              Train smarter. Track harder.
            </Text>
          </Animated.View>
        </ViewShot>

        {/* Drag hint */}
        <Text style={{ fontFamily: typography.family.regular, fontSize: typography.size.xs, color: colors.textMuted, marginTop: spacing.sm }}>
          Drag blocks to reposition
        </Text>
      </View>

      {/* Photo + action row */}
      <View style={{ flexDirection: 'row', gap: spacing.sm, paddingHorizontal: spacing.base, paddingBottom: spacing.base }}>
        <TouchableOpacity
          onPress={() => Alert.alert('Add photo', undefined, [
            { text: 'Camera', onPress: takePhoto },
            { text: 'Library', onPress: pickPhoto },
            ...(photoUri ? [{ text: 'Remove photo', style: 'destructive' as const, onPress: () => setPhotoUri(null) }] : []),
            { text: 'Cancel', style: 'cancel' },
          ])}
          style={{ flex: 1, backgroundColor: colors.surface, borderRadius: radius.lg, paddingVertical: spacing.base, alignItems: 'center', borderWidth: 1, borderColor: photoUri ? colors.primary : colors.surface2 }}
          accessibilityLabel="Add background photo" accessibilityRole="button"
        >
          <Text style={{ fontFamily: typography.family.semiBold, fontSize: typography.size.body, color: photoUri ? colors.primary : colors.textMuted }}>
            {photoUri ? '📸 Change photo' : '📸 Add photo'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={handleShare}
          disabled={sharing}
          style={{ flex: 2, backgroundColor: RED, borderRadius: radius.lg, paddingVertical: spacing.base, alignItems: 'center' }}
          accessibilityLabel="Share" accessibilityRole="button"
        >
          {sharing
            ? <ActivityIndicator color={WHITE} />
            : <Text style={{ fontFamily: typography.family.extraBold, fontSize: typography.size.xl, color: WHITE }}>Share →</Text>
          }
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  )
}
