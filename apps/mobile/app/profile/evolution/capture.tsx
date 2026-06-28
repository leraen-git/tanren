import React, { useState, useEffect } from 'react'
import { View, Text, ScrollView, TouchableOpacity, TextInput, Alert, Modal } from 'react-native'
import { Image } from 'expo-image'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router, useLocalSearchParams } from 'expo-router'
import * as ImagePicker from 'expo-image-picker'
import { useTranslation } from 'react-i18next'
import { useTheme } from '@/theme/ThemeContext'
import { ScreenHeader } from '@/components/ScreenHeader'
import { Button } from '@/components/Button'
import { useProgressPhotosStore } from '@/stores/progressPhotosStore'
import { useToastStore } from '@/stores/toastStore'
import { trpc } from '@/lib/trpc'
import type { PhotoAngle } from '@/types/progressPhoto'
import { getAngleLabels } from '@/types/progressPhoto'

type Step = 'source' | 'confirm'

export default function CaptureScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>()
  const isEdit = !!id
  const { tokens, fonts, label: labelPreset } = useTheme()
  const { t } = useTranslation()
  const ANGLE_LABELS = getAngleLabels(t)
  const showToast = useToastStore(s => s.show)

  const photos = useProgressPhotosStore(s => s.photos)
  const addPhoto = useProgressPhotosStore(s => s.add)
  const updateNotes = useProgressPhotosStore(s => s.updateNotes)

  const existingPhoto = isEdit ? photos.find(p => p.id === id) : null

  const [step, setStep] = useState<Step>(() => {
    if (isEdit) return 'confirm'
    return 'source'
  })

  const [pickedUri, setPickedUri] = useState<string | null>(existingPhoto?.uri ?? null)
  const [angle, setAngle] = useState<PhotoAngle>(existingPhoto?.angle ?? 'front')
  const [weight, setWeight] = useState('')
  const [notes, setNotes] = useState(existingPhoto?.notes ?? '')
  const [takenAt, setTakenAt] = useState<Date>(() => existingPhoto ? new Date(existingPhoto.takenAt) : new Date())
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [saving, setSaving] = useState(false)

  const { data: weightData } = trpc.weight.list.useQuery({ period: '30d' })
  const latestWeight = weightData?.entries?.[0]?.weightKg ?? null

  useEffect(() => {
    if (isEdit && existingPhoto) {
      setWeight(existingPhoto.weightKgSnapshot != null ? String(existingPhoto.weightKgSnapshot) : '')
      setNotes(existingPhoto.notes ?? '')
      setAngle(existingPhoto.angle)
      setPickedUri(existingPhoto.uri)
      setTakenAt(new Date(existingPhoto.takenAt))
    } else if (!isEdit) {
      setWeight(latestWeight != null ? String(latestWeight) : '')
    }
  }, [isEdit, existingPhoto?.id, latestWeight])

  const handleCamera = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync()
    if (status !== 'granted') {
      Alert.alert(t('evolution.permissionNeeded'), t('evolution.cameraPermission'))
      return
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      quality: 0.85,
      allowsEditing: true,
      aspect: [3, 4],
    })
    if (!result.canceled && result.assets[0]) {
      setPickedUri(result.assets[0].uri)
      setStep('confirm')
    }
  }

  const handleGallery = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (status !== 'granted') {
      Alert.alert(t('evolution.permissionNeeded'), t('evolution.galleryPermission'))
      return
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.85,
      allowsEditing: true,
      aspect: [3, 4],
    })
    if (!result.canceled && result.assets[0]) {
      setPickedUri(result.assets[0].uri)
      setStep('confirm')
    }
  }

  const handleSave = async () => {
    if (!pickedUri) return
    setSaving(true)
    try {
      const weightNum = weight.trim() ? parseFloat(weight.replace(',', '.')) : null
      const validWeight = weightNum != null && !isNaN(weightNum) ? weightNum : null

      if (isEdit && existingPhoto) {
        const samePhoto = pickedUri === existingPhoto.uri
        if (samePhoto) {
          const all = await (await import('@/lib/progressPhotos')).progressPhotos.list()
          const idx = all.findIndex(p => p.id === existingPhoto.id)
          if (idx !== -1) {
            const updated = [...all]
            updated[idx] = { ...all[idx]!, angle, weightKgSnapshot: validWeight, notes: notes.trim() || null, takenAt: takenAt.toISOString() }
            const { storage } = await import('@/lib/storage')
            storage.set('progress-photos-v1', JSON.stringify(updated))
            useProgressPhotosStore.setState({ photos: updated })
          }
        } else {
          const store = useProgressPhotosStore.getState()
          await store.add({
            sourceUri: pickedUri,
            angle,
            weightKgSnapshot: validWeight,
            takenAt: takenAt.toISOString(),
            notes: notes.trim() || undefined,
          })
          await store.remove(existingPhoto.id)
        }
      } else {
        await addPhoto({
          sourceUri: pickedUri,
          angle,
          weightKgSnapshot: validWeight,
          takenAt: takenAt.toISOString(),
          notes: notes.trim() || undefined,
        })
      }
      router.back()
    } catch {
      showToast(t('common.error'), 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleRetake = () => {
    setPickedUri(null)
    setStep('source')
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: tokens.bg }} edges={['top']}>
      <ScreenHeader title={isEdit ? t('evolution.editTitle') : t('evolution.captureTitle')} />

      {step === 'source' && (
        <View style={{ flex: 1, justifyContent: 'space-between' }}>
          <View style={{ padding: 24, gap: 12 }}>
            <Text style={{ fontFamily: fonts.sans, fontSize: 13, color: tokens.textMute, textAlign: 'center', marginBottom: 4 }}>
              {t('evolution.chooseSource')}
            </Text>
            <TouchableOpacity
              onPress={handleCamera}
              style={{
                flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                paddingVertical: 18, paddingHorizontal: 16,
                borderWidth: 1, borderColor: tokens.border,
              }}
              accessibilityRole="button"
            >
              <Text style={{ fontFamily: fonts.sansM, fontSize: 15, color: tokens.text }}>
                {t('evolution.takePhoto')}
              </Text>
              <Text style={{ fontFamily: fonts.sansB, fontSize: 18, color: tokens.accent }}>›</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleGallery}
              style={{
                flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                paddingVertical: 18, paddingHorizontal: 16,
                borderWidth: 1, borderColor: tokens.border,
              }}
              accessibilityRole="button"
            >
              <Text style={{ fontFamily: fonts.sansM, fontSize: 15, color: tokens.text }}>
                {t('evolution.fromGallery')}
              </Text>
              <Text style={{ fontFamily: fonts.sansB, fontSize: 18, color: tokens.accent }}>›</Text>
            </TouchableOpacity>
          </View>

          <View style={{ padding: 24, gap: 6, paddingBottom: 32, alignItems: 'center' }}>
            {[
              t('evolution.consentLocal'),
              t('evolution.consentNeverSent'),
              t('evolution.consentLostOnUninstall'),
              t('evolution.consentDeletable'),
            ].map((point, i) => (
              <Text key={i} style={{ fontFamily: fonts.sans, fontSize: 11, color: tokens.textGhost, lineHeight: 16, textAlign: 'center' }}>
                {point}
              </Text>
            ))}
          </View>
        </View>
      )}

      {step === 'confirm' && pickedUri && (
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 120, gap: 16 }}>
          {/* Photo preview */}
          <Image
            source={{ uri: pickedUri }}
            style={{ width: '100%', aspectRatio: 3 / 4 }}
            contentFit="cover"
          />

          {/* Angle selector */}
          <View style={{ gap: 8 }}>
            <Text style={{ ...labelPreset.sm, color: tokens.textMute }}>
              ANGLE
            </Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {(['front', 'side', 'back'] as PhotoAngle[]).map((a) => {
                const isActive = angle === a
                return (
                  <TouchableOpacity
                    key={a}
                    onPress={() => setAngle(a)}
                    style={{
                      flex: 1, paddingVertical: 12, alignItems: 'center',
                      backgroundColor: isActive ? tokens.accent : 'transparent',
                      borderWidth: 1,
                      borderColor: isActive ? tokens.accent : tokens.border,
                    }}
                    accessibilityRole="button"
                  >
                    <Text style={{
                      fontFamily: fonts.sansB, fontSize: 12, letterSpacing: 1,
                      textTransform: 'uppercase',
                      color: isActive ? '#FFFFFF' : tokens.textDim,
                    }}>
                      {ANGLE_LABELS[a]}
                    </Text>
                  </TouchableOpacity>
                )
              })}
            </View>
          </View>

          {/* Date */}
          <View style={{ gap: 6 }}>
            <Text style={{ ...labelPreset.sm, color: tokens.textMute }}>
              DATE
            </Text>
            <TouchableOpacity
              onPress={() => setShowDatePicker(true)}
              style={{ flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: tokens.borderStrong, paddingVertical: 10 }}
            >
              <Text style={{ flex: 1, fontFamily: fonts.mono, fontSize: 15, color: tokens.text }}>
                {takenAt.toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })}
              </Text>
              <Text style={{ fontFamily: fonts.sansB, fontSize: 14, color: tokens.accent }}>›</Text>
            </TouchableOpacity>
            {showDatePicker && (
              <Modal transparent animationType="fade">
                <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.6)' }}>
                  <TouchableOpacity activeOpacity={1} onPress={() => setShowDatePicker(false)} style={{ flex: 1 }} />
                  <CalendarPicker
                    value={takenAt}
                    max={new Date()}
                    onSelect={(d) => { setTakenAt(d); setShowDatePicker(false) }}
                    onClose={() => setShowDatePicker(false)}
                    tokens={tokens}
                    fonts={fonts}
                  />
                </View>
              </Modal>
            )}
          </View>

          {/* Weight */}
          <View style={{ gap: 6 }}>
            <Text style={{ ...labelPreset.sm, color: tokens.textMute }}>
              {t('evolution.weight')}
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: tokens.borderStrong }}>
              <TextInput
                value={weight}
                onChangeText={setWeight}
                keyboardType="decimal-pad"
                placeholder="—"
                placeholderTextColor={tokens.textGhost}
                style={{ flex: 1, fontFamily: fonts.mono, fontSize: 15, color: tokens.text, paddingVertical: 10 }}
              />
              <Text style={{ fontFamily: fonts.mono, fontSize: 12, color: tokens.textMute }}>kg</Text>
            </View>
          </View>

          {/* Notes */}
          <View style={{ gap: 6 }}>
            <Text style={{ ...labelPreset.sm, color: tokens.textMute }}>
              {t('evolution.notes')}
            </Text>
            <TextInput
              value={notes}
              onChangeText={(v) => setNotes(v.slice(0, 200))}
              placeholder={t('evolution.notesPlaceholder')}
              placeholderTextColor={tokens.textGhost}
              multiline
              style={{
                fontFamily: fonts.sans, fontSize: 14, color: tokens.text,
                borderWidth: 1, borderColor: tokens.border, padding: 12,
                minHeight: 60, textAlignVertical: 'top',
              }}
            />
            <Text style={{ fontFamily: fonts.mono, fontSize: 9, color: tokens.textGhost, textAlign: 'right' }}>
              {notes.length}/200
            </Text>
          </View>

          {/* Change photo */}
          {!isEdit && (
            <TouchableOpacity onPress={handleRetake} style={{ alignItems: 'center', paddingVertical: 8 }}>
              <Text style={{ fontFamily: fonts.sansM, fontSize: 12, color: tokens.textMute }}>
                {t('evolution.retake')}
              </Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      )}

      {/* Bottom save button */}
      {step === 'confirm' && pickedUri && (
        <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: tokens.bg, padding: 16, paddingBottom: 32, borderTopWidth: 1, borderTopColor: tokens.border }}>
          <Button label={t('common.save')} onPress={handleSave} loading={saving} />
        </View>
      )}
    </SafeAreaView>
  )
}

const MONTH_NAMES_FR = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre']
const DAY_HEADERS = ['L', 'M', 'M', 'J', 'V', 'S', 'D']

function CalendarPicker({ value, max, onSelect, onClose, tokens, fonts }: {
  value: Date
  max: Date
  onSelect: (d: Date) => void
  onClose: () => void
  tokens: any
  fonts: any
}) {
  const [viewYear, setViewYear] = useState(value.getFullYear())
  const [viewMonth, setViewMonth] = useState(value.getMonth())

  const today = new Date()
  const maxDate = new Date(Math.min(max.getTime(), today.getTime()))

  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate()
  const firstDayOfWeek = (new Date(viewYear, viewMonth, 1).getDay() + 6) % 7

  const canGoNext = viewYear < maxDate.getFullYear() || (viewYear === maxDate.getFullYear() && viewMonth < maxDate.getMonth())
  const canGoPrev = viewYear > 2020

  const cells: (number | null)[] = []
  for (let i = 0; i < firstDayOfWeek; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)

  const isSelected = (day: number) =>
    day === value.getDate() && viewMonth === value.getMonth() && viewYear === value.getFullYear()

  const isDisabled = (day: number) => {
    const d = new Date(viewYear, viewMonth, day)
    return d > maxDate
  }

  return (
    <View style={{ backgroundColor: '#1C1C1E', paddingBottom: 40 }}>
      {/* Month/year nav */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, paddingBottom: 8 }}>
        <TouchableOpacity
          onPress={() => {
            if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1) }
            else setViewMonth(m => m - 1)
          }}
          disabled={!canGoPrev}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Text style={{ fontFamily: fonts.sansB, fontSize: 20, color: canGoPrev ? '#FFFFFF' : '#555555' }}>‹</Text>
        </TouchableOpacity>
        <Text style={{ fontFamily: fonts.sansB, fontSize: 16, color: '#FFFFFF', textTransform: 'uppercase', letterSpacing: 1 }}>
          {MONTH_NAMES_FR[viewMonth]} {viewYear}
        </Text>
        <TouchableOpacity
          onPress={() => {
            if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1) }
            else setViewMonth(m => m + 1)
          }}
          disabled={!canGoNext}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Text style={{ fontFamily: fonts.sansB, fontSize: 20, color: canGoNext ? '#FFFFFF' : '#555555' }}>›</Text>
        </TouchableOpacity>
      </View>

      {/* Day headers */}
      <View style={{ flexDirection: 'row', paddingHorizontal: 16 }}>
        {DAY_HEADERS.map((h, i) => (
          <View key={i} style={{ flex: 1, alignItems: 'center', paddingVertical: 8 }}>
            <Text style={{ fontFamily: fonts.sansB, fontSize: 11, color: '#888888', letterSpacing: 1 }}>{h}</Text>
          </View>
        ))}
      </View>

      {/* Day grid */}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 16 }}>
        {cells.map((day, i) => {
          if (day == null) return <View key={`e${i}`} style={{ width: '14.285%', aspectRatio: 1 }} />
          const selected = isSelected(day)
          const disabled = isDisabled(day)
          return (
            <TouchableOpacity
              key={day}
              onPress={() => !disabled && onSelect(new Date(viewYear, viewMonth, day))}
              disabled={disabled}
              style={{
                width: '14.285%', aspectRatio: 1,
                alignItems: 'center', justifyContent: 'center',
              }}
            >
              <View style={{
                width: 36, height: 36, alignItems: 'center', justifyContent: 'center',
                backgroundColor: selected ? tokens.accent : 'transparent',
              }}>
                <Text style={{
                  fontFamily: selected ? fonts.sansB : fonts.sans,
                  fontSize: 15,
                  color: disabled ? '#444444' : selected ? '#FFFFFF' : '#FFFFFF',
                }}>
                  {day}
                </Text>
              </View>
            </TouchableOpacity>
          )
        })}
      </View>
    </View>
  )
}
