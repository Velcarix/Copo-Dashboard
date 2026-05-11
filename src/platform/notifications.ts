/**
 * Push notifications abstraction.
 *
 * Electron:  Electron's built-in Notification API
 * Capacitor: @capacitor/push-notifications
 * Web:       Web Push API (requires VAPID key from backend)
 */

import { platform } from './index'

export interface LocalNotification {
  title: string
  body: string
  /** Optional — opens this URL when the notification is tapped */
  actionUrl?: string
}

async function notifyElectron(notification: LocalNotification): Promise<void> {
  new Notification(notification.title, {
    body: notification.body,
    icon: '/icons/icon-192.png',
  })
}

async function notifyCapacitor(notification: LocalNotification): Promise<void> {
  const { LocalNotifications } = await import('@capacitor/push-notifications' as never as '@capacitor/local-notifications')
  await LocalNotifications.schedule({
    notifications: [{
      id: Date.now(),
      title: notification.title,
      body: notification.body,
    }],
  })
}

async function notifyWeb(notification: LocalNotification): Promise<void> {
  if (!('Notification' in window)) return
  if (Notification.permission === 'default') {
    await Notification.requestPermission()
  }
  if (Notification.permission === 'granted') {
    new Notification(notification.title, { body: notification.body })
  }
}

export async function showNotification(notification: LocalNotification): Promise<void> {
  switch (platform.name) {
    case 'electron': return notifyElectron(notification)
    case 'ios':
    case 'android': return notifyCapacitor(notification)
    default:        return notifyWeb(notification)
  }
}

/** Request notification permissions (call once at app startup) */
export async function requestNotificationPermission(): Promise<void> {
  if (platform.isMobile) {
    const { PushNotifications } = await import('@capacitor/push-notifications')
    await PushNotifications.requestPermissions()
    await PushNotifications.register()
  } else if (platform.isWeb && 'Notification' in window) {
    await Notification.requestPermission()
  }
  // Electron: no permission needed, Notification works out of the box
}
