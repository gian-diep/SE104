export const API_URL =
  import.meta.env.VITE_API_URL || "http://localhost:8000"

export async function apiFetch(path, options = {}) {
  const url = `${API_URL.replace(/\/$/, "")}/${path.replace(/^\//, "")}`

  const res = await fetch(url, {
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
    ...options,
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.detail || "Lỗi không xác định")
  }

  if (res.status === 204) return null

  return res.json()
}