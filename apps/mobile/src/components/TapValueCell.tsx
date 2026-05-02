import { TextInput, Pressable, Text, View, StyleSheet } from 'react-native'
import { useState, useRef } from 'react'
import { useTheme } from '@/theme/ThemeContext'
import { label } from '@/theme/tokens'

type Props = {
  label: string
  value: number
  unit?: string
  onChange: (value: number) => void
  keyboardType?: 'number-pad' | 'decimal-pad'
  min?: number
  max?: number
}

export function TapValueCell({ label, value, unit, onChange, keyboardType = 'number-pad', min = 0, max = 999 }: Props) {
  const { tokens, fonts } = useTheme()
  const [editing, setEditing] = useState(false)
  const [buffer, setBuffer] = useState(String(value))
  const inputRef = useRef<TextInput>(null)

  const commit = () => {
    const parsed = keyboardType === 'decimal-pad'
      ? parseFloat(buffer.replace(',', '.'))
      : parseInt(buffer, 10)
    if (!isNaN(parsed)) {
      onChange(Math.max(min, Math.min(max, parsed)))
    }
    setEditing(false)
  }

  return (
    <Pressable
      onPress={() => { setBuffer(String(value)); setEditing(true) }}
      style={styles.container}
    >
      <Text style={[styles.label, { color: tokens.textMute }]}>
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
          keyboardType={keyboardType}
          autoFocus
          selectTextOnFocus
        />
      ) : (
        <View style={[styles.valueRow, { borderBottomColor: tokens.borderStrong }]}>
          <Text style={[styles.value, { fontFamily: fonts.monoB, color: tokens.text }]}>
            {value}
            {unit ? <Text style={{ fontSize: 12, fontFamily: fonts.sans, color: tokens.textMute }}>{unit}</Text> : null}
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
    fontFamily: label.sm.fontFamily,
    fontSize: label.sm.fontSize,
    letterSpacing: label.sm.letterSpacing,
    textTransform: label.sm.textTransform,
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
