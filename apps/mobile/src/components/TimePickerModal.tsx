import React, { useState } from 'react'
import {
  Modal, View, Text, TouchableOpacity, TextInput,
  Dimensions, TouchableWithoutFeedback,
} from 'react-native'
import { useTheme } from '@/theme/ThemeContext'

interface Props {
  visible: boolean
  value: string
  onConfirm: (time: string) => void
  onClose: () => void
  label?: string
}

const { height: SCREEN_HEIGHT } = Dimensions.get('window')

function pad(n: number): string {
  return String(n).padStart(2, '0')
}

export function TimePickerModal({ visible, value, onConfirm, onClose, label }: Props) {
  const { tokens, fonts } = useTheme()

  const [hour, minute] = value.split(':').map(Number)
  const [h, setH] = useState(pad(hour ?? 0))
  const [m, setM] = useState(pad(minute ?? 0))

  React.useEffect(() => {
    const [hh, mm] = value.split(':').map(Number)
    setH(pad(hh ?? 0))
    setM(pad(mm ?? 0))
  }, [value, visible])

  const adjustHour = (delta: number) => {
    const next = ((Number(h) + delta + 24) % 24)
    setH(pad(next))
  }

  const adjustMinute = (delta: number) => {
    let next = Number(m) + delta
    if (next >= 60) { next -= 60; adjustHour(1) }
    else if (next < 0) { next += 60; adjustHour(-1) }
    setM(pad(next))
  }

  const handleConfirm = () => {
    const hh = Math.min(23, Math.max(0, Number(h) || 0))
    const mm = Math.min(59, Math.max(0, Number(m) || 0))
    onConfirm(`${pad(hh)}:${pad(mm)}`)
    onClose()
  }

  const spinnerStyle = {
    borderWidth: 1,
    borderColor: tokens.border,
    padding: 16,
    alignItems: 'center' as const,
    width: 90,
    gap: 8,
  }

  const numberStyle = {
    fontFamily: fonts.monoB,
    fontSize: 32,
    color: tokens.text,
    textAlign: 'center' as const,
    minWidth: 60,
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={{ flex: 1, backgroundColor: tokens.overlay, justifyContent: 'flex-end' }}>
          <TouchableWithoutFeedback>
            <View style={{
              backgroundColor: tokens.bg,
              padding: 20,
              paddingBottom: 24,
              height: SCREEN_HEIGHT * 0.38,
              borderTopWidth: 1,
              borderTopColor: tokens.border,
            }}>
              {label && (
                <Text style={{
                  fontFamily: fonts.sansB, fontSize: 9, color: tokens.textMute,
                  textAlign: 'center', textTransform: 'uppercase', letterSpacing: 2, marginBottom: 20,
                }}>
                  {label}
                </Text>
              )}

              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
                <View style={spinnerStyle}>
                  <TouchableOpacity
                    onPress={() => adjustHour(1)}
                    accessibilityLabel="Increase hour" accessibilityRole="button"
                    style={{ padding: 4 }}
                  >
                    <Text style={{ fontFamily: fonts.sansB, fontSize: 14, color: tokens.accent }}>^</Text>
                  </TouchableOpacity>
                  <TextInput
                    value={h}
                    onChangeText={(v) => setH(v.replace(/\D/g, '').slice(0, 2))}
                    keyboardType="number-pad"
                    maxLength={2}
                    style={numberStyle}
                    selectTextOnFocus
                    accessibilityLabel="Hour"
                  />
                  <TouchableOpacity
                    onPress={() => adjustHour(-1)}
                    accessibilityLabel="Decrease hour" accessibilityRole="button"
                    style={{ padding: 4 }}
                  >
                    <Text style={{ fontFamily: fonts.sansB, fontSize: 14, color: tokens.accent }}>v</Text>
                  </TouchableOpacity>
                </View>

                <Text style={{ fontFamily: fonts.monoB, fontSize: 24, color: tokens.text }}>:</Text>

                <View style={spinnerStyle}>
                  <TouchableOpacity
                    onPress={() => adjustMinute(5)}
                    accessibilityLabel="Increase minute" accessibilityRole="button"
                    style={{ padding: 4 }}
                  >
                    <Text style={{ fontFamily: fonts.sansB, fontSize: 14, color: tokens.accent }}>^</Text>
                  </TouchableOpacity>
                  <TextInput
                    value={m}
                    onChangeText={(v) => setM(v.replace(/\D/g, '').slice(0, 2))}
                    keyboardType="number-pad"
                    maxLength={2}
                    style={numberStyle}
                    selectTextOnFocus
                    accessibilityLabel="Minute"
                  />
                  <TouchableOpacity
                    onPress={() => adjustMinute(-5)}
                    accessibilityLabel="Decrease minute" accessibilityRole="button"
                    style={{ padding: 4 }}
                  >
                    <Text style={{ fontFamily: fonts.sansB, fontSize: 14, color: tokens.accent }}>v</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <TouchableOpacity
                onPress={handleConfirm}
                style={{
                  marginTop: 20, backgroundColor: tokens.accent,
                  height: 44, alignItems: 'center', justifyContent: 'center',
                }}
                accessibilityLabel="Confirm time" accessibilityRole="button"
              >
                <Text style={{ fontFamily: fonts.sansB, fontSize: 13, color: '#FFFFFF', textTransform: 'uppercase', letterSpacing: 1 }}>
                  OK
                </Text>
              </TouchableOpacity>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  )
}
