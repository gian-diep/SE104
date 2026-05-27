// src/lib/Chatapi.js
// Tất cả API call cho luồng giao dịch & nhắn tin

import { apiFetch } from "@/lib/Api.js"

// ══════════════════════════════════════════════════════════════
// CHAT REQUESTS
// ══════════════════════════════════════════════════════════════

/** Buyer gửi yêu cầu giao dịch */
export async function sendChatRequest(listingId, buyerId) {
  return apiFetch(`/chat/requests?listing_id=${listingId}&buyer_id=${buyerId}`, {
    method: "POST",
  })
}

/** Lấy requests gửi đến seller */
export async function getSellerRequests(sellerId) {
  return apiFetch(`/chat/requests/seller/${sellerId}`)
}

/** Lấy requests buyer đã gửi */
export async function getBuyerRequests(buyerId) {
  return apiFetch(`/chat/requests/buyer/${buyerId}`)
}

/** Seller chấp nhận yêu cầu → trả về SessionOut */
export async function acceptRequest(requestId) {
  return apiFetch(`/chat/requests/${requestId}/accept`, { method: "POST" })
}

/** Seller từ chối yêu cầu */
export async function rejectRequest(requestId) {
  return apiFetch(`/chat/requests/${requestId}/reject`, { method: "POST" })
}

// ══════════════════════════════════════════════════════════════
// CHAT SESSIONS
// ══════════════════════════════════════════════════════════════

/** Lấy một session theo id */
export async function getSession(sessionId) {
  return apiFetch(`/chat/sessions/${sessionId}`)
}

/** Lấy tất cả session của user (buyer + seller) */
export async function getUserSessions(userId) {
  return apiFetch(`/chat/sessions/user/${userId}`)
}

/** Xác nhận hoàn thành giao dịch */
export async function confirmComplete(sessionId, userId) {
  return apiFetch(`/chat/sessions/${sessionId}/confirm?user_id=${userId}`, {
    method: "POST",
  })
}

/** Hủy cuộc thương lượng */
export async function cancelSession(sessionId, userId) {
  return apiFetch(`/chat/sessions/${sessionId}/cancel?user_id=${userId}`, {
    method: "POST",
  })
}

// ══════════════════════════════════════════════════════════════
// MESSAGES
// ══════════════════════════════════════════════════════════════

/** Lấy tất cả tin nhắn trong session */
export async function getMessages(sessionId) {
  return apiFetch(`/chat/sessions/${sessionId}/messages`)
}

/** Gửi tin nhắn */
export async function sendMessage(sessionId, { senderId, text, type = "user" }) {
  return apiFetch(`/chat/sessions/${sessionId}/messages`, {
    method: "POST",
    body: JSON.stringify({ sender_id: senderId, text, type }),
  })
}

// ══════════════════════════════════════════════════════════════
// RATINGS
// ══════════════════════════════════════════════════════════════

/** Gửi đánh giá sau khi hoàn thành */
export async function rateSession(sessionId, { raterId, stars, comment = "" }) {
  return apiFetch(`/chat/sessions/${sessionId}/rate`, {
    method: "POST",
    body: JSON.stringify({ rater_id: raterId, stars, comment }),
  })
}
