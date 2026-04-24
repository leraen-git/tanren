import { TextInput, Pressable, Text, View, StyleSheet } from 'react-native'
import { useState, useRef } from 'react'
import { useTheme } from '@/theme/ThemeContext'

function parseRestInput(s: string): number {
  if (s.includes(':')) {
    const parts = s.split(':').map(n => parseInt(n, 10) || 0)
    return (parts[0] ?? 0) * 60 + (parts[1] ?? 0)
  }
  return parseInt(s, 10) || 0
}

function formatRest(sec: number): string {
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

type Props = {
  label: string
  valueSeconds: number
  onChange: (seconds: number) => void
}

export function TapTimerCell({ label, valueSeconds, onChange }: Props) {
  const { tokens, fonts } = useTheme()
  const [editing, setEditing] = useState(false)
  const [buffer, setBuffer] = useState(formatRest(valueSeconds))
  const inputRef = useRef<TextInput>(null)

  const commit = () => {
    onChange(Math.max(0, Math.min(600, parseRestInput(buffer))))
    setEditing(false)
  }

  return (
    <Pressable
      onPress={() => { setBuffer(formatRest(valueSeconds)); setEditing(true) }}
      style={styles.container}
    >
      <Text style={[styles.label, { fontFamily: fonts.sansB, color: tokens.textMute }]}>
        {label}
      </Text>
      {editing ? (
        <TextInput
          ref={inputRef}
          style={[styles.value, {
            fontFamily: fonts.monoB,
            color: tokens.accent,
            borderBottomColor: tokens.accent,
            borderBottomWidth: 1.5,
          }]}
          value={buffer}
          onChangeText={setBuffer}
          onBlur={commit}
          onSubmitEditing={commit}
          keyboardType="numbers-and-punctuation"
          autoFocus
          selectTextOnFocus
        />
      ) : (
        <View style={[styles.valueRow, { borderBottomColor: tokens.borderStrong }]}>
          <Text style={[styles.value, { fontFamily: fonts.monoB, color: tokens.text }]}>
            {formatRest(valueSeconds)}
          </Text>
        </View>
      )}
    </Pressable>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
  },
  label: {
    fontSize: 9,
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  value: {
    fontSize: 18,
    textAlign: 'center',
    minWidth: 48,
  },
  valueRow: {
    borderBottomWidth: 1,
    borderStyle: 'dashed',
    paddingBottom: 2,
  },
})
