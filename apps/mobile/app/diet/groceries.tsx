import React from 'react'
import { View, Text, ScrollView, TouchableOpacity, Share } from 'react-native'
import { router } from 'expo-router'
import { useTheme } from '@/theme/ThemeContext'
import { Screen } from '@/components/Screen'
import { ScreenHeader } from '@/components/ScreenHeader'
import { trpc } from '@/lib/trpc'
import { useTranslation } from 'react-i18next'

interface GroceryItem {
  id: string
  section: string
  name: string
  quantity: string
  isChecked: boolean
}

interface V2PlanData {
  groceryItems: GroceryItem[]
}

function CheckBox({ checked, onPress }: { checked: boolean; onPress: () => void }) {
  const { tokens } = useTheme()
  return (
    <TouchableOpacity
      onPress={onPress}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      style={{
        width: 22, height: 22,
        borderWidth: checked ? 0 : 1.5,
        borderColor: tokens.borderStrong,
        backgroundColor: checked ? tokens.accent : 'transparent',
        alignItems: 'center', justifyContent: 'center',
      }}
    >
      {checked && (
        <Text style={{ color: '#FFFFFF', fontSize: 13, fontWeight: '700', lineHeight: 15 }}>
          {'✓'}
        </Text>
      )}
    </TouchableOpacity>
  )
}

export default function GroceriesScreen() {
  const { tokens, fonts } = useTheme()
  const { t } = useTranslation()
  const { data: plan } = trpc.diet.getMyPlanV2.useQuery()
  const utils = trpc.useUtils()

  const toggle = trpc.diet.toggleGroceryItem.useMutation({
    onMutate: async ({ itemId }) => {
      await utils.diet.getMyPlanV2.cancel()
      const prev = utils.diet.getMyPlanV2.getData()
      utils.diet.getMyPlanV2.setData(undefined, (old: any) => {
        if (!old?.groceryItems) return old
        return {
          ...old,
          groceryItems: old.groceryItems.map((g: GroceryItem) =>
            g.id === itemId ? { ...g, isChecked: !g.isChecked } : g,
          ),
        }
      })
      return { prev }
    },
    onError: (_err, _vars, context) => {
      if (context?.prev) utils.diet.getMyPlanV2.setData(undefined, context.prev)
    },
    onSettled: () => {
      utils.diet.getMyPlanV2.invalidate()
    },
  })

  const planData = plan as unknown as V2PlanData | undefined
  const items = planData?.groceryItems ?? []
  const total = items.length
  const checked = items.filter((g) => g.isChecked).length
  const progress = total > 0 ? checked / total : 0

  const sections = React.useMemo(() => {
    const map = new Map<string, GroceryItem[]>()
    for (const item of items) {
      const key = item.section || 'Autre'
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(item)
    }
    return Array.from(map.entries())
  }, [items])

  async function handleShare() {
    const unchecked = items.filter((g) => !g.isChecked)
    const lines = unchecked.map((g) => `- ${g.name} (${g.quantity})`)
    const text = `${t('diet.groceriesTitle')}\n\n${lines.join('\n')}`
    try {
      await Share.share({ message: text })
    } catch {
      // user cancelled
    }
  }

  return (
    <Screen showKanji kanjiChar="錬">
      <ScreenHeader
        title={t('diet.groceriesTitle')}
        showBack
        onBack={() => router.back()}
        right={
          <TouchableOpacity onPress={handleShare} accessibilityRole="button">
            <Text style={{ fontFamily: fonts.sansB, fontSize: 12, letterSpacing: 1, color: tokens.accent, textTransform: 'uppercase' }}>
              {t('diet.groceriesShare')}
            </Text>
          </TouchableOpacity>
        }
      />
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40, gap: 16 }}>
        {/* Summary header */}
        <View style={{ gap: 8 }}>
          <Text style={{ fontFamily: fonts.sansB, fontSize: 10, letterSpacing: 2.8, color: tokens.textMute, textTransform: 'uppercase' }}>
            {t('diet.groceriesWeek')}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8 }}>
            <Text style={{ fontFamily: fonts.monoB, fontSize: 28, color: tokens.text }}>
              {checked}<Text style={{ fontFamily: fonts.mono, fontSize: 14, color: tokens.textMute }}> / {total}</Text>
            </Text>
            <Text style={{ fontFamily: fonts.sans, fontSize: 12, color: tokens.textMute }}>
              {t('diet.groceriesArticles')} {t('diet.groceriesChecked')}
            </Text>
          </View>
          {/* Progress bar */}
          <View style={{ height: 4, backgroundColor: tokens.surface2, overflow: 'hidden' }}>
            <View style={{
              height: 4,
              width: `${Math.round(progress * 100)}%`,
              backgroundColor: tokens.accent,
            }} />
          </View>
        </View>

        {/* Sections */}
        {sections.map(([sectionName, sectionItems]) => (
          <View key={sectionName} style={{ gap: 0 }}>
            <Text style={{
              fontFamily: fonts.sansB, fontSize: 9, letterSpacing: 3,
              color: tokens.textMute, textTransform: 'uppercase',
              marginBottom: 8,
            }}>
              {sectionName}
            </Text>
            {sectionItems.map((item) => (
              <TouchableOpacity
                key={item.id}
                onPress={() => toggle.mutate({ itemId: item.id })}
                activeOpacity={0.7}
                style={{
                  flexDirection: 'row', alignItems: 'center', gap: 12,
                  paddingVertical: 11,
                  borderBottomWidth: 1, borderBottomColor: tokens.border,
                }}
              >
                <CheckBox
                  checked={item.isChecked}
                  onPress={() => toggle.mutate({ itemId: item.id })}
                />
                <Text style={{
                  flex: 1,
                  fontFamily: fonts.sansM, fontSize: 13,
                  color: item.isChecked ? tokens.textMute : tokens.text,
                  textDecorationLine: item.isChecked ? 'line-through' : 'none',
                }}>
                  {item.name}
                </Text>
                <Text style={{
                  fontFamily: fonts.monoB, fontSize: 11,
                  color: item.isChecked ? tokens.textGhost : tokens.textMute,
                }}>
                  {item.quantity}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        ))}
      </ScrollView>
    </Screen>
  )
}
