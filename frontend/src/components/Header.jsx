import { Link, useNavigate } from 'react-router-dom'
import { LogOut, User, PlusCircle, MessageCircle, BookOpen, ChevronDown, Search, Bell, X as XIcon, CheckCheck, ShieldCheck, ShieldAlert, AlertTriangle, Ban, Clock } from 'lucide-react'
import { useState, useEffect, useRef, useCallback } from 'react'
import { useAuth } from '@/context/AuthContext'
import AuthModal from '@/components/modals/AuthModal'
import { Image } from '@/components/ui/image'
import logo from '@/logo.png'
import { API_URL } from '@/lib/Api.js'
import { getNotifications, markAllRead, markOneRead } from '@/lib/Notificationapi.js'

function getAvatarUrl(avatarUrl) {
  if (!avatarUrl) return null
  if (avatarUrl.startsWith('http') || avatarUrl.startsWith('data:')) return avatarUrl
  return `${API_URL}/avatars/${avatarUrl}`
}

/** Icon-only button với tooltip hover */
function NavIconBtn({ to, href, icon: Icon, label, badge, primary = false }) {
  const cls = primary
  ? `
    relative flex items-center gap-2.5
    px-4 h-11 rounded-2xl
    bg-gradient-to-br from-teal-500 via-teal-500 to-emerald-400
    text-white
    border border-teal-400/40
    shadow-[0_10px_30px_rgba(20,184,166,0.30)]
    hover:shadow-[0_14px_36px_rgba(20,184,166,0.40)]
    hover:-translate-y-0.5
    transition-all duration-300
    font-heading font-semibold text-sm
  `
  : `
    relative flex items-center gap-2.5
    px-4 h-11 rounded-2xl
    bg-gradient-to-b from-white to-teal-50/40
    border border-teal-100
    text-slate-700
    shadow-[0_2px_10px_rgba(0,0,0,0.04)]
    hover:border-teal-200
    hover:from-teal-50
    hover:to-teal-100/40
    hover:shadow-[0_8px_24px_rgba(13,148,136,0.10)]
    hover:-translate-y-0.5
    transition-all duration-300
    font-heading font-semibold text-sm
  `

  const inner = (
    <>
      <div className={`
        flex items-center justify-center
        w-7 h-7 rounded-xl
        transition-all duration-300
        ${primary
          ? 'bg-white/15'
          : 'bg-gradient-to-br from-teal-100 to-teal-50 border border-teal-100'}
      `}>
        <Icon
          className={primary ? 'w-4 h-4 text-white' : 'w-4 h-4 text-primary'}
          strokeWidth={2.5}
        />
      </div>

      <span>{label}</span>

      {badge > 0 && (
        <span className="
          absolute -top-1.5 -right-1.5
          min-w-[18px] h-[18px]
          bg-amber-400 text-white
          rounded-full
          text-[10px]
          flex items-center justify-center
          font-bold px-1
          border-2 border-white
          shadow-sm
        ">
          {badge}
        </span>
      )}
    </>
  )

  if (href) return <a href={href} className={cls}>{inner}</a>
  return <Link to={to} className={cls}>{inner}</Link>
}

function useNotifications(userId) {
  const [notifs, setNotifs]   = useState([])
  const [loading, setLoading] = useState(false)
  const timerRef = useRef(null)

  const fetch_ = useCallback(async () => {
    if (!userId) return
    try {
      const data = await getNotifications(userId)
      setNotifs(data)
    } catch {}
  }, [userId])

  useEffect(() => {
    if (!userId) { setNotifs([]); return }
    setLoading(true)
    fetch_().finally(() => setLoading(false))
    timerRef.current = setInterval(fetch_, 30000)
    return () => clearInterval(timerRef.current)
  }, [userId, fetch_])

  const unread = notifs.filter(n => !n.is_read).length

  const readAll = async () => {
    if (!userId || unread === 0) return
    await markAllRead(userId)
    setNotifs(p => p.map(n => ({ ...n, is_read: true })))
  }

  const readOne = async (id) => {
    await markOneRead(id)
    setNotifs(p => p.map(n => n.id === id ? { ...n, is_read: true } : n))
  }

  return { notifs, unread, loading, readAll, readOne, refresh: fetch_ }
}

const NOTIF_CONFIG = {
  report_resolved: {
    Icon: ShieldCheck, iconColor: 'text-emerald-600',
    iconBg: 'bg-emerald-100',
    border: 'border-l-emerald-400',
    bg: 'bg-emerald-50/40',
    badge: 'bg-emerald-100 text-emerald-700',
    badgeLabel: 'Đã xử lý',
  },
  report_rejected: {
    Icon: ShieldAlert, iconColor: 'text-slate-500',
    iconBg: 'bg-slate-100',
    border: 'border-l-slate-300',
    bg: 'bg-slate-50/40',
    badge: 'bg-slate-100 text-slate-600',
    badgeLabel: 'Bác bỏ',
  },
  warn: {
    Icon: AlertTriangle, iconColor: 'text-amber-500',
    iconBg: 'bg-amber-100',
    border: 'border-l-amber-400',
    bg: 'bg-amber-50/40',
    badge: 'bg-amber-100 text-amber-700',
    badgeLabel: 'Cảnh cáo',
  },
  ban_7days: {
    Icon: Clock, iconColor: 'text-red-500',
    iconBg: 'bg-red-100',
    border: 'border-l-red-400',
    bg: 'bg-red-50/40',
    badge: 'bg-red-100 text-red-600',
    badgeLabel: 'Khóa 7 ngày',
  },
  ban_permanent: {
    Icon: Ban, iconColor: 'text-red-700',
    iconBg: 'bg-red-200',
    border: 'border-l-red-600',
    bg: 'bg-red-50/60',
    badge: 'bg-red-200 text-red-700',
    badgeLabel: 'Khóa vĩnh viễn',
  },
}
const DEFAULT_NOTIF_CFG = {
  Icon: Bell, iconColor: 'text-teal-600',
  iconBg: 'bg-teal-100', border: 'border-l-teal-400',
  bg: 'bg-teal-50/30', badge: 'bg-teal-100 text-teal-700', badgeLabel: 'Thông báo',
}

export default function Header() {
  const { currentUser, logout, STORAGE_KEYS } = useAuth()
  const navigate = useNavigate()
  const [showUserMenu, setShowUserMenu]   = useState(false)
  const [showNotifs, setShowNotifs]       = useState(false)
  const [authModal, setAuthModal]         = useState({ open: false, tab: 'login' })
  const { notifs, unread, readAll, readOne } = useNotifications(currentUser?.id)

  const openLogin    = () => setAuthModal({ open: true, tab: 'login' })
  const openRegister = () => setAuthModal({ open: true, tab: 'register' })
  const closeAuth    = () => setAuthModal(m => ({ ...m, open: false }))

  const getPendingCount = () => {
    if (!currentUser) return 0
    try {
      const requests = JSON.parse(localStorage.getItem(STORAGE_KEYS.CHAT_REQUESTS) || '[]')
      const sessions = JSON.parse(localStorage.getItem(STORAGE_KEYS.CHAT_SESSIONS) || '[]')
      const pendingReqs    = requests.filter(r => r.sellerId === currentUser.id && r.status === 'pending').length
      const activeSessions = sessions.filter(s =>
        (s.sellerId === currentUser.id || s.buyerId === currentUser.id) && s.status === 'active'
      ).length
      return pendingReqs + activeSessions
    } catch { return 0 }
  }

  const pendingCount = getPendingCount()

  return (
    <>
      <AuthModal isOpen={authModal.open} onClose={closeAuth} defaultTab={authModal.tab} />

      <header className="w-full bg-white/90 backdrop-blur-md border-b border-teal-100 sticky top-0 z-50 shadow-soft">
        <div className="max-w-[100rem] mx-auto px-6 md:px-16 py-3">
          <div className="flex items-center justify-between gap-4">

            {/* ── Logo ────────────────────────── */}
            <Link to="/" className="flex items-center gap-2.5 group flex-shrink-0">
              <div className="relative w-9 h-9 flex-shrink-0">
                <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-teal-400 to-teal-600 shadow-btn" />
                <div className="absolute inset-0 rounded-xl flex items-center justify-center">
                  <Image src={logo} alt="Bookycle" className="w-6 h-6 object-contain brightness-0 invert" />
                </div>
              </div>
              <span className="font-heading text-xl font-bold text-foreground group-hover:text-primary transition-colors duration-200">
                Bookycle
              </span>
            </Link>

            {/* ── Nav ─────────────────────────── */}
            <nav className="flex items-center gap-3">

              {/* Tìm kiếm — always visible */}
              <NavIconBtn href="/#search" icon={Search} label="Tìm kiếm" />

              {currentUser ? (
                <>
                  <NavIconBtn to="/dang-ban" icon={PlusCircle} label="Đăng bán" />
                  <NavIconBtn to="/tin-nhan" icon={MessageCircle} label="Tin nhắn" badge={pendingCount} />

                  {/* Notification bell */}
                  <div className="relative">
                    <button
                      onClick={() => { setShowNotifs(v => !v); setShowUserMenu(false) }}
                      className="relative flex items-center justify-center w-11 h-11 rounded-2xl bg-gradient-to-b from-white to-teal-50/40 border border-teal-100 text-slate-700 shadow-[0_2px_10px_rgba(0,0,0,0.04)] hover:border-teal-200 hover:from-teal-50 hover:to-teal-100/40 hover:shadow-[0_8px_24px_rgba(13,148,136,0.10)] hover:-translate-y-0.5 transition-all duration-300"
                    >
                      <Bell className="w-4 h-4 text-primary" strokeWidth={2.5} />
                      {unread > 0 && (
                        <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] bg-red-500 text-white rounded-full text-[10px] flex items-center justify-center font-bold px-1 border-2 border-white shadow-sm">
                          {unread > 9 ? '9+' : unread}
                        </span>
                      )}
                    </button>

                    {showNotifs && (
                      <>
                        <div className="fixed inset-0 z-40" onClick={() => setShowNotifs(false)} />
                        <div className="absolute right-0 top-full mt-2.5 w-80 bg-white rounded-2xl border border-teal-100 shadow-card-hover z-50 overflow-hidden flex flex-col max-h-[480px]">
                          {/* Header */}
                          {/* Panel header */}
                          <div className="flex items-center justify-between px-4 py-3.5 border-b border-teal-100 bg-gradient-to-r from-teal-600 to-teal-500 flex-shrink-0 rounded-t-2xl">
                            <div className="flex items-center gap-2">
                              <div className="w-7 h-7 rounded-lg bg-white/20 flex items-center justify-center">
                                <Bell className="w-3.5 h-3.5 text-white" />
                              </div>
                              <span className="font-heading text-sm font-bold text-white">Thông báo</span>
                              {unread > 0 && (
                                <span className="px-2 py-0.5 rounded-full bg-red-500 text-white text-[10px] font-bold shadow-sm">{unread} mới</span>
                              )}
                            </div>
                            {unread > 0 && (
                              <button onClick={readAll} className="flex items-center gap-1.5 font-paragraph text-xs text-white/80 hover:text-white transition-colors bg-white/10 hover:bg-white/20 px-2.5 py-1 rounded-lg">
                                <CheckCheck className="w-3 h-3" />Đọc tất cả
                              </button>
                            )}
                          </div>

                          {/* List */}
                          <div className="overflow-y-auto flex-1">
                            {notifs.length === 0 ? (
                              <div className="py-12 flex flex-col items-center gap-3 text-center px-4">
                                <div className="w-14 h-14 rounded-2xl bg-teal-50 flex items-center justify-center">
                                  <Bell className="w-7 h-7 text-teal-200" />
                                </div>
                                <div>
                                  <p className="font-heading text-sm font-bold text-muted-foreground">Chưa có thông báo</p>
                                  <p className="font-paragraph text-xs text-muted-foreground/60 mt-0.5">Các thông báo sẽ xuất hiện ở đây</p>
                                </div>
                              </div>
                            ) : (
                              <div className="divide-y divide-teal-50/60">
                                {notifs.map(n => {
                                  const cfg = NOTIF_CONFIG[n.type] || DEFAULT_NOTIF_CFG
                                  const { Icon } = cfg
                                  return (
                                    <button
                                      key={n.id}
                                      onClick={() => readOne(n.id)}
                                      className={`w-full text-left px-3 py-3.5 border-l-[3px] transition-all ${cfg.border} ${n.is_read ? 'opacity-50 bg-white' : cfg.bg} hover:brightness-95`}
                                    >
                                      <div className="flex items-start gap-3">
                                        {/* Icon bubble */}
                                        <div className={`w-8 h-8 rounded-xl flex-shrink-0 flex items-center justify-center ${cfg.iconBg}`}>
                                          <Icon className={`w-4 h-4 ${cfg.iconColor}`} strokeWidth={2} />
                                        </div>

                                        <div className="min-w-0 flex-1">
                                          {/* Badge row */}
                                          <div className="flex items-center justify-between gap-1.5 mb-1">
                                            <span className={`inline-flex items-center px-1.5 py-0.5 rounded-md text-[9px] font-heading font-bold uppercase tracking-wide ${cfg.badge}`}>
                                              {cfg.badgeLabel}
                                            </span>
                                            {!n.is_read && (
                                              <span className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0 shadow-sm" />
                                            )}
                                          </div>

                                          {/* Title */}
                                          <p className="font-heading text-xs font-bold text-foreground leading-snug mb-1">
                                            {n.title}
                                          </p>

                                          {/* Body */}
                                          <p className="font-paragraph text-[11px] text-muted-foreground leading-relaxed mb-2">
                                            {n.body}
                                          </p>

                                          {/* Listing link nếu có */}
                                          {n.listing_name && n.listing_id && (
                                            <Link
                                              to={`/listings/${n.listing_id}`}
                                              onClick={e => { e.stopPropagation(); readOne(n.id); setShowNotifs(false) }}
                                              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white border border-teal-200 hover:border-teal-400 hover:bg-teal-50 transition-colors mb-1.5 max-w-full group"
                                            >
                                              <BookOpen className="w-3 h-3 text-teal-500 flex-shrink-0" />
                                              <span className="font-paragraph text-[10px] text-teal-700 group-hover:text-teal-900 truncate font-medium">
                                                {n.listing_name}
                                              </span>
                                            </Link>
                                          )}

                                          {/* Time */}
                                          <p className="font-paragraph text-[10px] text-muted-foreground/50">
                                            {new Date(n.created_at).toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                          </p>
                                        </div>
                                      </div>
                                    </button>
                                  )
                                })}
                              </div>
                            )}
                          </div>
                        </div>
                      </>
                    )}
                  </div>

                  <div className="w-px h-6 bg-teal-100 mx-1.5" />

                  {/* Avatar dropdown */}
                  <div className="relative">
                    <button
                      onClick={() => { setShowUserMenu(v => !v); setShowNotifs(false) }}
                      className="flex items-center gap-2 pl-1.5 pr-2.5 py-1.5 rounded-full border border-teal-100 bg-teal-50/60 hover:bg-teal-50 hover:border-teal-200 hover:shadow-soft transition-all duration-200"
                    >
                      <div className="w-7 h-7 rounded-full overflow-hidden flex-shrink-0 border-2 border-white shadow-sm">
                        {currentUser.avatar_url ? (
                          <img src={getAvatarUrl(currentUser.avatar_url)} alt={currentUser.username} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-teal-400 to-teal-600 flex items-center justify-center">
                            <User className="h-3.5 w-3.5 text-white" />
                          </div>
                        )}
                      </div>
                      <span className="hidden md:block font-paragraph text-sm font-semibold text-foreground max-w-[88px] truncate">
                        {currentUser.username}
                      </span>
                      <ChevronDown className={`h-3.5 w-3.5 text-muted-foreground transition-transform duration-200 ${showUserMenu ? 'rotate-180' : ''}`} />
                    </button>

                    {showUserMenu && (
                      <>
                        <div className="fixed inset-0 z-40" onClick={() => setShowUserMenu(false)} />
                        <div className="absolute right-0 top-full mt-2.5 w-56 bg-white rounded-2xl border border-teal-100 shadow-card-hover z-50 overflow-hidden">
                          {/* User info header */}
                          <div className="px-4 py-3.5 bg-gradient-to-br from-teal-50 to-white border-b border-teal-50">
                            <div className="flex items-center gap-2.5">
                              <div className="w-9 h-9 rounded-full overflow-hidden border-2 border-white shadow-sm flex-shrink-0">
                                {currentUser.avatar_url ? (
                                  <img src={getAvatarUrl(currentUser.avatar_url)} alt="" className="w-full h-full object-cover" />
                                ) : (
                                  <div className="w-full h-full bg-gradient-to-br from-teal-400 to-teal-600 flex items-center justify-center">
                                    <User className="h-4 w-4 text-white" />
                                  </div>
                                )}
                              </div>
                              <div className="min-w-0">
                                <p className="font-heading text-sm font-bold text-foreground truncate">{currentUser.username}</p>
                                <p className="font-paragraph text-[11px] text-primary font-medium">
                                  {currentUser.role === 'admin' ? <><ShieldCheck className="h-3.5 w-3.5 inline mr-1" />Admin</> : '✦ Thành viên'}
                                </p>
                              </div>
                            </div>
                            {currentUser.university && (
                              <p className="font-paragraph text-[11px] text-muted-foreground truncate mt-1.5">{currentUser.university}</p>
                            )}
                          </div>

                          <div className="p-1.5">
                            <Link to="/tai-khoan" onClick={() => setShowUserMenu(false)}
                              className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl font-paragraph text-sm text-foreground hover:bg-teal-50 hover:text-primary transition-colors">
                              <User className="h-4 w-4" />Tài khoản của tôi
                            </Link>
                            {currentUser.role === 'admin' && (
                              <Link to="/admin" onClick={() => setShowUserMenu(false)}
                                className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl font-paragraph text-sm text-foreground hover:bg-teal-50 hover:text-primary transition-colors">
                                <BookOpen className="h-4 w-4" />Admin Panel
                              </Link>
                            )}
                            <div className="h-px bg-teal-50 my-1" />
                            <button
                              onClick={() => { logout(); setShowUserMenu(false); navigate('/') }}
                              className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl font-paragraph text-sm text-red-500 hover:bg-red-50 transition-colors text-left">
                              <LogOut className="h-4 w-4" />Đăng xuất
                            </button>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </>
              ) : (
                /* ── Chưa đăng nhập ── */
                <div className="flex items-center gap-2 ml-1">
                  <button
                    onClick={openLogin}
                    className="inline-flex items-center px-4 py-2 rounded-xl font-heading text-sm font-semibold text-primary border border-teal-200 bg-teal-50/60 hover:bg-teal-50 hover:border-teal-300 hover:shadow-soft transition-all duration-200"
                  >
                    Đăng nhập
                  </button>
                  <button
                    onClick={openRegister}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl font-heading text-sm font-semibold text-white bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-400 hover:to-teal-500 shadow-btn hover:shadow-card-hover hover:-translate-y-px transition-all duration-200"
                  >
                    Đăng ký <span className="text-teal-200 text-xs leading-none">✦</span>
                  </button>
                </div>
              )}
            </nav>
          </div>
        </div>
      </header>
    </>
  )
}