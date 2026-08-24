import * as Notifications from 'expo-notifications'

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: false,
    shouldSetBadge: false,
    shouldShowBanner: false,
    shouldShowList: false,
  }),
})

let scheduledNotificationId: string | null = null

export async function scheduleRestEndNotification(
  seconds: number,
  exerciseName: string,
): Promise<void> {
  try {
    if (scheduledNotificationId) {
      await Notifications.cancelScheduledNotificationAsync(scheduledNotificationId).catch(() => null)
    }
    scheduledNotificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Repos terminé',
        body: exerciseName,
        sound: 'default',
      },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds, repeats: false },
    })
  } catch {
    // Notification permission not granted — silent fail
  }
}

export async function cancelRestNotification(): Promise<void> {
  try {
    if (scheduledNotificationId) {
      await Notifications.cancelScheduledNotificationAsync(scheduledNotificationId).catch(() => null)
      scheduledNotificationId = null
    }
    await Notifications.dismissAllNotificationsAsync()
  } catch {
    // Silent fail
  }
}
