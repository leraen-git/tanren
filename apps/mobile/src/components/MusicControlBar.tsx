import React, { useEffect, useState } from 'react'
import { View, Text, TouchableOpacity, Image, Animated, StyleSheet } from 'react-native'
import { useTheme } from '@/theme/ThemeContext'
import { useActiveSessionStore } from '@/stores/activeSessionStore'
import {
  subscribeNowPlaying,
  playPause,
  nextTrack,
  prevTrack,
  type NowPlayingInfo,
} from '@/services/musicService'

export const MusicControlBar = React.memo(function MusicControlBar() {
  const { tokens, fonts } = useTheme()
  const currentWorkout = useActiveSessionStore((s) => s.currentWorkout)
  const [track, setTrack] = useState<NowPlayingInfo | null>(null)
  const fadeAnim = React.useRef(new Animated.Value(0)).current

  useEffect(() => {
    if (!currentWorkout) {
      setTrack(null)
      return
    }
    const unsub = subscribeNowPlaying(setTrack)
    return unsub
  }, [currentWorkout])

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: track ? 1 : 0,
      duration: 220,
      useNativeDriver: true,
    }).start()
  }, [track, fadeAnim])

  if (!currentWorkout || !track) return null

  return (
    <Animated.View
      style={[
        styles.container,
        {
          backgroundColor: tokens.surface1,
          borderTopColor: tokens.border,
          opacity: fadeAnim,
          transform: [{ translateY: fadeAnim.interpolate({ inputRange: [0, 1], outputRange: [40, 0] }) }],
        },
      ]}
      accessibilityLabel="Music controls"
      accessibilityRole="toolbar"
    >
      {track.artwork ? (
        <Image source={{ uri: track.artwork }} style={styles.artwork} accessibilityLabel="Album artwork" />
      ) : (
        <View style={[styles.artwork, { backgroundColor: tokens.surface2, alignItems: 'center', justifyContent: 'center' }]}>
          <Text style={{ fontFamily: fonts.sansB, fontSize: 14, color: tokens.textMute }}>M</Text>
        </View>
      )}

      <View style={styles.trackInfo}>
        <Text style={{ fontFamily: fonts.sansB, fontSize: 12, color: tokens.text }} numberOfLines={1}>
          {track.title}
        </Text>
        <Text style={{ fontFamily: fonts.sans, fontSize: 10, color: tokens.textMute }} numberOfLines={1}>
          {track.artist}
        </Text>
      </View>

      <View style={styles.controls}>
        <TouchableOpacity
          onPress={prevTrack}
          style={styles.controlBtn}
          accessibilityLabel="Previous track"
          accessibilityRole="button"
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={{ fontFamily: fonts.sansB, fontSize: 10, color: tokens.text }}>{'<<'}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={playPause}
          style={[styles.controlBtn, styles.playBtn, { backgroundColor: tokens.accent }]}
          accessibilityLabel={track.isPlaying ? 'Pause' : 'Play'}
          accessibilityRole="button"
        >
          <Text style={{ fontFamily: fonts.sansB, fontSize: 10, color: '#FFFFFF' }}>
            {track.isPlaying ? '||' : '>'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={nextTrack}
          style={styles.controlBtn}
          accessibilityLabel="Next track"
          accessibilityRole="button"
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={{ fontFamily: fonts.sansB, fontSize: 10, color: tokens.text }}>{'>>'}</Text>
        </TouchableOpacity>
      </View>
    </Animated.View>
  )
})

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderTopWidth: 1,
    gap: 10,
  },
  artwork: { width: 40, height: 40 },
  trackInfo: { flex: 1, gap: 2, overflow: 'hidden' },
  controls: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  controlBtn: { alignItems: 'center', justifyContent: 'center', width: 28, height: 28 },
  playBtn: { width: 32, height: 32 },
})
