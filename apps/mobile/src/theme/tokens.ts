export const colors = {
  white: '#FFFFFF' as const,
  light: {
    primary: '#E8192C',
    background: '#FFFFFF',
    surface: '#F5F5F5',
    surface2: '#EBEBEB',
    textPrimary: '#0E0E0E',
    textMuted: '#888888',
    border: '#D4D4D4',
  },
  dark: {
    primary: '#E8192C',
    background: '#000000',
    surface: '#111111',
    surface2: '#1C1C1C',
    textPrimary: '#FFFFFF',
    textMuted: '#666666',
    border: '#2A2A2A',
  },
  shared: {
    success: '#22C55E',
    warning: '#F59E0B',
    danger: '#E8192C',
  },
  heatmap: ['#141414', '#4A0A10', '#8A1520', '#C01E2E', '#E8192C'],
} as const

export const typography = {
  family: {
    light: 'BarlowCondensed_300Light',
    regular: 'BarlowCondensed_400Regular',
    medium: 'BarlowCondensed_500Medium',
    semiBold: 'BarlowCondensed_500Medium',  // mapped to Medium — no SemiBold in Barlow Condensed
    bold: 'BarlowCondensed_700Bold',
    extraBold: 'BarlowCondensed_700Bold',  // mapped to Bold — no ExtraBold in Barlow Condensed
  },
  size: {
    xs: 11,
    sm: 12,
    md: 13,
    base: 14,
    body: 16,
    title: 19,
    xl: 22,
    '2xl': 28,
    '3xl': 36,
  },
  letterSpacing: {
    tight: -0.5,
    normal: 0,
    wide: 1,
    wider: 2,
    widest: 3,
  },
} as const

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  base: 16,
  lg: 20,
  xl: 24,
} as const

export const radius = {
  sm: 4,
  md: 6,
  lg: 8,
  xl: 12,
  pill: 9999,
} as const
