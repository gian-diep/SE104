import { createContext, useContext, useState, useEffect } from 'react'
import { registerApi, loginApi } from '@/lib/Authapi.js'
import { updateUserProfile, deleteUserAccount } from '@/lib/Userapi.js'
import { API_URL } from '@/lib/Api.js'

const AuthContext = createContext(null)

const CURRENT_USER_KEY = 'bookycle_current_user'
// const CURRENT_USER_KEY = 'bookycle_current_user'

// Thêm vào đây
export const STORAGE_KEYS = {
  CHAT_REQUESTS: 'bookycle_chat_requests',
  CHAT_SESSIONS: 'bookycle_chat_sessions',
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null)
  const [isLoading, setIsLoading]     = useState(true)

  // Khôi phục user từ localStorage khi reload trang
  useEffect(() => {
    const saved = localStorage.getItem(CURRENT_USER_KEY)
    if (saved) {
      try { setCurrentUser(JSON.parse(saved)) }
      catch { localStorage.removeItem(CURRENT_USER_KEY) }
    }
    setIsLoading(false)
  }, [])

  // ── Auth ──────────────────────────────────────────────────────────────────

  const login = async (email, password) => {
  const data = await loginApi({email,password,})

  const userRes = await fetch(
  `${API_URL}/users/${data.id}`)

  const fullUser = await userRes.json()

  setCurrentUser(fullUser)

  localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(fullUser))

  return fullUser
}

  const register = async (name, email, password, university) => {
    const user = await registerApi({
      username:   name,
      email,
      password,
      university: university || null,
    })
    setCurrentUser(user)
    localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user))
    return user
  }

  const logout = () => {
    setCurrentUser(null)
    localStorage.removeItem(CURRENT_USER_KEY)
  }

  // ── Profile ──────────────────────────────────────────────────────────────

  /**
   * Cập nhật profile qua API, rồi sync lại localStorage
   * @param {{ username?, university?, avatar_url?, password? }} data
   */
  const updateProfile = async (data) => {
    if (!currentUser) throw new Error('Chưa đăng nhập')
    const res = await updateUserProfile(currentUser.id, data)
    // API trả về { message, user: { id, username, avatar_url } }
    // → merge vào currentUser để giữ lại email, university, role, ...
    const patch = res?.user ?? res
    const updated = { ...currentUser, ...patch }
    setCurrentUser(updated)
    localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(updated))
    return updated
  }

  // ── Delete account ────────────────────────────────────────────────────────

  const deleteAccount = async () => {
    if (!currentUser) throw new Error('Chưa đăng nhập')
    await deleteUserAccount(currentUser.id)
    logout()
  }

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        isLoading,
        login,
        register,
        logout,
        updateProfile,
        deleteAccount,
        STORAGE_KEYS,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}