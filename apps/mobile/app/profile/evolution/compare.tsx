import React, { useState, useRef } from 'react'
import { View, Text, ScrollView, TouchableOpacity, Dimensions } from 'react-native'
import { Image } from 'expo-image'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router, useLocalSearchParams } from 'expo-router'
import { useTranslation } from 'react-i18next'
import { useTheme } from '@/theme/ThemeContext'
import { ScreenHeader } from '@/components/ScreenHeader'
import { KanjiWatermark } from '@/components/KanjiWatermark'
import { Button } from '@/components/Button'
import { BottomSheetShell } from '@/components/BottomSheetShell'
import { useProgressPhotosStore } from '@/stores/progressPhotosStore'
import { useToastStore } from '@/stores/toastStore'
import { getAngleLabels } from '@/types/progressPhoto'
import type { ProgressPhoto } from '@/types/progressPhoto'
import { captureRef } from 'react-native-view-shot'
import * as Sharing from 'expo-sharing'

const SCREEN_WIDTH = Dimensions.get('window').width

export default function CompareScreen() {
  const params = useLocalSearchParams<{ before?: string; after?: string }>()
  const { tokens, fonts, label } = useTheme()
  const { t, i18n } = useTranslation()
  const showToast = useToastStore(s => s.show)

  const ANGLE_LABELS = getAngleLabels(t)
  const photos = useProgressPhotosStore(s => s.photos)
  const getOldest = useProgressPhotosStore(s => s.getOldest)
  const getNewest = useProgressPhotosStore(s => s.getNewest)

  const [beforeId, setBeforeId] = useState(params.before ?? getOldest()?.id ?? '')
  const [afterId, setAfterId] = useState(params.after ?? getNewest()?.id ?? '')
  const [pickerTarget, setPickerTarget] = useState<'before' | 'after' | null>(null)
  const [sharing, setSharing] = useState(false)

  const shareCardRef = useRef<View>(null)

  const before = photos.find(p => p.id === beforeId) ?? null
  const after = photos.find(p => p.id === afterId) ?? null

  if (!before || !after) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: tokens.bg, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ fontFamily: fonts.sans, color: tokens.textMute }}>{t('evolution.photosNotFound')}</Text>
        <TouchableOpacity onPress={() => router.back()} style={{ marginTop: 16 }}>
          <Text style={{ fontFamily: fonts.sansB, color: tokens.accent }}>{t('common.back')}</Text>
        </TouchableOpacity>
      </SafeAreaView>
    )
  }

  const daysDiff = Math.floor(
    (new Date(after.takenAt).getTime() - new Date(before.takenAt).getTime()) / 86400000
  )
  const weightDelta = (before.weightKgSnapshot != null && after.weightKgSnapshot != null)
    ? Number((after.weightKgSnapshot - before.weightKgSnapshot).toFixed(1))
    : null

  const formatDate = (iso: string) => {
    const d = new Date(iso)
    const locale = i18n.language === 'fr' ? 'fr-FR' : 'en-US'
    return d.toLocaleDateString(locale, { day: '2-digit', month: 'short', year: 'numeric' }).replace('.', '')
  }

  const formatWeight = (kg: number | null) => {
    if (kg == null) return '—'
    return `${String(kg).replace('.', ',')} kg`
  }

  const handleShare = async () => {
    if (!shareCardRef.current) return
    setSharing(true)
    try {
      const uri = await captureRef(shareCardRef, {
        format: 'png',
        quality: 1,
        result: 'tmpfile',
      })
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, {
          mimeType: 'image/png',
          dialogTitle: t('evolution.shareProgress'),
        })
      }
    } catch {
      showToast(t('common.error'), 'error')
    } finally {
      setSharing(false)
    }
  }

  const handlePickPhoto = (photo: ProgressPhoto) => {
    if (pickerTarget === 'before') setBeforeId(photo.id)
    else if (pickerTarget === 'after') setAfterId(photo.id)
    setPickerTarget(null)
  }

  const photoWidth = (SCREEN_WIDTH - 32 - 8) / 2

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: tokens.bg }} edges={['top']}>
      <KanjiWatermark char="錬" />
      <ScreenHeader title={t('evolution.comparisonTitle')} />

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 140 }}>
        {/* Compare card */}
        <View style={{ borderWidth: 1, borderColor: tokens.border, marginBottom: 16 }}>
          {/* Labels */}
          <View style={{ flexDirection: 'row', paddingHorizontal: 12, paddingTop: 12 }}>
            <Text style={{ flex: 1, ...label.sm, color: tokens.textMute }}>{t('evolution.before').toUpperCase()}</Text>
            <Text style={{ flex: 1, ...label.sm, color: tokens.textMute, textAlign: 'right' }}>{t('evolution.after').toUpperCase()}</Text>
          </View>

          {/* Photos */}
          <View style={{ flexDirection: 'row', padding: 12, gap: 8 }}>
            <View style={{ flex: 1 }}>
              <Image source={{ uri: before.uri }} style={{ width: '100%', aspectRatio: 3 / 4 }} contentFit="cover" />
              <View style={{ marginTop: 8, gap: 2 }}>
                <View style={{ backgroundColor: tokens.accent, paddingHorizontal: 6, paddingVertical: 2, alignSelf: 'flex-start' }}>
                  <Text style={{ fontFamily: fonts.sansB, fontSize: 8, letterSpacing: 0.8, color: '#FFFFFF', textTransform: 'uppercase' }}>
                    {ANGLE_LABELS[before.angle]}
                  </Text>
                </View>
                <Text style={{ fontFamily: fonts.mono, fontSize: 11, color: tokens.textDim, marginTop: 4 }}>
                  {formatDate(before.takenAt)}
                </Text>
                <Text style={{ fontFamily: fonts.monoB, fontSize: 12, color: tokens.text }}>
                  {formatWeight(before.weightKgSnapshot)}
                </Text>
              </View>
            </View>

            <View style={{ flex: 1 }}>
              <Image source={{ uri: after.uri }} style={{ width: '100%', aspectRatio: 3 / 4 }} contentFit="cover" />
              <View style={{ marginTop: 8, gap: 2 }}>
                <View style={{ backgroundColor: tokens.accent, paddingHorizontal: 6, paddingVertical: 2, alignSelf: 'flex-start' }}>
                  <Text style={{ fontFamily: fonts.sansB, fontSize: 8, letterSpacing: 0.8, color: '#FFFFFF', textTransform: 'uppercase' }}>
                    {ANGLE_LABELS[after.angle]}
                  </Text>
                </View>
                <Text style={{ fontFamily: fonts.mono, fontSize: 11, color: tokens.textDim, marginTop: 4 }}>
                  {formatDate(after.takenAt)}
                </Text>
                <Text style={{ fontFamily: fonts.monoB, fontSize: 12, color: tokens.text }}>
                  {formatWeight(after.weightKgSnapshot)}
                </Text>
              </View>
            </View>
          </View>

          {/* Delta strip */}
          <View style={{ flexDirection: 'row', borderTopWidth: 1, borderTopColor: tokens.border }}>
            <View style={{ flex: 1, alignItems: 'center', paddingVertical: 10, borderRightWidth: 1, borderRightColor: tokens.border }}>
              <Text style={{ fontFamily: fonts.sansX, fontSize: 20, color: tokens.text }}>
                {Math.abs(daysDiff)} {t('evolution.days').toLowerCase()}
              </Text>
              <Text style={{ fontFamily: fonts.sansM, fontSize: 9, letterSpacing: 1.5, textTransform: 'uppercase', color: tokens.textMute, marginTop: 2 }}>
                {t('evolution.delta')}
              </Text>
            </View>
            <View style={{ flex: 1, alignItems: 'center', paddingVertical: 10 }}>
              <Text style={{ fontFamily: fonts.sansX, fontSize: 20, color: weightDelta != null ? tokens.accent : tokens.text }}>
                {weightDelta != null ? `${weightDelta > 0 ? '+' : ''}${String(weightDelta).replace('.', ',')} kg` : '—'}
              </Text>
              <Text style={{ fontFamily: fonts.sansM, fontSize: 9, letterSpacing: 1.5, textTransform: 'uppercase', color: tokens.textMute, marginTop: 2 }}>
                {t('evolution.weightDelta')}
              </Text>
            </View>
          </View>
        </View>

        {/* Swap photos */}
        <View style={{ gap: 8, marginBottom: 24 }}>
          <Text style={{ ...label.sm, color: tokens.textMute }}>{t('evolution.changePhotos')}</Text>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <TouchableOpacity
              onPress={() => setPickerTarget('before')}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1, borderWidth: 1, borderColor: tokens.border, padding: 8 }}
              accessibilityRole="button"
            >
              <Image source={{ uri: before.uri }} style={{ width: 36, aspectRatio: 3 / 4 }} contentFit="cover" />
              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: fonts.sansB, fontSize: 10, color: tokens.textMute, textTransform: 'uppercase', letterSpacing: 0.5 }}>{t('evolution.before')}</Text>
                <Text style={{ fontFamily: fonts.mono, fontSize: 10, color: tokens.textDim }}>{formatDate(before.takenAt)}</Text>
              </View>
              <Text style={{ fontFamily: fonts.sansB, fontSize: 14, color: tokens.accent }}>›</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setPickerTarget('after')}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1, borderWidth: 1, borderColor: tokens.border, padding: 8 }}
              accessibilityRole="button"
            >
              <Image source={{ uri: after.uri }} style={{ width: 36, aspectRatio: 3 / 4 }} contentFit="cover" />
              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: fonts.sansB, fontSize: 10, color: tokens.textMute, textTransform: 'uppercase', letterSpacing: 0.5 }}>{t('evolution.after')}</Text>
                <Text style={{ fontFamily: fonts.mono, fontSize: 10, color: tokens.textDim }}>{formatDate(after.takenAt)}</Text>
              </View>
              <Text style={{ fontFamily: fonts.sansB, fontSize: 14, color: tokens.accent }}>›</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* Bottom action */}
      <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: tokens.bg, padding: 16, borderTopWidth: 1, borderTopColor: tokens.border }}>
        <Button label={t('evolution.share')} onPress={handleShare} loading={sharing} />
      </View>

      {/* Off-screen share card for capture */}
      <View style={{ position: 'absolute', left: -9999 }} pointerEvents="none">
        <ShareCardContent
          ref={shareCardRef}
          before={before}
          after={after}
          daysDiff={daysDiff}
          weightDelta={weightDelta}
        />
      </View>

      {/* Photo picker bottom sheet */}
      <BottomSheetShell
        open={!!pickerTarget}
        onClose={() => setPickerTarget(null)}
        title={pickerTarget === 'before' ? t('evolution.chooseBefore') : t('evolution.chooseAfter')}
      >
        <ScrollView style={{ maxHeight: 400 }} showsVerticalScrollIndicator={false}>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4 }}>
            {photos
              .filter(p => p.id !== (pickerTarget === 'before' ? afterId : beforeId))
              .sort((a, b) => b.takenAt.localeCompare(a.takenAt))
              .map((p) => (
                <TouchableOpacity
                  key={p.id}
                  onPress={() => handlePickPhoto(p)}
                  style={{
                    width: (SCREEN_WIDTH - 48 - 8) / 3,
                    aspectRatio: 3 / 4,
                    borderWidth: p.id === (pickerTarget === 'before' ? beforeId : afterId) ? 2 : 0,
                    borderColor: tokens.accent,
                  }}
                >
                  <Image source={{ uri: p.uri }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
                </TouchableOpacity>
              ))}
          </View>
        </ScrollView>
      </BottomSheetShell>
    </SafeAreaView>
  )
}

const ShareCardContent = React.forwardRef<View, {
  before: ProgressPhoto
  after: ProgressPhoto
  daysDiff: number
  weightDelta: number | null
}>(function ShareCardContent({ before, after, daysDiff, weightDelta }, ref) {
  const { t, i18n } = useTranslation()
  const locale = i18n.language === 'fr' ? 'fr-FR' : 'en-US'
  const formatDate = (iso: string) => {
    const d = new Date(iso)
    return d.toLocaleDateString(locale, { day: '2-digit', month: 'short', year: 'numeric' }).replace('.', '')
  }
  const formatWeight = (kg: number | null) => {
    if (kg == null) return ''
    return `${String(kg).replace('.', ',')} kg`
  }

  return (
    <View
      ref={ref}
      collapsable={false}
      style={{
        width: 1080,
        height: 1920,
        backgroundColor: '#000000',
        padding: 80,
        justifyContent: 'space-between',
      }}
    >
      {/* Top: branding */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text style={{ fontFamily: 'NotoSerifJP_900Black_subset', fontSize: 48, color: '#FF2D3F', letterSpacing: 8 }}>
          鍛錬
        </Text>
        <Text style={{ fontFamily: 'BarlowCondensed_700Bold', fontSize: 24, color: 'rgba(255,255,255,0.4)', letterSpacing: 8, textTransform: 'uppercase' }}>
          @tanrenapp
        </Text>
      </View>

      {/* Center: photos */}
      <View style={{ gap: 32 }}>
        <View style={{ flexDirection: 'row', gap: 24 }}>
          <View style={{ flex: 1 }}>
            <Text style={{ fontFamily: 'BarlowCondensed_700Bold', fontSize: 28, color: 'rgba(255,255,255,0.5)', letterSpacing: 6, textTransform: 'uppercase', marginBottom: 16 }}>
              {t('evolution.before')}
            </Text>
            <Image source={{ uri: before.uri }} style={{ width: '100%', aspectRatio: 3 / 4 }} contentFit="cover" />
            <Text style={{ fontFamily: 'JetBrainsMono_400Regular', fontSize: 22, color: '#FFFFFF', marginTop: 16 }}>
              {formatDate(before.takenAt)}
            </Text>
            {before.weightKgSnapshot != null && (
              <Text style={{ fontFamily: 'JetBrainsMono_700Bold', fontSize: 26, color: '#FFFFFF', marginTop: 4 }}>
                {formatWeight(before.weightKgSnapshot)}
              </Text>
            )}
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontFamily: 'BarlowCondensed_700Bold', fontSize: 28, color: 'rgba(255,255,255,0.5)', letterSpacing: 6, textTransform: 'uppercase', marginBottom: 16 }}>
              {t('evolution.after')}
            </Text>
            <Image source={{ uri: after.uri }} style={{ width: '100%', aspectRatio: 3 / 4 }} contentFit="cover" />
            <Text style={{ fontFamily: 'JetBrainsMono_400Regular', fontSize: 22, color: '#FFFFFF', marginTop: 16 }}>
              {formatDate(after.takenAt)}
            </Text>
            {after.weightKgSnapshot != null && (
              <Text style={{ fontFamily: 'JetBrainsMono_700Bold', fontSize: 26, color: '#FFFFFF', marginTop: 4 }}>
                {formatWeight(after.weightKgSnapshot)}
              </Text>
            )}
          </View>
        </View>

        {/* Delta row */}
        <View style={{ flexDirection: 'row', borderTopWidth: 2, borderTopColor: 'rgba(255,255,255,0.15)', paddingTop: 32 }}>
          <View style={{ flex: 1, alignItems: 'center' }}>
            <Text style={{ fontFamily: 'BarlowCondensed_900Black', fontSize: 64, color: '#FFFFFF' }}>
              {Math.abs(daysDiff)}
            </Text>
            <Text style={{ fontFamily: 'BarlowCondensed_500Medium', fontSize: 22, color: 'rgba(255,255,255,0.5)', letterSpacing: 6, textTransform: 'uppercase' }}>
              {t('evolution.days')}
            </Text>
          </View>
          {weightDelta != null && (
            <View style={{ flex: 1, alignItems: 'center' }}>
              <Text style={{ fontFamily: 'BarlowCondensed_900Black', fontSize: 64, color: '#FF2D3F' }}>
                {weightDelta > 0 ? '+' : ''}{String(weightDelta).replace('.', ',')}
              </Text>
              <Text style={{ fontFamily: 'BarlowCondensed_500Medium', fontSize: 22, color: 'rgba(255,255,255,0.5)', letterSpacing: 6, textTransform: 'uppercase' }}>
                Kg
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* Bottom: mantra */}
      <View style={{ alignItems: 'center', gap: 16 }}>
        <View>
          <Text style={{ fontFamily: 'BarlowCondensed_900Black', fontSize: 36, color: '#FFFFFF', textAlign: 'center', textTransform: 'uppercase', letterSpacing: 2 }}>
            Une rep
          </Text>
          <Text style={{ fontFamily: 'BarlowCondensed_900Black', fontSize: 36, color: '#FF2D3F', textAlign: 'center', textTransform: 'uppercase', letterSpacing: 2 }}>
            après l'autre
          </Text>
        </View>
        <Text style={{ fontFamily: 'NotoSerifJP_900Black_subset', fontSize: 28, color: '#FF2D3F', letterSpacing: 12 }}>
          鍛 錬
        </Text>
        <Text style={{ fontFamily: 'BarlowCondensed_500Medium', fontSize: 18, color: 'rgba(255,255,255,0.4)', letterSpacing: 8, textTransform: 'uppercase' }}>
          @tanrenapp
        </Text>
      </View>
    </View>
  )
})
