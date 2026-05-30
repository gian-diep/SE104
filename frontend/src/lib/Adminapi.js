/**
 * frontend/src/lib/Adminapi.js
 *
 * Tất cả API call dành riêng cho admin panel.
 * Pattern giống Listingapi.js — dùng apiFetch từ Api.js.
 */

import { apiFetch } from "@/lib/Api.js"
import { API_URL } from '@/lib/Api.js'

// ── Listings ──────────────────────────────────────────────────────────────────

/**
 * Lấy TẤT CẢ bài đăng (kể cả pending, rejected) — chỉ admin dùng
 * @param {{ status?: string, keyword?: string, skip?: number, limit?: number }} params
 */
export async function adminGetListings(params = {}) {
  const q = new URLSearchParams()
  if (params.status)  q.set("status",  params.status)
  if (params.keyword) q.set("keyword", params.keyword)
  if (params.skip)    q.set("skip",    params.skip)
  if (params.limit)   q.set("limit",   params.limit)
  const qs = q.toString()
  return apiFetch(`/admin/listings${qs ? "?" + qs : ""}`)
}

/**
 * Duyệt bài đăng
 */
export async function adminApproveListing(listingId) {
  return apiFetch(`/listings/${listingId}/approve`, { method: "POST" })
}

/**
 * Từ chối bài đăng
 */
export async function adminRejectListing(listingId, reason = "") {
  return apiFetch(
    `/listings/${listingId}/reject?reason=${encodeURIComponent(reason)}`,
    { method: "POST" }
  )
}

/**
 * Xóa bài đăng (admin) — đóng chat session liên quan nếu đang thương lượng
 */
export async function adminDeleteListing(listingId) {
  return apiFetch(`/admin/listings/${listingId}`, { method: "DELETE" })
}

// ── Users ─────────────────────────────────────────────────────────────────────

/**
 * Lấy danh sách tất cả user (trừ admin)
 * @param {{ search?: string }} params
 */
export async function adminGetUsers(params = {}) {
  const q = new URLSearchParams()
  if (params.search) q.set("search", params.search)
  const qs = q.toString()
  return apiFetch(`/admin/users${qs ? "?" + qs : ""}`)
}

/**
 * Ban user
 */
export async function adminBanUser(userId, reason = "") {
  return apiFetch(`/admin/users/${userId}/status?action=ban${reason ? `&reason=${encodeURIComponent(reason)}` : ''}`, { method: "PUT" })
}

/**
 * Unban user
 */
export async function adminUnbanUser(userId) {
  return apiFetch(`/admin/users/${userId}/status?action=unban`, { method: "PUT" })
}

/**
 * Xóa user
 */
export async function adminDeleteUser(userId) {
  return apiFetch(`/admin/users/${userId}`, { method: "DELETE" })
}

export async function adminGetReports() {
  const res = await fetch(
    `${API_URL}/reports/admin`
  )

  if (!res.ok) {
    throw new Error('Không thể tải reports')
  }

  return res.json()
}