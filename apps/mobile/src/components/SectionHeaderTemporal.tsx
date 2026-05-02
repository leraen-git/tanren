import React from 'react'
import { View, Text } from 'react-native'
import { useTheme } from '@/theme/ThemeContext'

interface SectionHeaderTemporalProps {
  label: string
  count: number
}

export const SectionHeaderTemporal = React.memo(function SectionHeaderTemporal({ label, count }: SectionHeaderTemporalProps) {
  const { tokens, fonts, label: labelPreset } = useTheme()

  return (
    <View style={{
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      borderBottomWidth: 2,
      borderBottomColor: tokens.accent,
      paddingBottom: 6,
      marginTop: 16,
      marginBottom: 8,
    }}>
      <Text style={{ ...labelPreset.md, color: tokens.accent }}>
        {label}
      </Text>
      <Text style={{
        fontFamily: fonts.sansM,
        fontSize: 10,
        color: tokens.textMute,
      }}>
        {count}
      </Text>
    </View>
  )
})
