import { View, Text, Pressable } from 'react-native'
import { type ReactNode } from 'react'
import { useTheme } from '@/theme/ThemeContext'
import { useTranslation } from 'react-i18next'
import { SkeletonCard } from './SkeletonCard'

type QueryLike<T> = {
  data: T | undefined
  isPending: boolean
  isError: boolean
  error: unknown
  refetch: () => void
  isRefetching: boolean
}

type SectionStatusProps<T> = {
  query: QueryLike<T>
  children: (data: NonNullable<T>) => ReactNode
  errorLabel: string
  loadingHeight?: number
  hideWhenEmpty?: boolean
  emptyFallback?: ReactNode
}

export function SectionStatus<T>({
  query,
  children,
  errorLabel,
  loadingHeight = 80,
  hideWhenEmpty = false,
  emptyFallback,
}: SectionStatusProps<T>) {
  const { tokens, fonts } = useTheme()
  const { t } = useTranslation()
  const { data, isPending, isError, error, refetch, isRefetching } = query

  if (isPending) {
    return <SkeletonCard height={loadingHeight} />
  }

  if (isError && data == null) {
    const message = error instanceof Error ? error.message : String(error)
    const isNetwork = /network|fetch|timeout|econnrefused/i.test(message)

    return (
      <View style={{
        borderWidth: 1,
        borderColor: tokens.amber,
        borderLeftWidth: 3,
        backgroundColor: `${tokens.amber}0F`,
        padding: 12,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
      }}>
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={{
            fontFamily: fonts.sansB,
            fontSize: 13,
            letterSpacing: 0.2,
            color: tokens.text,
          }}>
            {t('common.loadError', { label: errorLabel.toLowerCase() })}
          </Text>
          <Text style={{
            fontFamily: fonts.sans,
            fontSize: 11,
            color: tokens.textMute,
          }}>
            {isNetwork ? t('common.checkConnection') : t('common.tryAgainLater')}
          </Text>
        </View>
        <Pressable
          onPress={() => refetch()}
          disabled={isRefetching}
          style={{
            paddingVertical: 6,
            paddingHorizontal: 10,
            borderWidth: 1,
            borderColor: tokens.amber,
          }}
        >
          <Text style={{
            fontFamily: fonts.sansB,
            fontSize: 10,
            letterSpacing: 1.6,
            textTransform: 'uppercase',
            color: tokens.amber,
          }}>
            {isRefetching ? '...' : t('common.retry')}
          </Text>
        </Pressable>
      </View>
    )
  }

  if (data == null) {
    if (hideWhenEmpty) return null
    return emptyFallback ?? null
  }

  return <>{children(data as NonNullable<T>)}</>
}
