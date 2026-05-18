import { Link, useNavigate } from 'react-router-dom'
import { LogOut, User, PlusCircle, MessageCircle, BookOpen, ChevronDown, Search } from 'lucide-react'
import { useState } from 'react'
import { useAuth } from '@/context/AuthContext'
import AuthModal from '@/components/modals/AuthModal'
import { Image } from '@/components/ui/image'
import logo from '@/logo.png'
import { API_URL } from '@/lib/Api'

function getAvatarUrl(avatarUrl) {
  if (!avatarUrl) return null
  if (avatarUrl.startsWith('http') || avatarUrl.startsWith('data:')) return avatarUrl
  return `${API_URL}/avatars/${avatarUrl}`
}

/** Icon-only button với tooltip hover */
function NavIconBtn({ to, href, icon: Icon, label, badge }) {
  const cls =
    'relative flex items-center justify-center w-9 h-9 rounded-xl text-muted-foreground hover:text-primary hover:bg-teal-50 transition-all duration-200 group'

  const inner = (
    <>
      <Icon className="h-[18px] w-[18px]" />
      {badge > 0 && (
        <span className="absolute -top-1 -right-1 min-w-[16px] h-4 bg-amber-400 text-white rounded-full text-[9px] flex items-center justify-center font-bold px-0.5 shadow-sm leading-none">
          {badge}
        </span>
      )}
      {/* Tooltip */}
      <span className="pointer-events-none absolute top-full mt-2 left-1/2 -translate-x-1/2 whitespace-nowrap bg-foreground text-white font-paragraph text-[11px] px-2 py-1 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-150 z-50 shadow-card">
        {label}
      </span>
    </>
  )

  if (href) return <a href={href} className={cls}>{inner}</a>
  return <Link to={to} className={cls}>{inner}</Link>
}

export default function Header() {
  const { currentUser, logout, STORAGE_KEYS } = useAuth()
  const navigate = useNavigate()
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [authModal, setAuthModal] = useState({ open: false, tab: 'login' })

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
            <nav className="flex items-center gap-0.5">

              {/* Tìm kiếm — always visible */}
              <NavIconBtn href="/#search" icon={Search} label="Tìm kiếm" />

              {currentUser ? (
                <>
                  <NavIconBtn to="/dang-ban" icon={PlusCircle} label="Đăng bán" />
                  <NavIconBtn to="/tin-nhan" icon={MessageCircle} label="Tin nhắn" badge={pendingCount} />

                  <div className="w-px h-6 bg-teal-100 mx-1.5" />

                  {/* Avatar dropdown */}
                  <div className="relative">
                    <button
                      onClick={() => setShowUserMenu(!showUserMenu)}
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
                                  {currentUser.role === 'admin' ? '👑 Admin' : '✦ Thành viên'}
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