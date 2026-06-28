import React, { useState, useMemo, useEffect } from 'react'
import { View, Text, ScrollView, TouchableOpacity, Alert, Dimensions } from 'react-native'
import { Image } from 'expo-image'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { useTranslation } from 'react-i18next'
import { useTheme } from '@/theme/ThemeContext'
import { ScreenHeader } from '@/components/ScreenHeader'
import { KanjiWatermark } from '@/components/KanjiWatermark'
import { useProgressPhotosStore } from '@/stores/progressPhotosStore'
import type { PhotoAngle, ProgressPhoto } from '@/types/progressPhoto'
import { getAngleLabels } from '@/types/progressPhoto'

const SCREEN_WIDTH = Dimensions.get('window').width
const GRID_GAP = 4
const GRID_COLS = 3
const CELL_WIDTH = (SCREEN_WIDTH - 32 - GRID_GAP * (GRID_COLS - 1)) / GRID_COLS

type FilterAngle = PhotoAngle | 'all'

export default function EvolutionScreen() {
  const { tokens, fonts, label } = useTheme()
  const { t } = useTranslation()
  const ANGLE_LABELS = getAngleLabels(t)
  const photos = useProgressPhotosStore(s => s.photos)
  const isLoaded = useProgressPhotosStore(s => s.isLoaded)
  const removePhoto = useProgressPhotosStore(s => s.remove)
  const getOldest = useProgressPhotosStore(s => s.getOldest)
  const getNewest = useProgressPhotosStore(s => s.getNewest)
  const getDelta = useProgressPhotosStore(s => s.getDeltaSinceFirst)

  const [filter, setFilter] = useState<FilterAngle>('all')

  useEffect(() => {
    if (!isLoaded) useProgressPhotosStore.getState().load()
  }, [isLoaded])

  const handleAdd = () => {
    router.push('/profile/evolution/capture')
  }

  const handleDelete = (id: string) => {
    Alert.alert(
      t('evolution.deleteTitle'),
      t('evolution.deleteMessage'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        { text: t('common.delete'), style: 'destructive', onPress: () => removePhoto(id) },
      ],
    )
  }

  const filteredPhotos = useMemo(() => {
    const list = filter === 'all' ? photos : photos.filter(p => p.angle === filter)
    return [...list].sort((a, b) => b.takenAt.localeCompare(a.takenAt))
  }, [photos, filter])

  const groupedByMonth = useMemo(() => {
    const groups: { key: string; label: string; weightKg: number | null; photos: ProgressPhoto[] }[] = []
    const map = new Map<string, ProgressPhoto[]>()

    for (const p of filteredPhotos) {
      const key = p.takenAt.slice(0, 7)
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(p)
    }

    for (const [key, monthPhotos] of map) {
      const d = new Date(key + '-01T00:00:00')
      const monthLabel = d.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }).toUpperCase()
      const latestWithWeight = monthPhotos.find(p => p.weightKgSnapshot != null)
      groups.push({
        key,
        label: monthLabel,
        weightKg: latestWithWeight?.weightKgSnapshot ?? null,
        photos: monthPhotos,
      })
    }

    return groups
  }, [filteredPhotos])

  const oldest = getOldest()
  const newest = getNewest()
  const delta = getDelta()

  const filters: { key: FilterAngle; label: string }[] = [
    { key: 'all', label: t('evolution.filterAll') },
    { key: 'front', label: ANGLE_LABELS.front },
    { key: 'side', label: ANGLE_LABELS.side },
    { key: 'back', label: ANGLE_LABELS.back },
  ]

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: tokens.bg }} edges={['top']}>
      <KanjiWatermark char="鍛" />
      <ScreenHeader
        title={t('evolution.title')}
        right={
          <TouchableOpacity onPress={handleAdd} accessibilityRole="button">
            <Text style={{ fontFamily: fonts.sansB, fontSize: 12, letterSpacing: 1, textTransform: 'uppercase', color: tokens.accent }}>
              {t('evolution.add')}
            </Text>
          </TouchableOpacity>
        }
      />

      {photos.length === 0 ? (
        <View style={{ flex: 1, justifyContent: 'space-between' }}>
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 }}>
            <Text style={{ fontFamily: fonts.sansM, fontSize: 14, color: tokens.text, textAlign: 'center' }}>
              {t('evolution.emptyTitle')}
            </Text>
            <Text style={{ fontFamily: fonts.sans, fontSize: 12, color: tokens.textMute, textAlign: 'center', marginTop: 8 }}>
              {t('evolution.emptyDesc')}
            </Text>
          </View>
          <ConsentFooter />
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 100 }}>
          {/* Stats strip */}
          <View style={{ flexDirection: 'row', borderWidth: 1, borderColor: tokens.border, marginBottom: 12 }}>
            <View style={{ flex: 1, alignItems: 'center', paddingVertical: 10, borderRightWidth: 1, borderRightColor: tokens.border }}>
              <Text style={{ fontFamily: fonts.sansX, fontSize: 22, color: tokens.text }}>
                {photos.length}
              </Text>
              <Text style={{ fontFamily: fonts.sansM, fontSize: 9, letterSpacing: 1.5, textTransform: 'uppercase', color: tokens.textMute, marginTop: 2 }}>
                {t('evolution.statsPhotos')}
              </Text>
            </View>
            <View style={{ flex: 1, alignItems: 'center', paddingVertical: 10 }}>
              <Text style={{ fontFamily: fonts.sansX, fontSize: 22, color: delta.kg != null ? tokens.accent : tokens.text }}>
                {delta.kg != null ? `${delta.kg > 0 ? '+' : ''}${String(delta.kg).replace('.', ',')} kg` : '—'}
              </Text>
              <Text style={{ fontFamily: fonts.sansM, fontSize: 9, letterSpacing: 1.5, textTransform: 'uppercase', color: tokens.textMute, marginTop: 2 }}>
                {t('evolution.statsDelta')}
              </Text>
            </View>
          </View>

          {/* Compare CTA */}
          {photos.length >= 2 && oldest && newest ? (
            <TouchableOpacity
              onPress={() => router.push('/profile/evolution/compare')}
              style={{
                borderWidth: 1, borderColor: tokens.accent, padding: 13,
                flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16,
              }}
              accessibilityRole="button"
            >
              <View style={{ flexDirection: 'row', gap: 3 }}>
                <Image source={{ uri: oldest.uri }} style={{ width: 32, aspectRatio: 3 / 4 }} contentFit="cover" />
                <Image source={{ uri: newest.uri }} style={{ width: 32, aspectRatio: 3 / 4 }} contentFit="cover" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: fonts.sansB, fontSize: 13, letterSpacing: 0.3, color: tokens.text }}>
                  {t('evolution.compareCta')}
                </Text>
                <Text style={{ fontFamily: fonts.sans, fontSize: 11, color: tokens.textDim }}>
                  {t('evolution.compareDesc')}
                </Text>
              </View>
              <Text style={{ fontFamily: fonts.sansB, fontSize: 16, color: tokens.accent }}>›</Text>
            </TouchableOpacity>
          ) : photos.length === 1 ? (
            <Text style={{ fontFamily: fonts.sans, fontSize: 12, color: tokens.textDim, marginBottom: 16 }}>
              {t('evolution.compareHint')}
            </Text>
          ) : null}

          {/* Angle filter pills */}
          <View style={{ flexDirection: 'row', gap: 6, marginBottom: 16 }}>
            {filters.map((f) => {
              const isActive = filter === f.key
              return (
                <TouchableOpacity
                  key={f.key}
                  onPress={() => setFilter(f.key)}
                  style={{
                    paddingVertical: 6, paddingHorizontal: 12,
                    backgroundColor: isActive ? tokens.accent : 'transparent',
                    borderWidth: 1,
                    borderColor: isActive ? tokens.accent : tokens.border,
                  }}
                  accessibilityRole="button"
                >
                  <Text style={{
                    fontFamily: fonts.sansB, fontSize: 10, letterSpacing: 1,
                    textTransform: 'uppercase',
                    color: isActive ? '#FFFFFF' : tokens.textDim,
                  }}>
                    {f.label}
                  </Text>
                </TouchableOpacity>
              )
            })}
          </View>

          {/* Photo grid by month */}
          {groupedByMonth.map((group) => (
            <View key={group.key} style={{ marginBottom: 20 }}>
              <Text style={{ ...label.sm, color: tokens.textMute, marginBottom: 8 }}>
                {group.label}{group.weightKg != null ? ` · ${String(group.weightKg).replace('.', ',')} kg` : ''}
              </Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: GRID_GAP }}>
                {group.photos.map((photo) => {
                  const d = new Date(photo.takenAt)
                  const dayLabel = `${String(d.getDate()).padStart(2, '0')} ${d.toLocaleDateString('fr-FR', { month: 'short' }).replace('.', '').toUpperCase()}`
                  return (
                    <TouchableOpacity
                      key={photo.id}
                      onPress={() => router.push(`/profile/evolution/${photo.id}`)}
                      onLongPress={() => handleDelete(photo.id)}
                      delayLongPress={500}
                      style={{ width: CELL_WIDTH, aspectRatio: 3 / 4, position: 'relative' }}
                    >
                      <Image
                        source={{ uri: photo.uri }}
                        style={{ width: '100%', height: '100%' }}
                        contentFit="cover"
                      />
                      {/* Angle tag */}
                      <View style={{ position: 'absolute', top: 4, left: 4, backgroundColor: tokens.accent, paddingHorizontal: 4, paddingVertical: 2 }}>
                        <Text style={{ fontFamily: fonts.sansB, fontSize: 7, letterSpacing: 0.8, color: '#FFFFFF', textTransform: 'uppercase' }}>
                          {ANGLE_LABELS[photo.angle]}
                        </Text>
                      </View>
                      {/* Date overlay */}
                      <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, paddingVertical: 3, paddingHorizontal: 4, backgroundColor: 'rgba(0,0,0,0.5)' }}>
                        <Text style={{ fontFamily: fonts.sansB, fontSize: 8, color: '#FFFFFF', letterSpacing: 0.5 }}>
                          {dayLabel}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  )
                })}
              </View>
            </View>
          ))}

          <ConsentFooter />
        </ScrollView>
      )}

    </SafeAreaView>
  )
}

function ConsentFooter() {
  const { tokens, fonts } = useTheme()
  const { t } = useTranslation()

  const points = [
    t('evolution.consentLocal'),
    t('evolution.consentNeverSent'),
    t('evolution.consentLostOnUninstall'),
    t('evolution.consentDeletable'),
  ]

  return (
    <View style={{ padding: 16, gap: 6, paddingBottom: 24 }}>
      {points.map((point, i) => (
        <View key={i} style={{ flexDirection: 'row', gap: 8, alignItems: 'flex-start' }}>
          <View style={{ width: 4, height: 4, backgroundColor: tokens.textGhost, marginTop: 5, borderRadius: 2 }} />
          <Text style={{ fontFamily: fonts.sans, fontSize: 11, color: tokens.textGhost, lineHeight: 16, flex: 1 }}>
            {point}
          </Text>
        </View>
      ))}
    </View>
  )
}
