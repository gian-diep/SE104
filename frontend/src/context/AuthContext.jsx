import { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react'
import { registerApi, loginApi } from '@/lib/Authapi.js'
import { updateUserProfile, deleteUserAccount } from '@/lib/Userapi.js'
import { API_URL } from '@/lib/Api.js'

const AuthContext = createContext(null)

const CURRENT_USER_KEY = 'bookycle_current_user'

// Poll status mỗi 30 giây khi user đang online
const BAN_POLL_INTERVAL = 30_000

export const STORAGE_KEYS = {
  CHAT_REQUESTS: 'bookycle_chat_requests',
  CHAT_SESSIONS: 'bookycle_chat_sessions',
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null)
  const [isLoading, setIsLoading]     = useState(true)
  const pollRef = useRef(null)

  const fetchUserStatus = useCallback(async (userId) => {
    try {
      const r = await fetch(`${API_URL}/users/${userId}`)
      if (!r.ok) return null
      return await r.json()
    } catch {
      return null
    }
  }, [])

  // Khi phát hiện bị ban → xóa session, trở về guest ngay lập tức
  const forceLogout = useCallback(() => {
    setCurrentUser(null)
    localStorage.removeItem(CURRENT_USER_KEY)
    if (pollRef.current) {
      clearInterval(pollRef.current)
      pollRef.current = null
    }
  }, [])

  // ── Khởi động: khôi phục từ localStorage rồi verify ──────────────────────
  useEffect(() => {
    const saved = localStorage.getItem(CURRENT_USER_KEY)
    if (!saved) { setIsLoading(false); return }

    let parsed = null
    try { parsed = JSON.parse(saved) }
    catch { localStorage.removeItem(CURRENT_USER_KEY); setIsLoading(false); return }

    fetchUserStatus(parsed.id).then(fresh => {
      if (fresh) {
        if (fresh.status === 'banned') {
          forceLogout()
        } else {
          const updated = { ...parsed, ...fresh }
          setCurrentUser(updated)
          localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(updated))
        }
      } else {
        // Offline → dùng data cũ
        setCurrentUser(parsed)
      }
    }).finally(() => setIsLoading(false))
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Polling định kỳ khi đang đăng nhập ────────────────────────────────────
  useEffect(() => {
    if (!currentUser) {
      if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null }
      return
    }

    pollRef.current = setInterval(async () => {
      const fresh = await fetchUserStatus(currentUser.id)
      if (fresh?.status === 'banned') forceLogout()
    }, BAN_POLL_INTERVAL)

    return () => {
      if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null }
    }
  }, [currentUser?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Auth ──────────────────────────────────────────────────────────────────

  const login = async (email, password) => {
    const data = await loginApi({ email, password })

    const userRes = await fetch(`${API_URL}/users/${data.id}`)
    const fullUser = await userRes.json()

    if (fullUser.status === 'banned') {
      throw new Error(
        fullUser.ban_until
          ? `Tài khoản của bạn bị khóa đến ${fullUser.ban_until}`
          : 'Tài khoản của bạn đã bị khóa vĩnh viễn'
      )
    }

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

  const updateProfile = async (data) => {
    if (!currentUser) throw new Error('Chưa đăng nhập')
    const res = await updateUserProfile(currentUser.id, data)
    const patch = res?.user ?? res
    const updated = { ...currentUser, ...patch }
    setCurrentUser(updated)
    localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(updated))
    return updated
  }

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