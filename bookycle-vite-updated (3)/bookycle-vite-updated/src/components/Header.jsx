import { Link, useNavigate } from 'react-router-dom'
import { BookOpen, LogOut, User, PlusCircle, MessageCircle } from 'lucide-react'
import { useState } from 'react'
import { useAuth } from '@/context/AuthContext'
import AuthModal from '@/components/modals/AuthModal'
import { Button } from '@/components/ui/button'
import { Image } from '@/components/ui/image'
import logo from '@/logo.png'
import { API_URL } from '@/lib/Api'

function getAvatarUrl(avatarUrl) {
  if (!avatarUrl) return null
  if (avatarUrl.startsWith('http') || avatarUrl.startsWith('data:')) return avatarUrl
  return `${API_URL}/avatars/${avatarUrl}`
}

export default function Header() {
  const { currentUser, logout, STORAGE_KEYS } = useAuth()
  const navigate = useNavigate()
  const [showAuth, setShowAuth] = useState(false)
  const [authTab, setAuthTab] = useState('login')
  const [showUserMenu, setShowUserMenu] = useState(false)

  const openLogin = () => { setAuthTab('login'); setShowAuth(true) }
  const openRegister = () => { setAuthTab('register'); setShowAuth(true) }

  const getPendingCount = () => {
    if (!currentUser) return 0
    try {
      const requests = JSON.parse(localStorage.getItem(STORAGE_KEYS.CHAT_REQUESTS) || '[]')
      const sessions = JSON.parse(localStorage.getItem(STORAGE_KEYS.CHAT_SESSIONS) || '[]')
      const pendingReqs = requests.filter(r => r.sellerId === currentUser.id && r.status === 'pending').length
      const activeSessions = sessions.filter(s => (s.sellerId === currentUser.id || s.buyerId === currentUser.id) && s.status === 'active').length
      return pendingReqs + activeSessions
    } catch { return 0 }
  }

  const pendingCount = getPendingCount()

  // console.log(currentUser)

  return (
    <>
      <header className="w-full border-b border-secondary bg-background sticky top-0 z-50">
        <div className="max-w-[100rem] mx-auto px-6 md:px-[80px] py-[20px]">
          <div className="grid grid-cols-12 gap-[24px] items-center">
            <div className="col-span-6 lg:col-span-3">
              <Link to="/" className="flex items-center gap-[12px]">
                <Image src={logo} alt="BookCycle Logo" className="w-9 h-9 object-contain"/>
                <span className="font-heading text-2xl text-foreground font-bold uppercase">Bookycle</span>
              </Link>
            </div>
            <nav className="col-span-6 lg:col-span-9 flex items-center justify-end gap-4 md:gap-6">
              <a href="/#search" className="font-paragraph text-sm md:text-base text-foreground hover:text-primary transition-colors">
                Tìm kiếm
              </a>
              {currentUser ? (
                <>
                  <Link to="/dang-ban" className="hidden md:flex items-center gap-2 font-paragraph text-sm text-foreground hover:text-primary transition-colors">
                    <PlusCircle className="h-4 w-4" />Đăng bán
                  </Link>
                  <Link to="/tin-nhan" className="relative hidden md:flex items-center gap-2 font-paragraph text-sm text-foreground hover:text-primary transition-colors">
                    <MessageCircle className="h-4 w-4" />Tin nhắn
                    {pendingCount > 0 && (
                      <span className="absolute -top-1.5 -right-2.5 w-4 h-4 bg-primary text-primary-foreground rounded-full text-[10px] flex items-center justify-center font-bold">{pendingCount}</span>
                    )}
                  </Link>
                  <div className="relative">
                    <button onClick={() => setShowUserMenu(!showUserMenu)} className="flex items-center gap-2 font-paragraph text-sm text-foreground hover:text-primary transition-colors">
                      <div className="w-8 h-8 rounded-full overflow-hidden bg-primary/20 flex items-center justify-center border border-primary/30">
                        {currentUser.avatar_url ? (
                          <img
                            src={getAvatarUrl(currentUser.avatar_url)}
                            alt={currentUser.username}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <User className="h-4 w-4 text-primary" />
                        )}
                      </div>
                      <span className="hidden md:block max-w-[100px] truncate">{currentUser.username}</span>
                    </button>
                    {showUserMenu && (
                      <>
                        <div className="fixed inset-0 z-40" onClick={() => setShowUserMenu(false)} />
                        <div className="absolute right-0 top-full mt-2 w-52 bg-background border border-secondary shadow-xl z-50">
                          <div className="px-4 py-3 border-b border-secondary">
                            <p className="font-heading text-xs uppercase tracking-widest text-muted-foreground">{currentUser.role === 'admin' ? '👑 Admin' : '👤 Người dùng'}</p>
                            <p className="font-paragraph text-sm text-foreground truncate mt-1">{currentUser.username}</p>
                            {currentUser.university && <p className="font-paragraph text-xs text-muted-foreground truncate">{currentUser.university}</p>}
                          </div>
                          <Link to="/dang-ban" onClick={() => setShowUserMenu(false)} className="flex items-center gap-2 px-4 py-3 font-paragraph text-sm text-foreground hover:bg-secondary/30 hover:text-primary transition-colors md:hidden">
                            <PlusCircle className="h-4 w-4" />Đăng bán
                          </Link>
                          <Link to="/tin-nhan" onClick={() => setShowUserMenu(false)} className="flex items-center gap-2 px-4 py-3 font-paragraph text-sm text-foreground hover:bg-secondary/30 hover:text-primary transition-colors md:hidden">
                            <MessageCircle className="h-4 w-4" />Tin nhắn {pendingCount > 0 && `(${pendingCount})`}
                          </Link>
                          <Link
                            to="/tai-khoan"
                            onClick={() => setShowUserMenu(false)}
                            className="flex items-center gap-2 px-4 py-3 font-paragraph text-sm text-foreground hover:bg-secondary/30 hover:text-primary transition-colors"
                          >
                            <User className="h-4 w-4" />
                            Tài khoản
                          </Link>
                          <button onClick={() => { logout(); setShowUserMenu(false); navigate('/') }} className="w-full flex items-center gap-2 px-4 py-3 font-paragraph text-sm text-foreground hover:bg-secondary/30 hover:text-red-500 transition-colors text-left">
                            <LogOut className="h-4 w-4" />Đăng xuất
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </>
              ) : (
                <div className="flex items-center gap-2">
                  <button onClick={openLogin} className="font-paragraph text-sm text-foreground hover:text-primary transition-colors">Đăng nhập</button>
                  <Button onClick={openRegister} className="h-9 px-4 rounded-none bg-primary text-primary-foreground hover:bg-primary/90 font-heading text-xs uppercase tracking-widest">Đăng ký</Button>
                </div>
              )}
            </nav>
          </div>
        </div>
      </header>
      <AuthModal isOpen={showAuth} onClose={() => setShowAuth(false)} defaultTab={authTab} />
    </>
  )
}