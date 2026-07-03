import type { ColorProp } from 'react-native-android-widget'

export interface WidgetColors {
  bg: ColorProp
  surface: ColorProp
  text: ColorProp
  textMute: ColorProp
  textGhost: ColorProp
  accent: ColorProp
  amber: ColorProp
  border: ColorProp
}

export const darkColors: WidgetColors = {
  bg: '#0A0A0A',
  surface: '#141414',
  text: '#FFFFFF',
  textMute: '#888888',
  textGhost: '#555555',
  accent: '#FF2D3F',
  amber: '#F59E0B',
  border: '#222222',
}

export const lightColors: WidgetColors = {
  bg: '#FFFFFF',
  surface: '#FAFAFA',
  text: '#000000',
  textMute: '#888888',
  textGhost: '#BBBBBB',
  accent: '#E8192C',
  amber: '#D98E00',
  border: '#E5E5E5',
}

export const fonts = {
  sans: 'BarlowCondensed_400Regular',
  sansM: 'BarlowCondensed_500Medium',
  sansB: 'BarlowCondensed_700Bold',
  sansX: 'BarlowCondensed_900Black',
  mono: 'JetBrainsMono_400Regular',
  monoB: 'JetBrainsMono_700Bold',
  jp: 'NotoSerifJP_700Bold_subset',
} as const
