import i18n from '@/i18n'

export function getLocaleTag(): string {
  return i18n.language?.startsWith('fr') ? 'fr-FR' : 'en-US'
}

/** Format a weight value for display: "100 kg", "82,5 kg" */
export function formatWeight(kg: number): string {
  const formatted = Number.isInteger(kg)
    ? kg.toLocaleString(getLocaleTag())
    : kg.toLocaleString(getLocaleTag(), { minimumFractionDigits: 1, maximumFractionDigits: 1 })
  return `${formatted} kg`
}

/** Format a volume/tonnage for display: "450 kg", "12 450 kg", "1,2 t" */
export function formatVolume(kg: number): string {
  if (kg >= 100_000) {
    const t = kg / 1000
    return `${t.toLocaleString(getLocaleTag(), { minimumFractionDigits: 1, maximumFractionDigits: 1 })} t`
  }
  return `${Math.round(kg).toLocaleString(getLocaleTag())} kg`
}

/** Format a rest or session duration */
export function formatDuration(seconds: number): string {
  const m = Math.round(seconds / 60)
  if (m < 60) return `${m} min`
  const h = Math.floor(m / 60)
  const rem = m % 60
  return rem > 0 ? `${h}h${String(rem).padStart(2, '0')}` : `${h}h`
}

/** Format a percentage delta: "+4,2 %", "-1,5 %" */
export function formatDelta(ratio: number): string {
  const pct = ratio * 100
  const formatted = Math.abs(pct).toLocaleString(getLocaleTag(), {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  })
  return pct >= 0 ? `+${formatted} %` : `-${formatted} %`
}

export function formatNumber(n: number, opts?: Intl.NumberFormatOptions): string {
  return n.toLocaleString(getLocaleTag(), opts)
}

export function formatDateShort(d: Date): string {
  return d.toLocaleDateString(getLocaleTag(), { weekday: 'short', day: 'numeric', month: 'short' })
    .replace(/\./g, '')
}

export function formatDateLong(d: Date): string {
  return d.toLocaleDateString(getLocaleTag(), { weekday: 'short', day: 'numeric', month: 'long' })
}

export function formatDateOnly(d: Date): string {
  return d.toLocaleDateString(getLocaleTag())
}

export function formatDateDayMonth(d: Date): string {
  return d.toLocaleDateString(getLocaleTag(), { day: 'numeric', month: 'short' })
}

export function formatDateDayMonthLong(d: Date): string {
  return d.toLocaleDateString(getLocaleTag(), { day: 'numeric', month: 'long' })
}

export function formatTime(d: Date): string {
  return d.toLocaleTimeString(getLocaleTag(), { hour: '2-digit', minute: '2-digit' })
}

export function formatMonthLabel(d: Date): string {
  return d.toLocaleDateString(getLocaleTag(), { month: 'short' })
}
