import React, { useState } from 'react'
import { Modal, View, Text, TouchableOpacity, TouchableWithoutFeedback, Platform } from 'react-native'
import DateTimePicker from '@react-native-community/datetimepicker'
import { useTheme } from '@/theme/ThemeContext'

interface Props {
  visible: boolean
  value: string
  onConfirm: (time: string) => void
  onClose: () => void
  label?: string
}

function pad(n: number): string {
  return String(n).padStart(2, '0')
}

function timeToDate(time: string): Date {
  const [h, m] = time.split(':').map(Number)
  const d = new Date()
  d.setHours(h ?? 0, m ?? 0, 0, 0)
  return d
}

export function TimePickerModal({ visible, value, onConfirm, onClose, label }: Props) {
  const { tokens, fonts, label: labelPreset } = useTheme()
  const [date, setDate] = useState(timeToDate(value))

  React.useEffect(() => {
    if (visible) setDate(timeToDate(value))
  }, [value, visible])

  const handleChange = (_: any, selected?: Date) => {
    if (Platform.OS === 'android') {
      if (!selected) {
        onClose()
        return
      }
      onConfirm(`${pad(selected.getHours())}:${pad(selected.getMinutes())}`)
      onClose()
      return
    }
    if (selected) setDate(selected)
  }

  const handleConfirm = () => {
    onConfirm(`${pad(date.getHours())}:${pad(date.getMinutes())}`)
    onClose()
  }

  if (Platform.OS === 'android') {
    if (!visible) return null
    return (
      <DateTimePicker
        value={date}
        mode="time"
        is24Hour
        display="spinner"
        onChange={handleChange}
      />
    )
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={{ flex: 1, backgroundColor: tokens.overlay, justifyContent: 'flex-end' }}>
          <TouchableWithoutFeedback>
            <View style={{
              backgroundColor: tokens.bg,
              paddingBottom: 24,
              borderTopWidth: 1,
              borderTopColor: tokens.border,
            }}>
              {label && (
                <Text style={{
                  ...labelPreset.sm,
                  color: tokens.textMute,
                  textAlign: 'center',
                  marginTop: 16,
                  marginBottom: 8,
                }}>
                  {label}
                </Text>
              )}

              <View style={{ alignItems: 'center' }}>
                <DateTimePicker
                  value={date}
                  mode="time"
                  is24Hour
                  display="spinner"
                  onChange={handleChange}
                  style={{ height: 180, width: '100%' }}
                />
              </View>

              <TouchableOpacity
                onPress={handleConfirm}
                style={{
                  marginHorizontal: 20,
                  marginTop: 12,
                  backgroundColor: tokens.accent,
                  height: 44,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
                accessibilityLabel="Confirm time"
                accessibilityRole="button"
              >
                <Text style={{
                  fontFamily: fonts.sansB,
                  fontSize: 13,
                  color: '#FFFFFF',
                  textTransform: 'uppercase',
                  letterSpacing: 1,
                }}>
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
