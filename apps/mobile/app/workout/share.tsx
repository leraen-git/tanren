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
import ViewShot, { type CaptureOptions } from 'react-native-view-shot'

const ViewShotCompat = ViewShot as unknown as React.ComponentType<
  { options?: CaptureOptions; style?: import('react-native').StyleProp<import('react-native').ViewStyle>; children?: React.ReactNode } & React.RefAttributes<ViewShot>
>
import * as ImagePicker from 'expo-image-picker'
import * as Sharing from 'expo-sharing'
import { useTranslation } from 'react-i18next'
import { useTheme } from '@/theme/ThemeContext'
import { useActiveSessionStore } from '@/stores/activeSessionStore'

const CARD_RATIO = 9 / 16

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
  const { tokens, fonts } = useTheme()
  const { t } = useTranslation()
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

  const HORIZONTAL_PAD = 32
  const CARD_WIDTH = screenWidth - HORIZONTAL_PAD * 2
  const maxCardHeight = screenHeight - 220
  const naturalCardHeight = CARD_WIDTH / CARD_RATIO
  const CARD_HEIGHT = Math.min(naturalCardHeight, maxCardHeight)
  const FINAL_CARD_WIDTH = CARD_HEIGHT === maxCardHeight ? CARD_HEIGHT * CARD_RATIO : CARD_WIDTH

  const titlePan = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current
  const statsPan = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current
  const titlePanResponder = useRef(makePanResponder(titlePan)).current
  const statsPanResponder = useRef(makePanResponder(statsPan)).current

  const viewShotRef = useRef<ViewShot>(null)
  const [photoUri, setPhotoUri] = useState<string | null>(null)
  const [sharing, setSharing] = useState(false)

  const finishAndNavigate = () => {
    finishSession()
    router.replace('/')
  }

  const pickPhoto = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (status !== 'granted') {
      Alert.alert(t('share.permissionNeeded'), t('share.allowPhotoAccess'))
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
      Alert.alert(t('share.permissionNeeded'), t('share.allowCameraAccess'))
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
    if (!uri) { Alert.alert(t('common.error'), t('share.captureError')); return }
    const available = await Sharing.isAvailableAsync()
    if (!available) { Alert.alert(t('share.sharingUnavailable')); return }
    await Sharing.shareAsync(uri, { mimeType: 'image/png', dialogTitle: 'Share your session' })
  }

  const prs = parseInt(prCount ?? '0', 10)
  const volume = parseFloat(totalVolume ?? '0')
  const volumeDisplay = volume >= 1000
    ? `${Math.round(volume).toLocaleString('fr-FR')}`
    : `${Math.round(volume)}`

  const durationDisplay = `${durationMins ?? 0}min`
  const dateDisplay = new Date().toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: tokens.bg }}>
      {/* Header */}
      <View style={{ alignItems: 'center', paddingVertical: 12 }}>
        <Text style={{
          fontFamily: fonts.sansB,
          fontSize: 10,
          letterSpacing: 3,
          color: tokens.textMute,
          textTransform: 'uppercase',
          marginBottom: 4,
        }}>
          {t('share.preview916')}
        </Text>
        <Text style={{
          fontFamily: fonts.sansX,
          fontSize: 16,
          letterSpacing: 0.6,
          color: tokens.text,
          textTransform: 'uppercase',
        }}>
          {t('share.title')}
        </Text>
      </View>

      {/* Toolbar */}
      <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 6, marginBottom: 12, paddingHorizontal: 16 }}>
        <TouchableOpacity
          onPress={pickPhoto}
          style={{
            paddingVertical: 8,
            paddingHorizontal: 12,
            backgroundColor: photoUri ? tokens.accent : tokens.surface1,
            borderWidth: 1,
            borderColor: photoUri ? tokens.accent : tokens.borderStrong,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 5,
          }}
          accessibilityLabel={t('share.addPhoto')}
          accessibilityRole="button"
        >
          <Text style={{
            fontFamily: fonts.sansB,
            fontSize: 9,
            letterSpacing: 1.4,
            textTransform: 'uppercase',
            color: photoUri ? '#FFFFFF' : tokens.text,
          }}>
            {t('share.photoTool')}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={takePhoto}
          style={{
            paddingVertical: 8,
            paddingHorizontal: 12,
            backgroundColor: tokens.surface1,
            borderWidth: 1,
            borderColor: tokens.borderStrong,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 5,
          }}
          accessibilityLabel={t('share.camera')}
          accessibilityRole="button"
        >
          <Text style={{
            fontFamily: fonts.sansB,
            fontSize: 9,
            letterSpacing: 1.4,
            textTransform: 'uppercase',
            color: tokens.text,
          }}>
            {t('share.cameraTool')}
          </Text>
        </TouchableOpacity>
        {photoUri && (
          <TouchableOpacity
            onPress={() => setPhotoUri(null)}
            style={{
              paddingVertical: 8,
              paddingHorizontal: 12,
              backgroundColor: tokens.surface1,
              borderWidth: 1,
              borderColor: tokens.borderStrong,
            }}
            accessibilityLabel={t('share.removePhoto')}
            accessibilityRole="button"
          >
            <Text style={{
              fontFamily: fonts.sansB,
              fontSize: 9,
              letterSpacing: 1.4,
              textTransform: 'uppercase',
              color: tokens.text,
            }}>
              {t('share.removeTool')}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Card preview */}
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ViewShotCompat
          ref={viewShotRef}
          options={{ format: 'png', quality: 1 }}
          style={{
            width: FINAL_CARD_WIDTH,
            height: CARD_HEIGHT,
            overflow: 'hidden',
            borderWidth: 1,
            borderColor: tokens.borderStrong,
          }}
        >
          {/* Background: dark default or photo with gradient */}
          <View style={[StyleSheet.absoluteFillObject, { backgroundColor: '#111111' }]} />
          {photoUri && (
            <Image source={{ uri: photoUri }} style={StyleSheet.absoluteFillObject} resizeMode="cover" />
          )}
          {/* Gradient overlay: transparent top → 55% black bottom */}
          <View style={[StyleSheet.absoluteFillObject, {
            // Simulated gradient with two layers
          }]}>
            <View style={{ flex: 1, backgroundColor: photoUri ? 'rgba(0,0,0,0.15)' : 'transparent' }} />
            <View style={{ flex: 1, backgroundColor: photoUri ? 'rgba(0,0,0,0.55)' : 'transparent' }} />
          </View>

          {/* Draggable: TOP — kanji + workout name + date */}
          <Animated.View
            style={{
              position: 'absolute',
              top: 16,
              left: 16,
              right: 16,
              transform: titlePan.getTranslateTransform(),
            }}
            {...titlePanResponder.panHandlers}
          >
            <Text style={{
              fontFamily: fonts.jpX,
              fontSize: 11,
              color: tokens.accent,
              letterSpacing: 4,
              lineHeight: 14,
              marginBottom: 6,
            }}>
              鍛 錬
            </Text>
            <Text
              style={{
                fontFamily: fonts.sansX,
                fontSize: 22,
                letterSpacing: 0.4,
                textTransform: 'uppercase',
                lineHeight: 22,
                color: '#FFFFFF',
                maxWidth: '90%',
              }}
              numberOfLines={2}
            >
              {workoutName ?? 'Workout'}
            </Text>
            <Text style={{
              fontFamily: fonts.sansM,
              fontSize: 9,
              letterSpacing: 2,
              color: 'rgba(255,255,255,0.7)',
              textTransform: 'uppercase',
              marginTop: 4,
            }}>
              {dateDisplay} · {durationDisplay}
            </Text>
          </Animated.View>

          {/* Draggable: BOTTOM — stats line + brand */}
          <Animated.View
            style={{
              position: 'absolute',
              bottom: 16,
              left: 16,
              right: 16,
              transform: statsPan.getTranslateTransform(),
            }}
            {...statsPanResponder.panHandlers}
          >
            {/* Stats row */}
            <View style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'flex-end',
              paddingBottom: 8,
              borderBottomWidth: 1,
              borderBottomColor: 'rgba(255,255,255,0.25)',
            }}>
              <View>
                <Text style={{
                  fontFamily: fonts.sansB,
                  fontSize: 7,
                  letterSpacing: 2.5,
                  color: 'rgba(255,255,255,0.7)',
                  textTransform: 'uppercase',
                  marginBottom: 2,
                }}>
                  {t('share.volume')}
                </Text>
                <Text style={{ fontFamily: fonts.sansX, fontSize: 15, color: '#FFFFFF', lineHeight: 16 }}>
                  {volumeDisplay}
                  <Text style={{ fontFamily: fonts.sansM, fontSize: 9, color: 'rgba(255,255,255,0.7)' }}> kg</Text>
                </Text>
              </View>
              <View>
                <Text style={{
                  fontFamily: fonts.sansB,
                  fontSize: 7,
                  letterSpacing: 2.5,
                  color: 'rgba(255,255,255,0.7)',
                  textTransform: 'uppercase',
                  marginBottom: 2,
                }}>
                  {t('share.sets')}
                </Text>
                <Text style={{ fontFamily: fonts.sansX, fontSize: 15, color: '#FFFFFF', lineHeight: 16 }}>
                  {completedSets ?? '0'}
                </Text>
              </View>
              {prs > 0 && (
                <View>
                  <Text style={{
                    fontFamily: fonts.sansB,
                    fontSize: 7,
                    letterSpacing: 2.5,
                    color: 'rgba(255,255,255,0.7)',
                    textTransform: 'uppercase',
                    marginBottom: 2,
                  }}>
                    {t('share.records')}
                  </Text>
                  <Text style={{ fontFamily: fonts.sansX, fontSize: 15, color: tokens.accent, lineHeight: 16 }}>
                    {prs}
                  </Text>
                </View>
              )}
            </View>

            {/* Brand line */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
              <Text style={{
                fontFamily: fonts.sansX,
                fontSize: 10,
                letterSpacing: 3,
                color: '#FFFFFF',
              }}>
                TANREN
              </Text>
              <Text style={{
                fontFamily: fonts.sansM,
                fontSize: 8,
                letterSpacing: 2,
                color: 'rgba(255,255,255,0.5)',
              }}>
                tanren.app
              </Text>
            </View>
          </Animated.View>
        </ViewShotCompat>

        {/* Drag hint */}
        <Text style={{
          fontFamily: fonts.sans,
          fontSize: 10,
          color: tokens.textGhost,
          marginTop: 8,
        }}>
          {t('share.dragHint')}
        </Text>
      </View>

      {/* Action buttons */}
      <View style={{ paddingHorizontal: 16, paddingBottom: 16, gap: 6 }}>
        <TouchableOpacity
          onPress={handleShare}
          disabled={sharing}
          style={{
            height: 44,
            backgroundColor: tokens.accent,
            alignItems: 'center',
            justifyContent: 'center',
          }}
          accessibilityLabel={t('share.share')}
          accessibilityRole="button"
        >
          {sharing
            ? <ActivityIndicator color="#FFFFFF" />
            : <Text style={{
                fontFamily: fonts.sansB,
                fontSize: 14,
                letterSpacing: 0.6,
                textTransform: 'uppercase',
                color: '#FFFFFF',
              }}>
                {t('share.share')}
              </Text>
          }
        </TouchableOpacity>
        <TouchableOpacity
          onPress={finishAndNavigate}
          style={{
            height: 44,
            alignItems: 'center',
            justifyContent: 'center',
          }}
          accessibilityLabel={t('share.finishWithoutSharing')}
          accessibilityRole="button"
        >
          <Text style={{
            fontFamily: fonts.sansB,
            fontSize: 14,
            letterSpacing: 0.6,
            textTransform: 'uppercase',
            color: tokens.textMute,
          }}>
            {t('share.finishWithoutSharing')}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  )
}
