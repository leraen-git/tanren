import { describe, it, expect } from 'vitest'
import { formatWeight, formatVolume, formatDuration, formatDelta } from './format'

describe('formatWeight', () => {
  it('formats integers without decimal', () => {
    expect(formatWeight(100)).toContain('100')
    expect(formatWeight(100)).toContain('kg')
  })

  it('formats decimals with one digit', () => {
    const result = formatWeight(82.5)
    expect(result).toContain('kg')
    expect(result).toMatch(/82[,.]5/)
  })
})

describe('formatVolume', () => {
  it('rounds and formats volume', () => {
    const result = formatVolume(12450.7)
    expect(result).toContain('kg')
    expect(result).toMatch(/12[\s\u00A0\u202F]?451/)
  })

  it('formats zero', () => {
    expect(formatVolume(0)).toContain('0')
  })
})

describe('formatDuration', () => {
  it('formats seconds to minutes', () => {
    expect(formatDuration(180)).toBe('3 min')
  })

  it('formats to hours and minutes', () => {
    expect(formatDuration(4320)).toBe('1h12')
  })

  it('formats exact hours', () => {
    expect(formatDuration(3600)).toBe('1h')
  })
})

describe('formatDelta', () => {
  it('formats positive delta with +', () => {
    const result = formatDelta(0.042)
    expect(result).toMatch(/\+4[,.]2/)
  })

  it('formats negative delta with -', () => {
    const result = formatDelta(-0.015)
    expect(result).toMatch(/-1[,.]5/)
  })
})
