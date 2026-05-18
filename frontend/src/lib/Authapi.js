import { apiFetch } from "@/lib/Api"

/**
 * Đăng ký tài khoản mới
 * @param {{ username, email, password, university }} data
 * @returns {Promise<User>}
 */
export async function registerApi(data) {
  return apiFetch("/auth/register", {
    method: "POST",
    body: JSON.stringify(data),
  })
}

/**
 * Đăng nhập
 * @param {{ email, password }} data
 * @returns {Promise<User>}
 */
export async function loginApi(data) {
  return apiFetch("/auth/login", {
    method: "POST",
    body: JSON.stringify(data),
  })
}