import { useState, useEffect } from 'react'
import { X, Eye, EyeOff, BookOpen, Sparkles, AlertTriangle, Send, CheckCircle, Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useAuth } from '@/context/AuthContext'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import logo from '@/logo.png'
import { checkAppeal, createAppeal } from '@/lib/Appealapi.js'

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
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const [loginEmail, setLoginEmail] = useState('')
  const [loginPassword, setLoginPassword] = useState('')

  const [regName, setRegName] = useState('')
  const [regEmail, setRegEmail] = useState('')
  const [regPassword, setRegPassword] = useState('')
  const [regConfirm, setRegConfirm] = useState('')
  const [regUniversity, setRegUniversity] = useState('')

  // ── Ban Appeal state ──────────────────────────────────────────────────────
  const [banInfo, setBanInfo] = useState(null)          // { userId, banUntil? }
  const [appealView, setAppealView] = useState('check') // 'check' | 'form' | 'submitted' | 'already'
  const [appealText, setAppealText] = useState('')
  const [appealLoading, setAppealLoading] = useState(false)
  const [appealData, setAppealData] = useState(null)    // appeal từ server nếu đã gửi

  useEffect(() => { setTab(defaultTab) }, [defaultTab])

  useEffect(() => {
    if (!isOpen) reset_form()
  }, [isOpen])

  const reset_form = () => {
    setError(''); setShowPassword(false)
    setLoginEmail(''); setLoginPassword('')
    setRegName(''); setRegEmail(''); setRegPassword(''); setRegConfirm(''); setRegUniversity('')
    setBanInfo(null); setAppealView('check'); setAppealText(''); setAppealData(null)
  }

  const handle_close = () => { reset_form(); onClose() }

  // ── Login ─────────────────────────────────────────────────────────────────

  const handleLogin = async (e) => {
    e.preventDefault()
    setError(''); setIsSubmitting(true)
    try {
      const user = await login(loginEmail, loginPassword)
      reset_form(); onClose()
      if (user.role === 'admin') navigate('/admin')
      else navigate('/')
    } catch (err) {
      const msg = err.message || ''
      // Phát hiện tài khoản bị ban từ error 403
      if (msg.includes('bị khóa') || msg.includes('bị ban') || msg.includes('banned')) {
        // Lấy user_id qua email để check appeal
        await handleBanDetected(loginEmail, msg)
      } else {
        setError(msg)
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  // Khi phát hiện bị ban → tìm userId rồi check appeal
  const handleBanDetected = async (email, banMessage) => {
    try {
      // Gọi API lấy thông tin ban (ta dùng endpoint check appeal để lấy userId)
      // Vì backend không trả userId khi 403, ta cần 1 endpoint nhỏ
      // Workaround: parse banMessage hoặc dùng email-lookup
      // Ta sẽ dùng endpoint GET /users/by-email nếu có, nếu không thì hiện form không cần userId trước
      const isTempBan = banMessage.includes('đến ')
      const banUntil = isTempBan ? banMessage.split('đến ')[1] : null

      setBanInfo({ email, banUntil, banMessage, userId: null })
      setAppealView('check')

      // Fetch userId bằng email qua endpoint check-ban
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/auth/ban-info?email=${encodeURIComponent(email)}`)
      if (res.ok) {
        const data = await res.json()
        setBanInfo(prev => ({ ...prev, userId: data.user_id }))

        // Kiểm tra đã từng khiếu nại chưa
        const appealCheck = await checkAppeal(data.user_id)
        if (appealCheck.submitted) {
          setAppealData(appealCheck.appeal)
          setAppealView('already')
        } else {
          setAppealView('form')
        }
      } else {
        // Không lấy được userId, vẫn hiện thông báo ban
        setAppealView('no_id')
      }
    } catch {
      setAppealView('no_id')
    }
  }

  // ── Submit appeal ─────────────────────────────────────────────────────────

  const handleSubmitAppeal = async () => {
    if (!banInfo?.userId) return
    if (appealText.trim().length < 10) {
      setError('Nội dung khiếu nại phải có ít nhất 10 ký tự')
      return
    }
    setAppealLoading(true); setError('')
    try {
      await createAppeal({ user_id: banInfo.userId, reason: appealText.trim() })
      setAppealView('submitted')
    } catch (err) {
      setError(err.message)
    } finally {
      setAppealLoading(false)
    }
  }

  // ── Register ──────────────────────────────────────────────────────────────

  const handleRegister = async (e) => {
    e.preventDefault()
    setError('')
    if (regPassword !== regConfirm) { setError('Mật khẩu xác nhận không khớp'); return }
    if (regPassword.length < 6) { setError('Mật khẩu phải có ít nhất 6 ký tự'); return }
    setIsSubmitting(true)
    try {
      await register(regName, regEmail, regPassword, regUniversity)
      reset_form(); onClose(); navigate('/')
    } catch (err) {
      setError(err.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!isOpen) return null

  // ── Render ban panel ──────────────────────────────────────────────────────
  const renderBanPanel = () => (
    <div className="px-8 py-7 space-y-5">
      {/* Header cảnh báo */}
      <div className="flex flex-col items-center text-center gap-2">
        <div className="w-14 h-14 rounded-2xl bg-red-100 flex items-center justify-center">
          <AlertTriangle className="w-7 h-7 text-red-500" />
        </div>
        <h3 className="font-heading font-bold text-base text-foreground">Tài khoản bị khóa</h3>
        <p className="font-paragraph text-sm text-muted-foreground">
          {banInfo?.banUntil
            ? <>Tài khoản của bạn bị tạm khóa đến <span className="font-semibold text-foreground">{banInfo.banUntil}</span>.</>
            : 'Tài khoản của bạn đã bị khóa vĩnh viễn.'}
        </p>
      </div>

      {/* Trạng thái khiếu nại */}
      {appealView === 'check' && (
        <div className="flex justify-center">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {appealView === 'no_id' && (
        <div className="px-4 py-3 bg-orange-50 border border-orange-200 rounded-xl text-sm text-orange-700 font-paragraph text-center">
          Không thể tải thông tin tài khoản. Vui lòng thử lại sau.
        </div>
      )}

      {/* Form khiếu nại */}
      {appealView === 'form' && (
        <div className="space-y-4">
          <div className="px-4 py-3 bg-blue-50 border border-blue-200 rounded-xl text-sm text-blue-700 font-paragraph">
            Nếu bạn cho rằng lệnh khóa là không hợp lý, hãy gửi khiếu nại để Admin xem xét.
            <span className="font-semibold"> Bạn chỉ được gửi 1 lần duy nhất.</span>
          </div>

          {error && (
            <div className="px-4 py-3 bg-red-50 border border-red-200 text-red-600 font-paragraph text-sm rounded-xl flex items-center gap-2">
              <span className="text-red-400">⚠</span>{error}
            </div>
          )}

          <div className="space-y-1.5">
            <label className="font-heading text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Nội dung khiếu nại
            </label>
            <textarea
              value={appealText}
              onChange={e => setAppealText(e.target.value)}
              placeholder="Giải thích lý do bạn cho rằng tài khoản bị khóa là không hợp lý..."
              rows={5}
              className="w-full rounded-xl border border-teal-100 bg-surface font-paragraph text-sm px-4 py-3 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
            />
            <p className="text-xs text-muted-foreground text-right">{appealText.length}/1000</p>
          </div>

          <button
            onClick={handleSubmitAppeal}
            disabled={appealLoading || appealText.trim().length < 10}
            className="w-full h-12 rounded-xl bg-teal-gradient text-white font-heading font-semibold text-sm shadow-btn hover:shadow-card-hover hover:-translate-y-0.5 transition-all duration-200 disabled:opacity-60 disabled:translate-y-0 flex items-center justify-center gap-2"
          >
            <Send className="w-4 h-4" />
            {appealLoading ? 'Đang gửi...' : 'Gửi khiếu nại'}
          </button>

          <button
            onClick={handle_close}
            className="w-full text-center font-paragraph text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            Đóng
          </button>
        </div>
      )}

      {/* Đã gửi thành công */}
      {appealView === 'submitted' && (
        <div className="space-y-4 text-center">
          <div className="flex justify-center">
            <div className="w-14 h-14 rounded-2xl bg-green-100 flex items-center justify-center">
              <CheckCircle className="w-7 h-7 text-green-500" />
            </div>
          </div>
          <div>
            <p className="font-heading font-bold text-sm text-foreground">Khiếu nại đã được gửi!</p>
            <p className="font-paragraph text-xs text-muted-foreground mt-1">
              Admin sẽ xem xét và phản hồi sớm nhất có thể. Bạn sẽ nhận được thông báo qua tài khoản.
            </p>
          </div>
          <button
            onClick={handle_close}
            className="w-full h-11 rounded-xl border border-teal-200 text-primary font-heading font-semibold text-sm hover:bg-teal-50 transition-colors"
          >
            Đóng
          </button>
        </div>
      )}

      {/* Đã từng khiếu nại */}
      {appealView === 'already' && (
        <div className="space-y-4">
          <div className="px-4 py-4 bg-gray-50 border border-gray-200 rounded-xl space-y-2">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-muted-foreground" />
              <span className="font-heading text-xs font-semibold text-muted-foreground uppercase tracking-widest">
                Khiếu nại của bạn
              </span>
              <span className={`ml-auto text-xs font-semibold px-2 py-0.5 rounded-full ${
                appealData?.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                appealData?.status === 'approved' ? 'bg-green-100 text-green-700' :
                'bg-red-100 text-red-700'
              }`}>
                {appealData?.status === 'pending' ? 'Đang chờ xét' :
                 appealData?.status === 'approved' ? 'Đã chấp thuận' : 'Bị từ chối'}
              </span>
            </div>
            <p className="font-paragraph text-sm text-foreground line-clamp-3">{appealData?.reason}</p>
            {appealData?.admin_note && (
              <div className="pt-2 border-t border-gray-200">
                <p className="text-xs text-muted-foreground font-heading uppercase tracking-widest mb-1">Phản hồi của Admin</p>
                <p className="font-paragraph text-sm text-foreground">{appealData.admin_note}</p>
              </div>
            )}
          </div>
          <button
            onClick={handle_close}
            className="w-full h-11 rounded-xl border border-teal-200 text-primary font-heading font-semibold text-sm hover:bg-teal-50 transition-colors"
          >
            Đóng
          </button>
        </div>
      )}
    </div>
  )

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/50 backdrop-blur-sm"
          onClick={handle_close}
        />

        {/* Modal */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          className="relative z-10 w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden"
        >
          {/* Decorative top banner */}
          <div className={`px-8 pt-7 pb-8 relative overflow-hidden ${banInfo ? 'bg-gradient-to-br from-red-500 to-rose-600' : 'bg-teal-gradient'}`}>
            <div className="absolute inset-0 opacity-20"
              style={{ backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.4) 1px, transparent 1px)', backgroundSize: '18px 18px' }}
            />
            <div className="relative z-10 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                  <img src={logo} alt="Bookycle" className="w-6 h-6 object-contain" />
                </div>
                <div>
                  <span className="font-heading text-white font-black text-lg tracking-tight">Bookycle</span>
                  <p className="font-paragraph text-white/70 text-xs">Trao đổi tài liệu sinh viên</p>
                </div>
              </div>
              <button
                onClick={handle_close}
                className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors"
              >
                <X className="h-4 w-4 text-white" />
              </button>
            </div>

            {/* Tab switcher — ẩn khi đang hiện màn hình ban */}
            {!banInfo && (
              <div className="relative z-10 mt-6 bg-white/15 rounded-2xl p-1 flex">
                {['login', 'register'].map(t => (
                  <button
                    key={t}
                    onClick={() => { setTab(t); setError('') }}
                    className={`flex-1 py-2.5 rounded-xl font-heading text-sm font-semibold transition-all duration-200 ${
                      tab === t
                        ? 'bg-white text-primary shadow-sm'
                        : 'text-white/80 hover:text-white'
                    }`}
                  >
                    {t === 'login' ? 'Đăng nhập' : 'Đăng ký'}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Content */}
          {banInfo ? renderBanPanel() : (
            <div className="px-8 py-7">
              {error && (
                <div className="mb-5 px-4 py-3 bg-red-50 border border-red-200 text-red-600 font-paragraph text-sm rounded-xl flex items-center gap-2">
                  <span className="text-red-400">⚠</span>
                  {error}
                </div>
              )}

              {/* LOGIN */}
              {tab === 'login' ? (
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="font-heading text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                      Email
                    </label>
                    <Input
                      type="email"
                      placeholder="email@example.com"
                      value={loginEmail}
                      onChange={e => setLoginEmail(e.target.value)}
                      required
                      className="h-12 rounded-xl border-teal-100 focus-visible:ring-primary font-paragraph bg-surface text-sm"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="font-heading text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                      Mật khẩu
                    </label>
                    <div className="relative">
                      <Input
                        type={showPassword ? 'text' : 'password'}
                        placeholder="••••••••"
                        value={loginPassword}
                        onChange={e => setLoginPassword(e.target.value)}
                        required
                        className="h-12 rounded-xl border-teal-100 focus-visible:ring-primary font-paragraph bg-surface text-sm pr-10"
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

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full h-12 rounded-xl bg-teal-gradient text-white font-heading font-semibold text-sm shadow-btn hover:shadow-card-hover hover:-translate-y-0.5 transition-all duration-200 disabled:opacity-60 disabled:translate-y-0"
                  >
                    {isSubmitting ? 'Đang đăng nhập...' : 'Đăng nhập'}
                  </button>

                  <p className="text-center font-paragraph text-xs text-muted-foreground pt-1">
                    Chưa có tài khoản?{' '}
                    <button type="button" onClick={() => setTab('register')} className="text-primary font-semibold hover:underline">
                      Đăng ký ngay
                    </button>
                  </p>
                </form>
              ) : (
                /* REGISTER */
                <form onSubmit={handleRegister} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="font-heading text-xs font-semibold uppercase tracking-widest text-muted-foreground">Họ và tên</label>
                    <Input
                      type="text"
                      placeholder="Nguyễn Văn A"
                      value={regName}
                      onChange={e => setRegName(e.target.value)}
                      required
                      className="h-11 rounded-xl border-teal-100 focus-visible:ring-primary font-paragraph bg-surface text-sm"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="font-heading text-xs font-semibold uppercase tracking-widest text-muted-foreground">Email</label>
                    <Input
                      type="email"
                      placeholder="email@example.com"
                      value={regEmail}
                      onChange={e => setRegEmail(e.target.value)}
                      required
                      className="h-11 rounded-xl border-teal-100 focus-visible:ring-primary font-paragraph bg-surface text-sm"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="font-heading text-xs font-semibold uppercase tracking-widest text-muted-foreground">Trường đại học</label>
                    <select
                      value={regUniversity}
                      onChange={e => setRegUniversity(e.target.value)}
                      className="w-full h-11 rounded-xl border border-teal-100 bg-surface font-paragraph text-sm px-3 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                    >
                      <option value="">-- Chọn trường --</option>
                      {UNIVERSITIES.map(u => <option key={u} value={u}>{u}</option>)}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="font-heading text-xs font-semibold uppercase tracking-widest text-muted-foreground">Mật khẩu</label>
                      <div className="relative">
                        <Input
                          type={showPassword ? 'text' : 'password'}
                          placeholder="≥ 6 ký tự"
                          value={regPassword}
                          onChange={e => setRegPassword(e.target.value)}
                          required
                          className="h-11 rounded-xl border-teal-100 focus-visible:ring-primary font-paragraph bg-surface text-sm pr-9"
                        />
                        <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                          {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                        </button>
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <label className="font-heading text-xs font-semibold uppercase tracking-widest text-muted-foreground">Xác nhận</label>
                      <Input
                        type="password"
                        placeholder="Nhập lại"
                        value={regConfirm}
                        onChange={e => setRegConfirm(e.target.value)}
                        required
                        className="h-11 rounded-xl border-teal-100 focus-visible:ring-primary font-paragraph bg-surface text-sm"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full h-12 rounded-xl bg-teal-gradient text-white font-heading font-semibold text-sm shadow-btn hover:shadow-card-hover hover:-translate-y-0.5 transition-all duration-200 disabled:opacity-60 disabled:translate-y-0 mt-1"
                  >
                    {isSubmitting ? 'Đang tạo tài khoản...' : 'Tạo tài khoản'}
                  </button>

                  <p className="text-center font-paragraph text-xs text-muted-foreground pt-1">
                    Đã có tài khoản?{' '}
                    <button type="button" onClick={() => setTab('login')} className="text-primary font-semibold hover:underline">
                      Đăng nhập
                    </button>
                  </p>
                </form>
              )}
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  )
}