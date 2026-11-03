import type { AppNotification, Role } from '@/lib/types'

function readString(payload: Record<string, unknown>, key: string): string | null {
  const value = payload[key]
  return typeof value === 'string' && value.length > 0 ? value : null
}

/**
 * Where a notification should take the reader. The backend payload is an
 * open record, so only string ids we recognise are used — no guessing.
 */
export function notificationLink(notification: AppNotification, role: Role): string {
  const submissionId =
    readString(notification.payload, 'submissionId') ?? readString(notification.payload, 'contentId')
  const taskId = readString(notification.payload, 'taskId')

  if (notification.type === 'sentinel_task') {
    if (role === 'manager') {
      return taskId ? `/manager/sentinel?task=${encodeURIComponent(taskId)}` : '/manager/sentinel'
    }
    return submissionId ? `/app/feedback/${submissionId}` : '/notifications'
  }

  if (submissionId) {
    return role === 'manager' ? `/manager/queue/${submissionId}` : `/app/feedback/${submissionId}`
  }
  if (taskId && role === 'manager') {
    return `/manager/sentinel?task=${encodeURIComponent(taskId)}`
  }
  return '/notifications'
}

export const NOTIFICATION_TYPE_LABEL: Record<AppNotification['type'], string> = {
  sentinel_task: 'Sentinel task',
  exception_expiring: 'Exception expiring',
  decision: 'Decision',
  system: 'System',
}
