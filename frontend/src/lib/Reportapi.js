// ============================================================
// FILE: frontend/src/lib/Reportapi.js
// THAY THẾ TOÀN BỘ FILE NÀY
// ============================================================

import { API_URL } from './Api'

export async function createReport(payload) {
  const res = await fetch(`${API_URL}/reports/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.detail || 'Không thể gửi báo cáo')
  return data
}

export async function getReports() {
  const res = await fetch(`${API_URL}/reports/admin`)
  const data = await res.json()
  if (!res.ok) throw new Error(data.detail || 'Không thể tải reports')
  return data
}

export async function resolveReport(reportId) {
  const res = await fetch(`${API_URL}/reports/${reportId}/resolve`, { method: 'PUT' })
  const data = await res.json()
  if (!res.ok) throw new Error(data.detail || 'Không thể xử lý report')
  return data
}

// [THAY ĐỔI 1] Gửi hành động xử phạt từ report
// action: "warn" | "ban_7days" | "ban_permanent"
export async function punishUserFromReport(reportId, action, note = '') {
  const res = await fetch(`${API_URL}/reports/${reportId}/punish`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, note }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.detail || 'Không thể xử phạt người dùng')
  return data
}