import { apiFetch, API_URL } from "@/lib/Api"

/**
 * Lấy thông tin profile
 */
export async function getUserProfile(userId) {
  return apiFetch(`/users/${userId}`)
}

/**
 * Cập nhật profile (username, university, avatar_url, password)
 * @param {number} userId
 * @param {{ username?, university?, avatar_url?, password? }} data
 */
export async function updateUserProfile(userId, data) {
  return apiFetch(`/users/${userId}`, {
    method: "PUT",
    body: JSON.stringify(data),
  })
}

/**
 * Xóa tài khoản
 */
export async function deleteUserAccount(userId) {
  return apiFetch(`/users/${userId}`, {
    method: "DELETE",
  })
}

/**
 * Upload avatar → trả về { avatar_id, url }
 */
export async function uploadAvatar(file) {
  const formData = new FormData()
  formData.append("file", file)

  const res = await fetch(`${API_URL}/images/upload/avatar`, {
    method: "POST",
    body: formData,
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.detail || "Upload avatar thất bại")
  }

  return res.json() // { avatar_id, url }
}

export async function getUser(userId) {
  const res = await fetch(
    `${API_URL}/users/${userId}`
  )

  if (!res.ok) {
    throw new Error('Không thể lấy user')
  }

  return await res.json()
}