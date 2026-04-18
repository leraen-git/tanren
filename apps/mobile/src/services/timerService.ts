import * as Notifications from 'expo-notifications'

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
})

let scheduledNotificationId: string | null = null

export async function requestNotificationPermissions(): Promise<boolean> {
  const { status } = await Notifications.requestPermissionsAsync()
  return status === 'granted'
}

export async function scheduleRestEndNotification(
  seconds: number,
  exerciseName: string,
): Promise<void> {
  if (scheduledNotificationId) {
    await Notifications.cancelScheduledNotificationAsync(scheduledNotificationId)
  }
  scheduledNotificationId = await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Rest complete!',
      body: `Time for your next set of ${exerciseName}`,
      data: { exerciseName },
    },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds, repeats: false },
  })
}

export async function cancelRestNotification(): Promise<void> {
  if (scheduledNotificationId) {
    await Notifications.cancelScheduledNotificationAsync(scheduledNotificationId)
    scheduledNotificationId = null
  }
}
