export const brand = {
  iron: '#000000',
  anvil: '#FFFFFF',
  forgeLight: '#E8192C',
  forgeDark: '#FF2D3F',
} as const

export const semantic = {
  greenLight: '#1A7F2C',
  greenDark: '#2BAE43',
  amberLight: '#D98E00',
  amberDark: '#E8A900',
} as const

export const darkTheme = {
  bg: '#000000',
  text: '#FFFFFF',
  textDim: '#AAAAAA',
  textMute: '#888888',
  textGhost: '#555555',
  accent: '#FF2D3F',
  border: '#222222',
  borderStrong: '#333333',
  surface1: '#0A0A0A',
  surface2: '#141414',
  ghostBg: 'rgba(255,255,255,0.03)',
  green: '#2BAE43',
  amber: '#E8A900',
  overlay: 'rgba(0,0,0,0.72)',
  kanjiOpacity: 0.04,
} as const

export const lightTheme = {
  bg: '#FFFFFF',
  text: '#000000',
  textDim: '#555555',
  textMute: '#888888',
  textGhost: '#BBBBBB',
  accent: '#E8192C',
  border: '#E5E5E5',
  borderStrong: '#CCCCCC',
  surface1: '#FAFAFA',
  surface2: '#F3F3F3',
  ghostBg: 'rgba(0,0,0,0.025)',
  green: '#1A7F2C',
  amber: '#D98E00',
  overlay: 'rgba(255,255,255,0.85)',
  kanjiOpacity: 0.05,
} as const

export type ThemeTokens = {
  bg: string
  text: string
  textDim: string
  textMute: string
  textGhost: string
  accent: string
  border: string
  borderStrong: string
  surface1: string
  surface2: string
  ghostBg: string
  green: string
  amber: string
  overlay: string
  kanjiOpacity: number
}

export const fonts = {
  // Charter names
  sans: 'BarlowCondensed_400Regular',
  sansM: 'BarlowCondensed_500Medium',
  sansB: 'BarlowCondensed_700Bold',
  sansX: 'BarlowCondensed_900Black',
  jp: 'NotoSerifJP_700Bold_subset',
  jpX: 'NotoSerifJP_900Black_subset',
  mono: 'JetBrainsMono_400Regular',
  monoB: 'JetBrainsMono_700Bold',
} as const

export const heatmapColors = ['#141414', '#4A0A10', '#8A1520', '#C01E2E', '#E8192C'] as const

// Raw color constants for non-themed contexts (splash, error boundary, share cards)
export const colors = {
  white: '#FFFFFF' as const,
  black: '#000000' as const,
  light: {
    primary: lightTheme.accent,
    background: lightTheme.bg,
    surface: lightTheme.surface1,
    surface2: lightTheme.surface2,
    textPrimary: lightTheme.text,
    textMuted: lightTheme.textMute,
    border: lightTheme.border,
    grid: lightTheme.surface2,
  },
  dark: {
    primary: darkTheme.accent,
    background: darkTheme.bg,
    surface: darkTheme.surface1,
    surface2: darkTheme.surface2,
    textPrimary: darkTheme.text,
    textMuted: darkTheme.textMute,
    border: darkTheme.border,
    grid: darkTheme.surface2,
  },
  shared: {
    success: semantic.greenLight,
    warning: semantic.amberLight,
    danger: brand.forgeLight,
    carbsAccent: semantic.amberLight,
    fatAccent: semantic.greenLight,
    youtubeRed: '#FF0000',
  },
  heatmap: [...heatmapColors],
  overlay: {
    backdrop: 'rgba(0,0,0,0.5)',
    whiteSubtle: 'rgba(255,255,255,0.04)',
    blackSubtle: 'rgba(0,0,0,0.05)',
    whiteMuted: 'rgba(255,255,255,0.7)',
    redGlow: 'rgba(232,25,44,0.22)',
  },
} as const
