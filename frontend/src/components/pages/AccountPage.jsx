import { useState, useEffect, useCallback } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import { Input } from '@/components/ui/input'
import { useAuth } from '@/context/AuthContext'
import { uploadAvatar } from '@/lib/Userapi'
import { getListingsBySeller, updateListing, deleteListing as deleteListingApi, updateTransactionStatus } from '@/lib/Listingapi'
import { API_URL } from '@/lib/Api'
import {
  Clock, CheckCircle, XCircle, Eye, Trash2, AlertCircle,
  Pencil, X, Upload, Save, Info, BookOpen, ClipboardList,
  Tag, Banknote, Star, User, RefreshCw, MessageCircle, PlusCircle,
} from 'lucide-react'

const CATEGORIES  = ['Tài liệu photo', 'Tài liệu online', 'Tài liệu viết tay', 'Giáo trình', 'Sách']
const CONDITIONS  = ['Mới', 'Như mới', 'Tốt', 'Khá tốt', 'Trung bình']
const UNIVERSITIES = [
  'Đại học Bách Khoa TP.HCM', 'Đại học Kinh Tế TP.HCM',
  'Đại học Khoa học Tự nhiên', 'Đại học Công nghệ Thông tin',
  'Đại học Sư phạm TP.HCM', 'Đại học Luật TP.HCM',
  'Đại học Y Dược TP.HCM', 'Đại học Nông Lâm TP.HCM',
  'Đại học Mở TP.HCM', 'Trường khác',
]

function getAvatarUrl(avatarUrl) {
  if (!avatarUrl) return null
  if (avatarUrl.startsWith('http') || avatarUrl.startsWith('data:')) return avatarUrl
  return `${API_URL}/avatars/${avatarUrl}`
}

function getImageUrl(imageId) {
  if (!imageId) return null
  if (imageId.startsWith('http') || imageId.startsWith('data:')) return imageId
  return `${API_URL}/images/${imageId}`
}

const AVATAR_COLORS = ['#0D9488', '#14B8A6', '#0F766E', '#F59E0B', '#10B981', '#6366F1']
function avatarColor(name = '') {
  return AVATAR_COLORS[(String(name).charCodeAt(0) || 0) % AVATAR_COLORS.length]
}
function getInitials(name = '') {
  return name.trim().split(/\s+/).slice(-2).map(w => w[0]?.toUpperCase() || '').join('')
}

function ModerationBadge({ status }) {
  const map = {
    pending:  { label: 'Chờ duyệt',  Icon: Clock,       cls: 'text-amber-600 bg-amber-50 border-amber-200' },
    approved: { label: 'Đã duyệt',   Icon: CheckCircle, cls: 'text-emerald-600 bg-emerald-50 border-emerald-200' },
    rejected: { label: 'Từ chối',    Icon: XCircle,     cls: 'text-red-500 bg-red-50 border-red-200' },
  }
  const { label, Icon, cls } = map[status] ?? map.pending
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full border font-heading text-[10px] font-semibold uppercase tracking-wide ${cls}`}>
      <Icon className="h-3 w-3" />{label}
    </span>
  )
}

function TransactionBadge({ status }) {
  const map = {
    available:   { label: 'Còn hàng',   Icon: CheckCircle,  cls: 'text-emerald-600 bg-emerald-50 border-emerald-200' },
    negotiating: { label: 'Thương lượng', Icon: MessageCircle, cls: 'text-blue-600 bg-blue-50 border-blue-200' },
    sold:        { label: 'Đã bán',      Icon: XCircle,      cls: 'text-muted-foreground bg-surface border-border' },
  }
  const { label, Icon, cls } = map[status] ?? map.available
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full border font-heading text-[10px] font-semibold uppercase tracking-wide ${cls}`}>
      <Icon className="h-3 w-3" />{label}
    </span>
  )
}

function StarRating({ rating, count }) {
  return (
    <div className="flex items-center gap-1.5">
      <div className="flex items-center">
        {[1,2,3,4,5].map(s => (
          <Star key={s} className={`h-4 w-4 ${s <= Math.round(rating) ? 'text-amber-400 fill-amber-400' : 'text-muted-foreground/20'}`} />
        ))}
      </div>
      <span className="font-paragraph text-sm text-muted-foreground">
        {rating > 0 ? `${rating.toFixed(1)} (${count} đánh giá)` : 'Chưa có đánh giá'}
      </span>
    </div>
  )
}

// ── Edit Panel (slide-in drawer) ──────────────────────────────────────────────
function EditPanel({ listing, onClose, onSaved }) {
  const [form, setForm] = useState({
    item_name:        listing.item_name        || '',
    item_price:       listing.item_price ?? '',
    item_description: listing.item_description || '',
    category:         listing.category         || '',
    condition:        listing.condition        || '',
    subject:          listing.subject          || '',
    university:       listing.university       || '',
    keywords:         listing.keywords         || '',
  })
  const [error, setError]   = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved]   = useState(false)

  const set = f => e => setForm(p => ({ ...p, [f]: e.target.value }))

  const handleSave = async () => {
    setError('')
    if (!form.item_name.trim())  { setError('Vui lòng nhập tên tài liệu'); return }
    if (!form.category)          { setError('Vui lòng chọn phân loại');    return }
    if (!form.condition)         { setError('Vui lòng chọn tình trạng');   return }
    const price = form.item_price === '' ? 0 : parseFloat(form.item_price)
    if (isNaN(price) || price < 0) { setError('Giá không hợp lệ'); return }

    setSaving(true)
    try {
      await updateListing(listing.id, {
        item_name:        form.item_name.trim(),
        item_price:       price,
        item_description: form.item_description.trim(),
        category:         form.category,
        condition:        form.condition,
        subject:          form.subject.trim(),
        university:       form.university,
        keywords:         form.keywords.trim(),
      })
      setSaved(true)
      setTimeout(() => { onSaved(); onClose() }, 900)
    } catch (err) {
      setError(err.message || 'Lỗi khi lưu')
    } finally {
      setSaving(false)
    }
  }

  const inputCls  = 'h-11 rounded-xl border-teal-100 focus-visible:ring-primary font-paragraph bg-surface text-sm'
  const selectCls = 'w-full h-11 rounded-xl border border-teal-100 bg-surface font-paragraph text-sm px-3 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30'
  const labelCls  = 'font-heading text-xs font-semibold uppercase tracking-widest text-muted-foreground'

  return (
    <>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      <motion.div
        initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 28, stiffness: 280 }}
        className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-xl bg-white shadow-2xl flex flex-col rounded-l-3xl overflow-hidden border-l border-teal-100"
      >
        {/* Header */}
        <div className="bg-teal-gradient px-6 py-5 flex items-center justify-between flex-shrink-0">
          <div>
            <p className="font-heading text-white/70 text-xs uppercase tracking-widest mb-0.5">Chỉnh sửa bài đăng</p>
            <h2 className="font-heading text-white font-bold text-base leading-tight line-clamp-1">{listing.item_name}</h2>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors">
            <X className="h-4 w-4 text-white" />
          </button>
        </div>

        {/* Notice */}
        <div className="flex items-start gap-2 px-6 py-3 bg-amber-50 border-b border-amber-200 flex-shrink-0">
          <Info className="h-4 w-4 text-amber-500 flex-shrink-0 mt-0.5" />
          <p className="font-paragraph text-xs text-amber-700">
            Sau khi lưu, bài đăng sẽ chuyển về <strong>Chờ duyệt</strong> cho đến khi Admin duyệt lại.
          </p>
        </div>

        {/* Form */}
        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-4 bg-background">
          <div className="space-y-1.5">
            <label className={labelCls}>Tên tài liệu *</label>
            <Input value={form.item_name} onChange={set('item_name')} placeholder="VD: Giáo trình Giải tích 1" className={inputCls} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className={labelCls}>Phân loại *</label>
              <select value={form.category} onChange={set('category')} className={selectCls}>
                <option value="">-- Chọn --</option>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className={labelCls}>Tình trạng *</label>
              <select value={form.condition} onChange={set('condition')} className={selectCls}>
                <option value="">-- Chọn --</option>
                {CONDITIONS.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className={labelCls}>Môn học</label>
              <Input value={form.subject} onChange={set('subject')} placeholder="VD: Giải tích" className={inputCls} />
            </div>
            <div className="space-y-1.5">
              <label className={labelCls}>Giá (VNĐ)</label>
              <Input type="number" min="0" value={form.item_price} onChange={set('item_price')} placeholder="0 = Miễn phí" className={inputCls} />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className={labelCls}>Trường đại học</label>
            <select value={form.university} onChange={set('university')} className={selectCls}>
              <option value="">-- Chọn trường --</option>
              {UNIVERSITIES.map(u => <option key={u} value={u}>{u}</option>)}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className={labelCls}>Mô tả chi tiết</label>
            <textarea value={form.item_description} onChange={set('item_description')} rows={4}
              placeholder="Mô tả tình trạng, nội dung, lý do bán..."
              className="w-full rounded-xl border border-teal-100 bg-surface font-paragraph text-sm px-3 py-2.5 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none" />
          </div>

          <div className="space-y-1.5">
            <label className={labelCls}>Từ khóa</label>
            <Input value={form.keywords} onChange={set('keywords')} placeholder="VD: giải tích toán vi tích phân" className={inputCls} />
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-teal-100 flex-shrink-0 space-y-3 bg-white">
          {error && (
            <div className="flex items-center gap-2 px-3 py-2.5 bg-red-50 border border-red-200 rounded-xl">
              <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0" />
              <p className="font-paragraph text-sm text-red-500">{error}</p>
            </div>
          )}
          <div className="flex gap-3">
            <button onClick={handleSave} disabled={saving || saved}
              className="flex-1 h-12 rounded-xl bg-teal-gradient text-white font-heading font-semibold text-sm flex items-center justify-center gap-2 shadow-btn hover:shadow-card-hover hover:-translate-y-0.5 transition-all disabled:opacity-60 disabled:translate-y-0">
              {saved
                ? <><CheckCircle className="h-4 w-4" />Đã lưu!</>
                : saving ? 'Đang lưu...'
                : <><Save className="h-4 w-4" />Lưu thay đổi</>
              }
            </button>
            <button onClick={onClose} disabled={saving}
              className="h-12 px-5 rounded-xl border border-teal-100 font-heading font-semibold text-sm text-foreground hover:border-primary hover:text-primary transition-colors">
              Hủy
            </button>
          </div>
        </div>
      </motion.div>
    </>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
export default function AccountPage() {
  const { currentUser, isLoading, updateProfile, deleteAccount } = useAuth()
  const navigate = useNavigate()

  const [username, setUsername]         = useState('')
  const [university, setUniversity]     = useState('')
  const [password, setPassword]         = useState('')
  const [avatarFile, setAvatarFile]     = useState(null)
  const [avatarPreview, setAvatarPreview] = useState(null)
  const [message, setMessage]           = useState('')
  const [saving, setSaving]             = useState(false)

  useEffect(() => {
    if (currentUser) {
      setUsername(currentUser.username || '')
      setUniversity(currentUser.university || '')
    }
  }, [currentUser])

  const [myListings,      setMyListings]      = useState([])
  const [listingsLoading, setListingsLoading] = useState(false)
  const [activeTab,       setActiveTab]       = useState('profile')
  const [listingFilter,   setListingFilter]   = useState('all')
  const [editingListing,  setEditingListing]  = useState(null)

  const loadMyListings = useCallback(async () => {
    if (!currentUser) return
    setListingsLoading(true)
    try {
      const data = await getListingsBySeller(currentUser.id)
      setMyListings(data.sort((a, b) => new Date(b.created_at) - new Date(a.created_at)))
    } catch (err) {
      console.error('Load listings error:', err)
    } finally {
      setListingsLoading(false)
    }
  }, [currentUser])

  useEffect(() => {
    if (activeTab === 'listings') loadMyListings()
  }, [activeTab, loadMyListings])

  const handleAvatarChange = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setAvatarFile(file)
    const reader = new FileReader()
    reader.onloadend = () => setAvatarPreview(reader.result)
    reader.readAsDataURL(file)
  }

  const handleProfileSubmit = async (e) => {
    e.preventDefault(); setMessage(''); setSaving(true)
    try {
      let avatarUrl = currentUser?.avatar_url || null
      if (avatarFile) {
        const res = await uploadAvatar(avatarFile)
        avatarUrl = res.avatar_id
      }
      await updateProfile({
        username:   username.trim() || undefined,
        university: university.trim() || undefined,
        avatar_url: avatarUrl,
        password:   password || undefined,
      })
      setMessage('Cập nhật thành công'); setPassword(''); setAvatarFile(null)
    } catch (err) {
      setMessage(err.message || 'Lỗi khi cập nhật')
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteAccount = async () => {
    if (!confirm('Bạn có chắc muốn xóa tài khoản? Hành động này không thể hoàn tác.')) return
    try { await deleteAccount(); navigate('/') }
    catch (err) { setMessage(err.message || 'Lỗi khi xóa tài khoản') }
  }

  const handleDeleteListing = async (listing) => {
    if (listing.status === 'negotiating') { alert('Không thể xóa bài đăng đang trong tình trạng thương lượng.'); return }
    if (!confirm('Xóa bài đăng này? Hành động không thể hoàn tác.')) return
    try { await deleteListingApi(listing.id); loadMyListings() }
    catch (err) { alert(err.message || 'Lỗi khi xóa bài đăng') }
  }

  const handleUpdateTransactionStatus = async (listing, newStatus) => {
    try { await updateTransactionStatus(listing.id, newStatus); loadMyListings() }
    catch (err) { alert(err.message || 'Lỗi khi cập nhật trạng thái giao dịch') }
  }

  const counts = {
    all:      myListings.length,
    pending:  myListings.filter(l => l.status === 'pending').length,
    approved: myListings.filter(l => l.status === 'approved').length,
    rejected: myListings.filter(l => l.status === 'rejected').length,
  }
  const visibleListings = listingFilter === 'all' ? myListings : myListings.filter(l => l.status === listingFilter)
  const avatarSrc = avatarPreview || getAvatarUrl(currentUser?.avatar_url)

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="relative w-12 h-12">
          <div className="absolute inset-0 rounded-full border-4 border-teal-100" />
          <div className="absolute inset-0 rounded-full border-4 border-t-primary animate-spin" />
        </div>
      </div>
    )
  }

  if (!currentUser) { navigate('/', { replace: true }); return null }

  const MAIN_TABS = [
    { id: 'profile',  label: 'Hồ sơ' },
    { id: 'listings', label: `Bài đăng${counts.all ? ` (${counts.all})` : ''}` },
  ]

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />

      <div className="max-w-4xl mx-auto px-6 py-10">
        {/* Page header */}
        <div className="mb-8">
          <div className="inline-flex items-center gap-2 bg-teal-50 text-primary px-3 py-1.5 rounded-full border border-teal-200 text-xs font-heading font-semibold uppercase tracking-wide mb-3">
            <User className="w-3.5 h-3.5" />
            Tài khoản
          </div>
          <h1 className="font-heading text-4xl md:text-5xl font-black tracking-tighter text-foreground">TÀI KHOẢN</h1>
        </div>

        {/* Main tabs */}
        <div className="flex gap-2 mb-8 p-1.5 bg-white rounded-2xl border border-teal-100 shadow-soft w-fit">
          {MAIN_TABS.map(t => (
            <button key={t.id} onClick={() => setActiveTab(t.id)}
              className={`px-5 py-2.5 rounded-xl font-heading text-sm font-semibold transition-all ${
                activeTab === t.id ? 'bg-teal-gradient text-white shadow-btn' : 'text-muted-foreground hover:text-foreground hover:bg-surface'
              }`}>
              {t.label}
            </button>
          ))}
        </div>

        {/* ══ TAB: HỒ SƠ ══ */}
        {activeTab === 'profile' && (
          <form onSubmit={handleProfileSubmit} className="max-w-lg space-y-5">
            {/* Avatar + info card */}
            <div className="bg-white rounded-3xl border border-teal-100 shadow-card overflow-hidden">
              <div className="h-20 bg-teal-gradient relative">
                <div className="absolute inset-0 opacity-20"
                  style={{ backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.4) 1px, transparent 1px)', backgroundSize: '18px 18px' }} />
              </div>
              <div className="px-6 pb-6">
                <div className="flex items-end gap-4 -mt-8 mb-4">
                  <div className="relative flex-shrink-0">
                    <div className="w-16 h-16 rounded-full border-4 border-white shadow-card overflow-hidden">
                      {avatarSrc ? (
                        <img src={avatarSrc} alt="Avatar" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center font-heading text-xl font-black text-white"
                          style={{ backgroundColor: avatarColor(currentUser?.username) }}>
                          {getInitials(currentUser?.username)}
                        </div>
                      )}
                    </div>
                    <label className="absolute bottom-0 right-0 w-6 h-6 bg-primary text-white rounded-full flex items-center justify-center cursor-pointer hover:bg-primary/90 transition-colors shadow-btn">
                      <Upload className="h-3 w-3" />
                      <input type="file" accept="image/*" onChange={handleAvatarChange} className="hidden" />
                    </label>
                  </div>
                  <div className="flex-1 min-w-0 pb-1">
                    <p className="font-heading text-base font-bold truncate text-foreground">{currentUser?.username}</p>
                    <p className="font-paragraph text-xs text-muted-foreground">{currentUser?.email}</p>
                  </div>
                  {currentUser.role === 'admin' && (
                    <span className="mb-1 px-2.5 py-1 rounded-full bg-primary/10 text-primary font-heading text-[10px] font-semibold uppercase tracking-wide border border-primary/20">
                      Admin
                    </span>
                  )}
                </div>
                <StarRating rating={currentUser.rating ?? 0} count={currentUser.rating_count ?? 0} />
              </div>
            </div>

            {/* Form fields */}
            <div className="bg-white rounded-2xl border border-teal-100 shadow-soft p-6 space-y-4">
              <h3 className="font-heading text-sm font-bold uppercase tracking-wide text-foreground border-b border-teal-50 pb-3">Chỉnh sửa hồ sơ</h3>

              <div className="space-y-1.5">
                <label className="font-heading text-xs font-semibold uppercase tracking-widest text-muted-foreground">Tên người dùng</label>
                <Input value={username} onChange={e => setUsername(e.target.value)}
                  className="h-11 rounded-xl border-teal-100 focus-visible:ring-primary font-paragraph bg-surface text-sm" />
              </div>

              <div className="space-y-1.5">
                <label className="font-heading text-xs font-semibold uppercase tracking-widest text-muted-foreground">Email</label>
                <Input value={currentUser?.email || ''} disabled
                  className="h-11 rounded-xl border-teal-100 font-paragraph bg-surface text-sm opacity-50" />
                <p className="font-paragraph text-xs text-muted-foreground">Email không thể thay đổi</p>
              </div>

              <div className="space-y-1.5">
                <label className="font-heading text-xs font-semibold uppercase tracking-widest text-muted-foreground">Trường học</label>
                <Input value={university} onChange={e => setUniversity(e.target.value)} placeholder="VD: Đại học Bách Khoa TP.HCM"
                  className="h-11 rounded-xl border-teal-100 focus-visible:ring-primary font-paragraph bg-surface text-sm" />
              </div>

              <div className="space-y-1.5">
                <label className="font-heading text-xs font-semibold uppercase tracking-widest text-muted-foreground">Mật khẩu mới</label>
                <Input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Để trống nếu không đổi"
                  className="h-11 rounded-xl border-teal-100 focus-visible:ring-primary font-paragraph bg-surface text-sm" />
              </div>

              {message && (
                <div className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border font-paragraph text-sm ${
                  message.includes('thành công')
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-600'
                    : 'bg-red-50 border-red-200 text-red-600'
                }`}>
                  {message.includes('thành công') ? <CheckCircle className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
                  {message}
                </div>
              )}

              <div className="flex gap-3 pt-1">
                <button type="submit" disabled={saving}
                  className="flex-1 h-11 rounded-xl bg-teal-gradient text-white font-heading font-semibold text-sm shadow-btn hover:shadow-card-hover hover:-translate-y-0.5 transition-all disabled:opacity-60 disabled:translate-y-0">
                  {saving ? 'Đang lưu...' : 'Lưu thay đổi'}
                </button>
                <button type="button" onClick={handleDeleteAccount}
                  className="h-11 px-4 rounded-xl border border-red-200 bg-red-50 text-red-500 font-heading font-semibold text-sm hover:bg-red-100 transition-colors">
                  Xóa TK
                </button>
              </div>
            </div>
          </form>
        )}

        {/* ══ TAB: BÀI ĐĂNG ══ */}
        {activeTab === 'listings' && (
          <div>
            {/* Sub-filter tabs */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex gap-1.5 flex-wrap">
                {[
                  { id: 'all',      label: 'Tất cả',    count: counts.all },
                  { id: 'pending',  label: 'Chờ duyệt', count: counts.pending },
                  { id: 'approved', label: 'Đã duyệt',  count: counts.approved },
                  { id: 'rejected', label: 'Từ chối',   count: counts.rejected },
                ].map(t => (
                  <button key={t.id} onClick={() => setListingFilter(t.id)}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-xl font-heading text-xs font-semibold transition-all ${
                      listingFilter === t.id
                        ? 'bg-teal-gradient text-white shadow-btn'
                        : 'bg-white border border-teal-100 text-muted-foreground hover:text-foreground shadow-soft'
                    }`}>
                    {t.label}
                    {t.count > 0 && (
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                        listingFilter === t.id ? 'bg-white/20 text-white' : 'bg-primary text-white'
                      }`}>{t.count}</span>
                    )}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <button onClick={loadMyListings} disabled={listingsLoading}
                  className="p-2.5 rounded-xl border border-teal-100 bg-white text-muted-foreground hover:text-primary transition-colors shadow-soft">
                  <RefreshCw className={`h-4 w-4 ${listingsLoading ? 'animate-spin' : ''}`} />
                </button>
                <Link to="/dang-ban">
                  <button className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl bg-teal-gradient text-white font-heading text-xs font-semibold shadow-btn hover:shadow-card hover:-translate-y-0.5 transition-all">
                    <PlusCircle className="h-3.5 w-3.5" />Đăng mới
                  </button>
                </Link>
              </div>
            </div>

            {/* Pending notice */}
            {!listingsLoading && counts.pending > 0 && listingFilter !== 'rejected' && (
              <div className="mb-5 flex items-start gap-3 px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl">
                <Clock className="h-4 w-4 text-amber-500 flex-shrink-0 mt-0.5" />
                <p className="font-paragraph text-sm text-amber-700">
                  Bạn có <strong>{counts.pending}</strong> bài đang chờ Admin kiểm duyệt.
                </p>
              </div>
            )}

            {listingsLoading && (
              <div className="py-16 flex flex-col items-center gap-4">
                <div className="relative w-10 h-10">
                  <div className="absolute inset-0 rounded-full border-4 border-teal-100" />
                  <div className="absolute inset-0 rounded-full border-4 border-t-primary animate-spin" />
                </div>
                <p className="font-paragraph text-sm text-muted-foreground">Đang tải...</p>
              </div>
            )}

            {!listingsLoading && visibleListings.length === 0 && (
              <div className="py-20 flex flex-col items-center bg-white rounded-2xl border border-dashed border-teal-200 text-center gap-3">
                <div className="w-16 h-16 rounded-2xl bg-teal-50 flex items-center justify-center">
                  <BookOpen className="h-8 w-8 text-teal-300" />
                </div>
                <p className="font-heading text-base font-bold text-muted-foreground">Chưa có bài đăng nào</p>
                <Link to="/dang-ban">
                  <button className="mt-1 px-5 py-2.5 rounded-xl bg-teal-gradient text-white font-heading text-sm font-semibold shadow-btn hover:shadow-card hover:-translate-y-0.5 transition-all">
                    Đăng bài đầu tiên
                  </button>
                </Link>
              </div>
            )}

            {!listingsLoading && visibleListings.length > 0 && (
              <div className="space-y-3">
                {visibleListings.map(listing => {
                  const thumb = listing.images?.[0] ? getImageUrl(listing.images[0]) : null
                  return (
                    <div key={listing.id}
                      className={`bg-white rounded-2xl border shadow-soft overflow-hidden transition-all ${
                        listing.status === 'rejected' ? 'border-red-200' : 'border-teal-100 hover:shadow-card'
                      }`}>
                      <div className="flex">
                        {/* Thumbnail */}
                        {thumb && (
                          <div className="w-24 flex-shrink-0 hidden sm:block overflow-hidden bg-surface">
                            <img src={thumb} alt={listing.item_name} className="w-full h-full object-cover"
                              onError={e => e.target.style.display='none'} />
                          </div>
                        )}

                        {/* Info */}
                        <div className="flex-1 p-4 min-w-0">
                          <div className="flex flex-wrap items-center gap-2 mb-2">
                            <span className="font-heading text-sm font-bold text-foreground line-clamp-1">{listing.item_name}</span>
                            <ModerationBadge status={listing.status || 'pending'} />
                            <TransactionBadge status={listing.transaction_status || 'available'} />
                          </div>

                          <div className="flex flex-wrap gap-1.5 font-paragraph text-xs text-muted-foreground mb-2">
                            {listing.subject && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-teal-50 text-teal-700 border border-teal-100">
                                <BookOpen className="h-3 w-3" />{listing.subject}
                              </span>
                            )}
                            {listing.condition && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-surface border border-border">
                                {listing.condition}
                              </span>
                            )}
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 border border-amber-100">
                              <Banknote className="h-3 w-3" />
                              {listing.item_price === 0 ? 'Miễn phí' : `${listing.item_price?.toLocaleString('vi-VN')}đ`}
                            </span>
                          </div>

                          {listing.status === 'rejected' && listing.reject_reason && (
                            <div className="flex items-start gap-2 px-3 py-2 bg-red-50 border border-red-200 rounded-xl">
                              <AlertCircle className="h-3.5 w-3.5 text-red-500 flex-shrink-0 mt-0.5" />
                              <p className="font-paragraph text-xs text-red-500">
                                <strong>Lý do từ chối:</strong> {listing.reject_reason}
                              </p>
                            </div>
                          )}
                        </div>

                        {/* Actions */}
                        <div className="flex-shrink-0 flex flex-col border-l border-teal-100 divide-y divide-teal-100">
                          <Link to={`/listings/${listing.id}`}
                            className="flex items-center justify-center gap-1.5 px-4 py-3 font-heading text-[10px] font-semibold uppercase tracking-wide text-muted-foreground hover:text-primary hover:bg-teal-50 transition-colors">
                            <Eye className="h-3.5 w-3.5" />Xem
                          </Link>

                          <button
                            onClick={() => listing.status !== 'sold' && setEditingListing(listing)}
                            disabled={listing.status === 'sold'}
                            className="flex items-center justify-center gap-1.5 px-4 py-3 font-heading text-[10px] font-semibold uppercase tracking-wide text-muted-foreground hover:text-primary hover:bg-teal-50 transition-colors disabled:opacity-30 disabled:cursor-not-allowed">
                            <Pencil className="h-3.5 w-3.5" />Sửa
                          </button>

                          {listing.status === 'approved' && (
                            <select
                              value={listing.transaction_status || 'available'}
                              onChange={e => handleUpdateTransactionStatus(listing, e.target.value)}
                              className="px-3 py-2 font-heading text-[10px] font-semibold uppercase tracking-wide text-muted-foreground bg-transparent hover:bg-teal-50 transition-colors cursor-pointer outline-none border-0 text-center"
                            >
                              <option value="available">Còn hàng</option>
                              <option value="negotiating">Thương lượng</option>
                              <option value="sold">Đã bán</option>
                            </select>
                          )}

                          <button onClick={() => handleDeleteListing(listing)}
                            className="flex items-center justify-center gap-1.5 px-4 py-3 font-heading text-[10px] font-semibold uppercase tracking-wide text-muted-foreground hover:text-red-500 hover:bg-red-50 transition-colors">
                            <Trash2 className="h-3.5 w-3.5" />Xóa
                          </button>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}
      </div>

      <Footer />

      <AnimatePresence>
        {editingListing && (
          <EditPanel
            listing={editingListing}
            onClose={() => setEditingListing(null)}
            onSaved={loadMyListings}
          />
        )}
      </AnimatePresence>
    </div>
  )
}