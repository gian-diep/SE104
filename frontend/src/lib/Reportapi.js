import { API_URL } from './Api'

export async function createReport(payload) {
  const res = await fetch(`${API_URL}/reports/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })

  const data = await res.json()

  if (!res.ok) {
    throw new Error(data.detail || 'Không thể gửi báo cáo')
  }

  return data
}

export async function getReports() {
  const res = await fetch(`${API_URL}/reports/admin`)

  const data = await res.json()

  if (!res.ok) {
    throw new Error(data.detail || 'Không thể tải reports')
  }

  return data
}

export async function resolveReport(reportId) {
  const res = await fetch(
    `${API_URL}/reports/${reportId}/resolve`,
    {
      method: 'PUT',
    }
  )

  const data = await res.json()

  if (!res.ok) {
    throw new Error(data.detail || 'Không thể xử lý report')
  }

  return data
}