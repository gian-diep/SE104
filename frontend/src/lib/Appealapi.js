import { API_URL } from './Api.js'

/**
 * Kiểm tra user đã gửi khiếu nại chưa
 * @param {number} userId
 */
export async function checkAppeal(userId) {
  const res = await fetch(`${API_URL}/appeals/check/${userId}`)
  const data = await res.json()
  if (!res.ok) throw new Error(data.detail || 'Không thể kiểm tra khiếu nại')
  return data
}

/**
 * User gửi khiếu nại
 * @param {{ user_id: number, reason: string }} payload
 */
export async function createAppeal(payload) {
  const res = await fetch(`${API_URL}/appeals/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.detail || 'Không thể gửi khiếu nại')
  return data
}

/**
 * Admin lấy danh sách khiếu nại
 */
export async function getAppeals() {
  const res = await fetch(`${API_URL}/appeals/admin`)
  const data = await res.json()
  if (!res.ok) throw new Error(data.detail || 'Không thể tải khiếu nại')
  return data
}

/**
 * Admin xử lý khiếu nại
 * @param {number} appealId
 * @param {{ action: 'approve'|'reject', note?: string }} payload
 */
export async function reviewAppeal(appealId, payload) {
  const res = await fetch(`${API_URL}/appeals/${appealId}/review`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.detail || 'Không thể xử lý khiếu nại')
  return data
}