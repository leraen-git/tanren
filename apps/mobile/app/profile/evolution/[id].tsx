import React from 'react'
import { View, Text, ScrollView, TouchableOpacity, Alert } from 'react-native'
import { Image } from 'expo-image'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router, useLocalSearchParams } from 'expo-router'
import { useTranslation } from 'react-i18next'
import { useTheme } from '@/theme/ThemeContext'
import { ScreenHeader } from '@/components/ScreenHeader'
import { useProgressPhotosStore } from '@/stores/progressPhotosStore'
import { getAngleLabels } from '@/types/progressPhoto'

export default function PhotoDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const { tokens, fonts, label } = useTheme()
  const { t } = useTranslation()
  const ANGLE_LABELS = getAngleLabels(t)

  const photos = useProgressPhotosStore(s => s.photos)
  const removePhoto = useProgressPhotosStore(s => s.remove)

  const photo = photos.find(p => p.id === id)

  if (!photo) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: tokens.bg, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ fontFamily: fonts.sans, color: tokens.textMute }}>Photo introuvable</Text>
        <TouchableOpacity onPress={() => router.back()} style={{ marginTop: 16 }}>
          <Text style={{ fontFamily: fonts.sansB, color: tokens.accent }}>{t('common.back')}</Text>
        </TouchableOpacity>
      </SafeAreaView>
    )
  }

  const d = new Date(photo.takenAt)
  const dateStr = d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })

  const handleDelete = () => {
    Alert.alert(
      t('evolution.deleteTitle'),
      t('evolution.deleteMessage'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: async () => {
            await removePhoto(photo.id)
            router.back()
          },
        },
      ],
    )
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: tokens.bg }} edges={['top']}>
      <ScreenHeader title={ANGLE_LABELS[photo.angle]} />

      <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>
        <Image
          source={{ uri: photo.uri }}
          style={{ width: '100%', aspectRatio: 3 / 4 }}
          contentFit="cover"
        />

        <View style={{ padding: 16, gap: 12 }}>
          {/* Metadata */}
          <View style={{ flexDirection: 'row', gap: 16 }}>
            <View style={{ flex: 1 }}>
              <Text style={{ ...label.sm, color: tokens.textMute, marginBottom: 4 }}>Date</Text>
              <Text style={{ fontFamily: fonts.mono, fontSize: 13, color: tokens.text }}>{dateStr}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ ...label.sm, color: tokens.textMute, marginBottom: 4 }}>{t('evolution.weight')}</Text>
              <Text style={{ fontFamily: fonts.mono, fontSize: 13, color: tokens.text }}>
                {photo.weightKgSnapshot != null ? `${String(photo.weightKgSnapshot).replace('.', ',')} kg` : '—'}
              </Text>
            </View>
          </View>

          {/* Angle */}
          <View>
            <Text style={{ ...label.sm, color: tokens.textMute, marginBottom: 4 }}>Angle</Text>
            <View style={{ backgroundColor: tokens.accent, paddingHorizontal: 8, paddingVertical: 3, alignSelf: 'flex-start' }}>
              <Text style={{ fontFamily: fonts.sansB, fontSize: 10, letterSpacing: 1, color: '#FFFFFF', textTransform: 'uppercase' }}>
                {ANGLE_LABELS[photo.angle]}
              </Text>
            </View>
          </View>

          {/* Notes */}
          {photo.notes && (
            <View>
              <Text style={{ ...label.sm, color: tokens.textMute, marginBottom: 4 }}>{t('evolution.notes')}</Text>
              <Text style={{ fontFamily: fonts.sans, fontSize: 13, color: tokens.text, lineHeight: 18 }}>
                {photo.notes}
              </Text>
            </View>
          )}

          {/* Modify */}
          <TouchableOpacity
            onPress={() => router.push(`/profile/evolution/capture?id=${photo.id}`)}
            style={{ marginTop: 24, paddingVertical: 14, alignItems: 'center', borderWidth: 1, borderColor: tokens.border }}
          >
            <Text style={{ fontFamily: fonts.sansB, fontSize: 13, color: tokens.text, textTransform: 'uppercase', letterSpacing: 1 }}>
              {t('evolution.modify')}
            </Text>
          </TouchableOpacity>

          {/* Delete */}
          <TouchableOpacity
            onPress={handleDelete}
            style={{ paddingVertical: 14, alignItems: 'center', borderWidth: 1, borderColor: tokens.accent }}
          >
            <Text style={{ fontFamily: fonts.sansB, fontSize: 13, color: tokens.accent, textTransform: 'uppercase', letterSpacing: 1 }}>
              {t('common.delete')}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}
