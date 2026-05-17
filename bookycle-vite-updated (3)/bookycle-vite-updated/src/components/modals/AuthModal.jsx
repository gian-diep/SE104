import { useState, useEffect } from 'react'
import { X, BookOpen, Eye, EyeOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useAuth } from '@/context/AuthContext'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'

const UNIVERSITIES = [
  'Đại học Bách Khoa TP.HCM',
  'Đại học Kinh Tế TP.HCM',
  'Đại học Khoa học Tự nhiên',
  'Đại học Công nghệ Thông tin',
  'Đại học Sư phạm TP.HCM',
  'Đại học Luật TP.HCM',
  'Đại học Y Dược TP.HCM',
  'Đại học Nông Lâm TP.HCM',
  'Đại học Mở TP.HCM',
  'Trường khác',
]

export default function AuthModal({ isOpen, onClose, defaultTab = 'login' }) {
  const navigate = useNavigate()
  const { login, register } = useAuth()
  const [tab, setTab] = useState(defaultTab)
  useEffect(() => {
    setTab(defaultTab)
  }, [defaultTab])
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  // Login form
  const [loginEmail, setLoginEmail] = useState('')
  const [loginPassword, setLoginPassword] = useState('')

  // Register form
  const [regName, setRegName] = useState('')
  const [regEmail, setRegEmail] = useState('')
  const [regPassword, setRegPassword] = useState('')
  const [regConfirm, setRegConfirm] = useState('')
  const [regUniversity, setRegUniversity] = useState('')

  const handleLogin = async (e) => {
    e.preventDefault()
    setError('')
    setIsSubmitting(true)
    try {
      const user = await login(loginEmail, loginPassword)
      if (user.role === 'admin') {
        navigate('/admin')
}
      onClose()
      if (user.role === 'admin') {
        navigate('/admin')
      } else {
        navigate('/')
      }
    }catch (err) {
      setError(err.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleRegister = async (e) => {
    e.preventDefault()
    setError('')
    if (regPassword !== regConfirm) {
      setError('Mật khẩu xác nhận không khớp')
      return
    }
    if (regPassword.length < 6) {
      setError('Mật khẩu phải có ít nhất 6 ký tự')
      return
    }
    setIsSubmitting(true)
    try {
      await register(regName, regEmail, regPassword, regUniversity)
      onClose()
    } catch (err) {
      setError(err.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          onClick={onClose}
        />

        {/* Modal */}
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 16 }}
          transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
          className="relative z-10 w-full max-w-md mx-4 bg-background border border-secondary shadow-2xl"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-8 pt-8 pb-6 border-b border-secondary">
            <div className="flex items-center gap-3">
              <BookOpen className="h-6 w-6 text-primary" />
              <span className="font-heading text-lg uppercase tracking-widest">Bookycle</span>
            </div>
            <button
              onClick={onClose}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-secondary">
            <button
              onClick={() => { setTab('login'); setError('') }}
              className={`flex-1 py-4 font-heading text-sm uppercase tracking-widest transition-colors ${
                tab === 'login'
                  ? 'text-primary border-b-2 border-primary'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Đăng nhập
            </button>
            <button
              onClick={() => { setTab('register'); setError('') }}
              className={`flex-1 py-4 font-heading text-sm uppercase tracking-widest transition-colors ${
                tab === 'register'
                  ? 'text-primary border-b-2 border-primary'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Đăng ký
            </button>
          </div>

          <div className="px-8 py-8">
            {error && (
              <div className="mb-6 px-4 py-3 bg-red-500/10 border border-red-500/30 text-red-500 font-paragraph text-sm">
                {error}
              </div>
            )}

            {tab === 'login' ? (
              <form onSubmit={handleLogin} className="space-y-5">
                <div className="space-y-2">
                  <label className="font-heading text-xs uppercase tracking-widest text-muted-foreground">
                    Email
                  </label>
                  <Input
                    type="email"
                    placeholder="email@example.com"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    required
                    className="h-12 rounded-none border-secondary focus-visible:ring-primary font-paragraph bg-transparent"
                  />
                </div>
                <div className="space-y-2">
                  <label className="font-heading text-xs uppercase tracking-widest text-muted-foreground">
                    Mật khẩu
                  </label>
                  <div className="relative">
                    <Input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      required
                      className="h-12 rounded-none border-secondary focus-visible:ring-primary font-paragraph bg-transparent pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full h-12 rounded-none bg-primary text-primary-foreground hover:bg-primary/90 font-heading uppercase tracking-widest text-sm"
                >
                  {isSubmitting ? 'Đang đăng nhập...' : 'Đăng nhập'}
                </Button>
                <p className="text-center font-paragraph text-sm text-muted-foreground">
                  Demo: <span className="text-foreground">user@bookycle.com / user123</span>
                </p>
              </form>
            ) : (
              <form onSubmit={handleRegister} className="space-y-4">
                <div className="space-y-2">
                  <label className="font-heading text-xs uppercase tracking-widest text-muted-foreground">
                    Họ và tên
                  </label>
                  <Input
                    type="text"
                    placeholder="Nguyễn Văn A"
                    value={regName}
                    onChange={(e) => setRegName(e.target.value)}
                    required
                    className="h-12 rounded-none border-secondary focus-visible:ring-primary font-paragraph bg-transparent"
                  />
                </div>
                <div className="space-y-2">
                  <label className="font-heading text-xs uppercase tracking-widest text-muted-foreground">
                    Email
                  </label>
                  <Input
                    type="email"
                    placeholder="email@example.com"
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    required
                    className="h-12 rounded-none border-secondary focus-visible:ring-primary font-paragraph bg-transparent"
                  />
                </div>
                <div className="space-y-2">
                  <label className="font-heading text-xs uppercase tracking-widest text-muted-foreground">
                    Trường đại học
                  </label>
                  <select
                    value={regUniversity}
                    onChange={(e) => setRegUniversity(e.target.value)}
                    className="w-full h-12 rounded-none border border-secondary bg-transparent font-paragraph text-sm px-3 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    <option value="">-- Chọn trường --</option>
                    {UNIVERSITIES.map((u) => (
                      <option key={u} value={u}>{u}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="font-heading text-xs uppercase tracking-widest text-muted-foreground">
                    Mật khẩu
                  </label>
                  <div className="relative">
                    <Input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Tối thiểu 6 ký tự"
                      value={regPassword}
                      onChange={(e) => setRegPassword(e.target.value)}
                      required
                      className="h-12 rounded-none border-secondary focus-visible:ring-primary font-paragraph bg-transparent pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="font-heading text-xs uppercase tracking-widest text-muted-foreground">
                    Xác nhận mật khẩu
                  </label>
                  <Input
                    type="password"
                    placeholder="Nhập lại mật khẩu"
                    value={regConfirm}
                    onChange={(e) => setRegConfirm(e.target.value)}
                    required
                    className="h-12 rounded-none border-secondary focus-visible:ring-primary font-paragraph bg-transparent"
                  />
                </div>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full h-12 rounded-none bg-primary text-primary-foreground hover:bg-primary/90 font-heading uppercase tracking-widest text-sm mt-2"
                >
                  {isSubmitting ? 'Đang tạo tài khoản...' : 'Tạo tài khoản'}
                </Button>
                <p className="text-center font-paragraph text-xs text-muted-foreground">
                  Mặc định vai trò: <span className="text-foreground font-semibold">Người dùng</span>. Admin do nhóm phát triển phân quyền.
                </p>
              </form>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
