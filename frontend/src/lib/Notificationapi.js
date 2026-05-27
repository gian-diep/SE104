import { apiFetch } from '@/lib/Api.js'

export async function getNotifications(userId) {
  return apiFetch(`/notifications/${userId}`)
}

export async function markAllRead(userId) {
  return apiFetch(`/notifications/${userId}/read-all`, { method: 'PUT' })
}

export async function markOneRead(notifId) {
  return apiFetch(`/notifications/item/${notifId}/read`, { method: 'PUT' })
}