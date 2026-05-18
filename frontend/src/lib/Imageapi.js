/**
 * frontend/src/lib/Imageapi.js
 *
 * Upload ảnh lên backend → nhận { image_id, url }
 * Dùng trước khi gọi createListing.
 */

import { API_URL } from "@/lib/Api"

/**
 * Upload một File object lên /images/upload
 * @param {File} file
 * @returns {Promise<{ image_id: string, url: string }>}
 */
export async function uploadImage(file) {
  const formData = new FormData()
  formData.append("file", file)

  const res = await fetch(`${API_URL}/images/upload`, {
    method: "POST",
    body: formData,
    // Không set Content-Type — browser tự thêm boundary cho multipart
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.detail || "Upload ảnh thất bại")
  }

  return res.json() // { image_id: "xxx.jpg", url: "/images/xxx.jpg" }
}

/**
 * Build URL đầy đủ để dùng trong <img src={...} />
 * - Nếu image_id là URL tuyệt đối (http...) → giữ nguyên
 * - Nếu là image_id local → ghép với API_URL
 */
export function buildImageUrl(imageId) {
  if (!imageId) return ""

  // URL ngoài
  if (
    imageId.startsWith("http://") ||
    imageId.startsWith("https://")
  ) {
    return imageId
  }

  // Base64 image
  if (imageId.startsWith("data:image")) {
    return imageId
  }

  // Internal uploaded image
  const path = imageId.startsWith("/")
    ? imageId
    : `/images/${imageId}`

  return `${API_URL}${path}`
}