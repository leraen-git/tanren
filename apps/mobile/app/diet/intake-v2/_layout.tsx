import { Stack } from 'expo-router'

export default function IntakeV2Layout() {
  return (
    <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
      <Stack.Screen name="stats" />
      <Stack.Screen name="lifestyle" />
      <Stack.Screen name="food-preferences" />
      <Stack.Screen name="snacks" />
    </Stack>
  )
}
