import { Mail, Heart } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Image } from '@/components/ui/image'
import logo from '@/logo.png'
import { useAuth } from '@/context/AuthContext'
import { useState } from 'react'
import AuthModal from '@/components/modals/AuthModal'

export default function Footer() {
  const { currentUser } = useAuth()
  const [authModal, setAuthModal] = useState({ open: false, tab: 'login' })

  const openLogin    = () => setAuthModal({ open: true, tab: 'login' })
  const openRegister = () => setAuthModal({ open: true, tab: 'register' })
  const closeAuth    = () => setAuthModal(m => ({ ...m, open: false }))

  return (
    <>
      <AuthModal
        isOpen={authModal.open}
        onClose={closeAuth}
        defaultTab={authModal.tab}
      />

      <footer className="w-full bg-foreground text-white relative overflow-hidden">

        {/* Ảnh nền: dot grid + wavy waves */}
        <div className="absolute inset-0 pointer-events-none select-none" aria-hidden>
          <svg className="absolute inset-0 w-full h-full opacity-[0.04]" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="footer-dots" x="0" y="0" width="32" height="32" patternUnits="userSpaceOnUse">
                <circle cx="1.5" cy="1.5" r="1.5" fill="white" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#footer-dots)" />
          </svg>
          <svg viewBox="0 0 1440 320" className="absolute bottom-0 left-0 w-full opacity-[0.06]" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M0,160 C360,280 720,40 1080,160 C1260,220 1380,200 1440,180 L1440,320 L0,320 Z" fill="white" />
          </svg>
          <svg viewBox="0 0 1440 320" className="absolute bottom-0 left-0 w-full opacity-[0.035]" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M0,200 C480,100 960,300 1440,140 L1440,320 L0,320 Z" fill="white" />
          </svg>
          <div className="absolute top-0 left-0 w-80 h-80 rounded-full bg-primary/20 blur-3xl -translate-x-1/2 -translate-y-1/2" />
          <div className="absolute bottom-0 right-0 w-96 h-96 rounded-full bg-primary-light/10 blur-3xl translate-x-1/3 translate-y-1/3" />
          <div className="absolute top-1/2 right-1/4 w-64 h-64 rounded-full bg-accent/10 blur-3xl" />
        </div>

        <div className="max-w-[100rem] mx-auto px-6 md:px-16 py-16 relative z-10">
          <div className="grid grid-cols-12 gap-10 mb-12">

            {/* Brand */}
            <div className="col-span-12 lg:col-span-4">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 rounded-xl bg-white/10 backdrop-blur-sm flex items-center justify-center border border-white/20">
                  <Image src={logo} alt="Bookycle" className="w-7 h-7 object-contain brightness-0 invert" />
                </div>
                <span className="font-heading text-xl font-bold text-white">Bookycle</span>
              </div>
              <p className="font-paragraph text-sm text-white/60 leading-relaxed max-w-xs">
                Nền tảng trao đổi tài liệu học tập dành riêng cho sinh viên Việt Nam. Chia sẻ kiến thức, tiết kiệm chi phí.
              </p>
              <div className="flex gap-2 mt-6">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: i < 3 ? 'rgba(20,184,166,0.8)' : 'rgba(255,255,255,0.15)' }} />
                ))}
              </div>
            </div>

            {/* Quick links */}
            <div className="col-span-6 sm:col-span-4 lg:col-span-2 lg:col-start-6">
              <h3 className="font-heading text-sm font-bold uppercase tracking-widest text-white/40 mb-5">Khám phá</h3>
              <ul className="space-y-3">
                {[
                  { href: '/#search', label: 'Tìm tài liệu' },
                  { href: '/dang-ban', label: 'Đăng bán' },
                  { href: '/tin-nhan', label: 'Tin nhắn' },
                ].map(link => (
                  <li key={link.href}>
                    <a href={link.href} className="font-paragraph text-sm text-white/60 hover:text-primary-light transition-colors duration-200 flex items-center gap-2 group">
                      <span className="w-4 h-px bg-white/20 group-hover:bg-primary-light group-hover:w-6 transition-all duration-300" />
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            {/* Auth links — fix: dùng button mở modal thay vì Link */}
            <div className="col-span-6 sm:col-span-4 lg:col-span-2">
              <h3 className="font-heading text-sm font-bold uppercase tracking-widest text-white/40 mb-5">Tài khoản</h3>
              <ul className="space-y-3">
                {currentUser ? (
                  <li>
                    <Link to="/tai-khoan" className="font-paragraph text-sm text-white/60 hover:text-primary-light transition-colors duration-200 flex items-center gap-2 group">
                      <span className="w-4 h-px bg-white/20 group-hover:bg-primary-light group-hover:w-6 transition-all duration-300" />
                      Trang của tôi
                    </Link>
                  </li>
                ) : (
                  <>
                    <li>
                      <button onClick={openLogin} className="font-paragraph text-sm text-white/60 hover:text-primary-light transition-colors duration-200 flex items-center gap-2 group w-full text-left">
                        <span className="w-4 h-px bg-white/20 group-hover:bg-primary-light group-hover:w-6 transition-all duration-300" />
                        Đăng nhập
                      </button>
                    </li>
                    <li>
                      <button onClick={openRegister} className="font-paragraph text-sm text-white/60 hover:text-primary-light transition-colors duration-200 flex items-center gap-2 group w-full text-left">
                        <span className="w-4 h-px bg-white/20 group-hover:bg-primary-light group-hover:w-6 transition-all duration-300" />
                        Đăng ký
                      </button>
                    </li>
                  </>
                )}
              </ul>
            </div>

            {/* Contact */}
            <div className="col-span-12 sm:col-span-4 lg:col-span-2">
              <h3 className="font-heading text-sm font-bold uppercase tracking-widest text-white/40 mb-5">Liên hệ</h3>
              <a href="mailto:acolonyofcockroaches@gmail.com" className="flex items-center gap-2.5 text-white/60 hover:text-primary-light transition-colors group">
                <div className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                  <Mail className="h-4 w-4" />
                </div>
                <span className="font-paragraph text-sm">acolonyofcockroaches@gmail.com</span>
              </a>
            </div>

          </div>

          {/* Bottom bar */}
          <div className="border-t border-white/10 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="font-paragraph text-xs text-white/40 flex items-center gap-1.5">
              © {new Date().getFullYear()} Bookycle.
            </p>
            <div className="flex items-center gap-4">
              <span className="font-paragraph text-xs text-white/30">Đồ án SE104</span>
              <div className="w-1 h-1 rounded-full bg-white/20" />
              <span className="font-paragraph text-xs text-white/30">Nhóm 11</span>
            </div>
          </div>
        </div>

      </footer>
    </>
  )
}