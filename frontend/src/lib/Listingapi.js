import { apiFetch } from "@/lib/api"

// ── Public ─────────────────────────────────────────────────────────────────

/**
 * Lấy danh sách bài đã duyệt (trang chủ)
 * @param {{ category?, university?, keyword?, skip?, limit? }} params
 */
export async function getListings(params = {}) {
  const query = new URLSearchParams()
  if (params.category)   query.set("category",   params.category)
  if (params.university) query.set("university",  params.university)
  if (params.keyword)    query.set("keyword",     params.keyword)
  if (params.skip)       query.set("skip",        params.skip)
  if (params.limit)      query.set("limit",       params.limit)

  const qs = query.toString()
  return apiFetch(`/listings${qs ? "?" + qs : ""}`)
}

/**
 * Lấy chi tiết một bài đăng
 */
export async function getListingById(id) {
  return apiFetch(`/listings/${id}`)
}

export async function getListingByAdmin(id) {
  return apiFetch(`admin/listings/${id}`)
}

/**
 * Lấy tất cả bài đăng của một seller (trang Account)
 */
export async function getListingsBySeller(sellerId) {
  return apiFetch(`/listings/seller/${sellerId}`)
}

// ── Seller ──────────────────────────────────────────────────────────────────

/**
 * Đăng bài mới
 * @param {number} sellerId
 * @param {{
 *   item_name, item_price, item_description,
 *   category, condition, subject,
 *   university, keywords, images: string[]
 * }} data
 */
export async function createListing(sellerId, data) {
  return apiFetch(`/listings?seller_id=${sellerId}`, {
    method: "POST",
    body: JSON.stringify(data),
  })
}

/**
 * Sửa bài đăng
 */
export async function updateListing(listingId, data) {
  return apiFetch(`/listings/${listingId}`, {
    method: "PUT",
    body: JSON.stringify(data),
  })
}

/**
 * Xóa bài đăng
 */
export async function deleteListing(listingId) {
  return apiFetch(`/listings/${listingId}`, {
    method: "DELETE",
  })
}

// ── Admin ───────────────────────────────────────────────────────────────────

export async function approveListing(listingId) {
  return apiFetch(`/listings/${listingId}/approve`, { method: "POST" })
}

export async function rejectListing(listingId, reason) {
  return apiFetch(
    `/listings/${listingId}/reject?reason=${encodeURIComponent(reason)}`,
    { method: "POST" }
  )
}

/**
 * Cập nhật trạng thái giao dịch
 * @param {number} listingId
 * @param {'available'|'negotiating'|'sold'} transactionStatus
 */
export async function updateTransactionStatus(listingId, transactionStatus) {
  return apiFetch(
    `/listings/${listingId}/transaction-status?transaction_status=${encodeURIComponent(transactionStatus)}`,
    { method: "PATCH" }
  )
}