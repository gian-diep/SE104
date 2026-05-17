import { useState, useEffect, useCallback } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/context/AuthContext'
import { Image } from '@/components/ui/image'
import { uploadAvatar } from '@/lib/Userapi'
import { getListingsBySeller, updateListing, deleteListing as deleteListingApi, updateTransactionStatus } from '@/lib/Listingapi'
import { API_URL } from '@/lib/Api'
import {
  Clock, CheckCircle, XCircle, Eye, Trash2, AlertCircle,
  Pencil, X, Upload, Save, Info, BookOpen, ClipboardList,
  Tag, Banknote, Calendar, Star, User, RefreshCw, MessageCircle
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

// ── Helpers ──────────────────────────────────────────────────────────────────

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

// ── Badge trạng thái duyệt ────────────────────────────────────────────────────
function ModerationBadge({ status }) {
  const map = {
    pending:  { label: 'Chờ duyệt',  icon: Clock,       cls: 'text-amber-600 bg-amber-500/10 border-amber-500/30' },
    approved: { label: 'Đã duyệt',   icon: CheckCircle, cls: 'text-green-600 bg-green-500/10 border-green-500/30' },
    rejected: { label: 'Bị từ chối', icon: XCircle,     cls: 'text-red-500  bg-red-500/10  border-red-500/30'  },
  }
  const { label, icon: Icon, cls } = map[status] ?? map.pending
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-1 border font-heading text-[10px] uppercase tracking-widest ${cls}`}>
      <Icon className="h-3 w-3" />{label}
    </span>
  )
}

// ── Badge trạng thái giao dịch ────────────────────────────────────────────────
function TransactionBadge({ status }) {
  const map = {
    available:   { label: 'Còn hàng',         icon: CheckCircle, cls: 'border-green-500/40 bg-green-500/10 text-green-700' },
    negotiating: { label: 'Đang thương lượng', icon: MessageCircle, cls: 'border-blue-500/40 bg-blue-500/10 text-blue-700' },
    sold:        { label: 'Đã bán',            icon: XCircle,     cls: 'border-gray-400/40 bg-gray-400/10 text-gray-500' },
  }
  const { label, icon: Icon, cls } = map[status] ?? map.available
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-1 border font-heading text-[10px] uppercase tracking-widest ${cls}`}>
      <Icon className="h-3 w-3" />{label}
    </span>
  )
}

// ── Stars ─────────────────────────────────────────────────────────────────────
function StarRating({ rating, count }) {
  return (
    <div className="flex items-center gap-1.5">
      <div className="flex items-center">
        {[1,2,3,4,5].map(s => (
          <Star
            key={s}
            className={`h-4 w-4 ${s <= Math.round(rating) ? 'text-amber-400 fill-amber-400' : 'text-muted-foreground/30'}`}
          />
        ))}
      </div>
      <span className="font-paragraph text-sm text-muted-foreground">
        {rating > 0 ? `${rating.toFixed(1)} (${count} đánh giá)` : 'Chưa có đánh giá'}
      </span>
    </div>
  )
}

// ── Edit Panel ────────────────────────────────────────────────────────────────
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

  const inputCls  = 'h-11 rounded-none border-secondary focus-visible:ring-primary font-paragraph bg-transparent text-sm'
  const selectCls = 'w-full h-11 rounded-none border border-secondary bg-transparent font-paragraph text-sm px-3 text-foreground focus:outline-none focus:ring-1 focus:ring-primary'
  const labelCls  = 'font-heading text-xs uppercase tracking-widest text-muted-foreground'

  return (
    <>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
        onClick={onClose} />

      <motion.div
        initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 28, stiffness: 280 }}
        className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-xl bg-background border-l border-secondary shadow-2xl flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-secondary flex-shrink-0">
          <div>
            <p className="font-heading text-xs uppercase tracking-widest text-muted-foreground mb-0.5">[ Chỉnh sửa bài đăng ]</p>
            <h2 className="font-heading text-lg uppercase leading-tight line-clamp-1">{listing.item_name}</h2>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors p-1">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Notice */}
        <div className="flex items-start gap-2 px-6 py-3 bg-amber-500/10 border-b border-amber-500/20 flex-shrink-0">
          <Info className="h-4 w-4 text-amber-500 flex-shrink-0 mt-0.5" />
          <p className="font-paragraph text-xs text-amber-700">
            Sau khi lưu, bài đăng sẽ chuyển về <strong>Chờ duyệt</strong> và ẩn khỏi trang chủ cho đến khi Admin duyệt lại.
          </p>
        </div>

        {/* Form */}
        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-5">

          <div className="space-y-1.5">
            <label className={labelCls}>Tên tài liệu *</label>
            <Input value={form.item_name} onChange={set('item_name')}
              placeholder="VD: Giáo trình Giải tích 1" className={inputCls} />
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
              <label className={labelCls}>Tên môn học</label>
              <Input value={form.subject} onChange={set('subject')}
                placeholder="VD: Giải tích" className={inputCls} />
            </div>
            <div className="space-y-1.5">
              <label className={labelCls}>Giá (VNĐ)</label>
              <Input type="number" min="0" value={form.item_price} onChange={set('item_price')}
                placeholder="0 = Miễn phí" className={inputCls} />
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
              className="w-full rounded-none border border-secondary bg-transparent font-paragraph text-sm px-3 py-2.5 text-foreground focus:outline-none focus:ring-1 focus:ring-primary resize-none" />
          </div>

          <div className="space-y-1.5">
            <label className={labelCls}>Từ khóa</label>
            <Input value={form.keywords} onChange={set('keywords')}
              placeholder="VD: giải tích toán vi tích phân" className={inputCls} />
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-secondary flex-shrink-0 space-y-3">
          {error && (
            <div className="flex items-center gap-2 px-3 py-2 bg-red-500/10 border border-red-500/20">
              <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0" />
              <p className="font-paragraph text-sm text-red-500">{error}</p>
            </div>
          )}
          <div className="flex gap-3">
            <Button onClick={handleSave} disabled={saving || saved}
              className="flex-1 h-12 rounded-none bg-primary text-primary-foreground hover:bg-primary/90 font-heading uppercase tracking-widest text-sm">
              {saved
                ? <><CheckCircle className="h-4 w-4 mr-2" />Đã lưu!</>
                : saving
                  ? 'Đang lưu...'
                  : <><Save className="h-4 w-4 mr-2" />Lưu thay đổi</>
              }
            </Button>
            <Button onClick={onClose} variant="outline" disabled={saving}
              className="h-12 px-5 rounded-none border-secondary hover:border-foreground font-heading uppercase tracking-widest text-sm">
              Hủy
            </Button>
          </div>
        </div>
      </motion.div>
    </>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// MAIN PAGE
// ══════════════════════════════════════════════════════════════════════════════
export default function AccountPage() {
  const { currentUser, updateProfile, deleteAccount } = useAuth()
  const navigate = useNavigate()

// ── Profile state ──────────────────────────────────────────────────────────
const [username, setUsername] = useState('')
const [university, setUniversity] = useState('')
const [password, setPassword] = useState('')
const [avatarFile, setAvatarFile] = useState(null)
const [avatarPreview, setAvatarPreview] = useState(null)
const [message, setMessage] = useState('')
const [saving, setSaving] = useState(false)

// Sync state khi currentUser load xong
useEffect(() => {
  if (currentUser) {
    setUsername(currentUser.username || '')
    setUniversity(currentUser.university || '')
  }
}, [currentUser])

  // ── Listings state ──────────────────────────────────────────────────────────
  const [myListings,     setMyListings]     = useState([])
  const [listingsLoading, setListingsLoading] = useState(false)
  const [activeTab,      setActiveTab]      = useState('profile')
  const [listingFilter,  setListingFilter]  = useState('all')
  const [editingListing, setEditingListing] = useState(null)

  // ── Load listings ──────────────────────────────────────────────────────────
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

  // ── Avatar preview ──────────────────────────────────────────────────────────
  const handleAvatarChange = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setAvatarFile(file)
    const reader = new FileReader()
    reader.onloadend = () => setAvatarPreview(reader.result)
    reader.readAsDataURL(file)
  }

  // ── Profile submit ──────────────────────────────────────────────────────────
  const handleProfileSubmit = async (e) => {
    e.preventDefault()
    setMessage('')
    setSaving(true)
    try {
      let avatarUrl = currentUser?.avatar_url || null

      // Upload avatar nếu có file mới
      if (avatarFile) {
        const res = await uploadAvatar(avatarFile)
        avatarUrl = res.avatar_id   // lưu filename, build URL khi hiển thị
      }

      const payload = {
        username:    username.trim() || undefined,
        university:  university.trim() || undefined,
        avatar_url:  avatarUrl,
        password:    password || undefined,
      }

      await updateProfile(payload)
      setMessage('Cập nhật thành công')
      setPassword('')
      setAvatarFile(null)
    } catch (err) {
      setMessage(err.message || 'Lỗi khi cập nhật')
    } finally {
      setSaving(false)
    }
  }

  // ── Delete account ──────────────────────────────────────────────────────────
  const handleDeleteAccount = async () => {
    if (!confirm('Bạn có chắc muốn xóa tài khoản? Hành động này không thể hoàn tác.')) return
    try {
      await deleteAccount()
      navigate('/')
    } catch (err) {
      setMessage(err.message || 'Lỗi khi xóa tài khoản')
    }
  }

  // ── Delete listing ──────────────────────────────────────────────────────────
  const handleDeleteListing = async (listing) => {
    if (listing.status === 'negotiating') {
      alert('Không thể xóa bài đăng đang trong tình trạng thương lượng.'); return
    }
    if (!confirm('Xóa bài đăng này? Hành động không thể hoàn tác.')) return
    try {
      await deleteListingApi(listing.id)
      loadMyListings()
    } catch (err) {
      alert(err.message || 'Lỗi khi xóa bài đăng')
    }
  }

  const handleUpdateTransactionStatus = async (listing, newStatus) => {
    try {
      await updateTransactionStatus(listing.id, newStatus)
      loadMyListings()
    } catch (err) {
      alert(err.message || 'Lỗi khi cập nhật trạng thái giao dịch')
    }
  }

  // ── Computed ────────────────────────────────────────────────────────────────
  const counts = {
    all:      myListings.length,
    pending:  myListings.filter(l => l.status === 'pending').length,
    approved: myListings.filter(l => l.status === 'approved').length,
    rejected: myListings.filter(l => l.status === 'rejected').length,
  }
  const visibleListings = listingFilter === 'all'
    ? myListings
    : myListings.filter(l => l.status === listingFilter)

  const MAIN_TABS = [
    { id: 'profile',  label: 'Hồ sơ' },
    { id: 'listings', label: `Bài đăng của tôi${counts.all ? ` (${counts.all})` : ''}` },
  ]

  const avatarSrc = avatarPreview || getAvatarUrl(currentUser?.avatar_url)
  if (!currentUser) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <p className="font-heading uppercase text-muted-foreground">
        Đang tải...
      </p>
    </div>
  )
}

  // ──────────────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-background">
      <Header />

      <div className="max-w-4xl mx-auto px-6 py-20">

        {/* Page header */}
        <div className="mb-10 pb-8 border-b border-secondary">
          <h1 className="font-heading text-5xl uppercase tracking-tighter">Tài khoản</h1>
        </div>

        {/* Main tabs */}
        <div className="flex border-b border-secondary mb-10">
          {MAIN_TABS.map(t => (
            <button key={t.id} onClick={() => setActiveTab(t.id)}
              className={`px-6 py-4 font-heading text-sm uppercase tracking-widest transition-colors
                ${activeTab === t.id ? 'text-primary border-b-2 border-primary' : 'text-muted-foreground hover:text-foreground'}`}>
              {t.label}
            </button>
          ))}
        </div>

        {/* ══ TAB: HỒ SƠ ══ */}
        {activeTab === 'profile' && (
          <form onSubmit={handleProfileSubmit} className="max-w-lg space-y-6">

            {/* Avatar + stats */}
            <div className="flex items-start gap-6 p-5 border border-secondary bg-secondary/5">
              <div className="relative flex-shrink-0">
                <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-secondary">
                  {avatarSrc
                    ? <img src={avatarSrc} alt="Avatar" className="w-full h-full object-cover" />
                    : (
                      <div className="w-full h-full flex items-center justify-center bg-muted">
                        <User className="h-10 w-10 text-muted-foreground/40" />
                      </div>
                    )
                  }
                </div>
                <label className="absolute bottom-0 right-0 w-7 h-7 bg-primary text-primary-foreground rounded-full flex items-center justify-center cursor-pointer hover:bg-primary/90 transition-colors">
                  <Upload className="h-3 w-3" />
                  <input type="file" accept="image/*" onChange={handleAvatarChange} className="hidden" />
                </label>
              </div>

              <div className="flex-1 min-w-0">
                <p className="font-heading text-lg uppercase truncate">{currentUser?.username}</p>
                <p className="font-paragraph text-sm text-muted-foreground mb-3">{currentUser?.email}</p>
                <StarRating rating={currentUser.rating ?? 0} count={currentUser.rating_count ?? 0} />
                {currentUser.role === 'admin' && (
                  <span className="mt-2 inline-block px-2 py-0.5 bg-primary/10 text-primary font-heading text-[10px] uppercase tracking-widest border border-primary/20">
                    Admin
                  </span>
                )}
              </div>
            </div>

            {/* Fields */}
            <div className="space-y-1">
              <label className="font-heading text-xs uppercase tracking-widest text-muted-foreground">Tên người dùng</label>
              <Input value={username} onChange={e => setUsername(e.target.value)}
                className="h-11 rounded-none border-secondary focus-visible:ring-primary font-paragraph bg-transparent" />
            </div>

            <div className="space-y-1">
              <label className="font-heading text-xs uppercase tracking-widest text-muted-foreground">Email</label>
              <Input value={currentUser?.email | ''} disabled
                className="h-11 rounded-none border-secondary font-paragraph bg-transparent opacity-50" />
              <p className="font-paragraph text-xs text-muted-foreground">Email không thể thay đổi</p>
            </div>

            <div className="space-y-1">
              <label className="font-heading text-xs uppercase tracking-widest text-muted-foreground">Trường học</label>
              <Input value={university} onChange={e => setUniversity(e.target.value)}
                placeholder="VD: Đại học Bách Khoa TP.HCM"
                className="h-11 rounded-none border-secondary focus-visible:ring-primary font-paragraph bg-transparent" />
            </div>

            <div className="space-y-1">
              <label className="font-heading text-xs uppercase tracking-widest text-muted-foreground">Mật khẩu mới</label>
              <Input type="password" value={password} onChange={e => setPassword(e.target.value)}
                placeholder="Để trống nếu không đổi"
                className="h-11 rounded-none border-secondary focus-visible:ring-primary font-paragraph bg-transparent" />
            </div>

            {message && (
              <p className={`font-paragraph text-sm ${message.includes('thành công') ? 'text-green-600' : 'text-red-500'}`}>
                {message}
              </p>
            )}

            <div className="flex gap-4 pt-2">
              <Button type="submit" disabled={saving}
                className="rounded-none bg-primary text-primary-foreground font-heading uppercase tracking-widest">
                {saving ? 'Đang lưu...' : 'Lưu thay đổi'}
              </Button>
              <Button type="button" variant="destructive" onClick={handleDeleteAccount}
                className="rounded-none font-heading uppercase tracking-widest">
                Xóa tài khoản
              </Button>
            </div>
          </form>
        )}

        {/* ══ TAB: BÀI ĐĂNG ══ */}
        {activeTab === 'listings' && (
          <div>
            {/* Sub-filter + reload */}
            <div className="flex items-center justify-between mb-1">
              <div className="flex flex-wrap gap-0 border-b border-secondary flex-1">
                {[
                  { id: 'all',      label: 'Tất cả',     count: counts.all },
                  { id: 'pending',  label: 'Chờ duyệt',  count: counts.pending },
                  { id: 'approved', label: 'Đã duyệt',   count: counts.approved },
                  { id: 'rejected', label: 'Bị từ chối', count: counts.rejected },
                ].map(t => (
                  <button key={t.id} onClick={() => setListingFilter(t.id)}
                    className={`px-4 py-3 font-heading text-xs uppercase tracking-widest flex items-center gap-2 transition-colors
                      ${listingFilter === t.id ? 'text-primary border-b-2 border-primary' : 'text-muted-foreground hover:text-foreground'}`}>
                    {t.label}
                    {t.count > 0 && (
                      <span className={`px-1.5 py-0.5 text-[10px] font-bold rounded-sm
                        ${listingFilter === t.id ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground'}`}>
                        {t.count}
                      </span>
                    )}
                  </button>
                ))}
              </div>
              <button onClick={loadMyListings} disabled={listingsLoading}
                className="ml-3 mb-1 p-2 text-muted-foreground hover:text-foreground transition-colors">
                <RefreshCw className={`h-4 w-4 ${listingsLoading ? 'animate-spin' : ''}`} />
              </button>
            </div>

            {/* Loading */}
            {listingsLoading && (
              <div className="py-10 text-center font-paragraph text-sm text-muted-foreground">
                Đang tải...
              </div>
            )}

            {/* Notice pending */}
            {!listingsLoading && counts.pending > 0 && listingFilter !== 'rejected' && (
              <div className="mb-5 flex items-start gap-3 px-4 py-3 bg-amber-500/10 border border-amber-500/30">
                <Clock className="h-4 w-4 text-amber-500 flex-shrink-0 mt-0.5" />
                <p className="font-paragraph text-sm text-amber-700">
                  Bạn có <strong>{counts.pending}</strong> bài đang chờ Admin kiểm duyệt. Bài sẽ hiển thị công khai sau khi được duyệt.
                </p>
              </div>
            )}

            {!listingsLoading && visibleListings.length === 0 && (
              <div className="py-20 flex flex-col items-center border border-dashed border-secondary text-center">
                <p className="font-heading text-muted-foreground uppercase text-lg mb-4">Chưa có bài đăng nào</p>
                <Link to="/dang-ban">
                  <Button className="rounded-none bg-primary text-primary-foreground font-heading uppercase tracking-widest text-xs">
                    Đăng bài đầu tiên
                  </Button>
                </Link>
              </div>
            )}

            {!listingsLoading && visibleListings.length > 0 && (
              <div className="space-y-3">
                {visibleListings.map(listing => {
                  const thumb = listing.images?.[0]
                    ? getImageUrl(listing.images[0])
                    : null

                  return (
                    <div key={listing.id}
                      className={`border transition-colors
                        ${listing.status === 'rejected' ? 'border-red-500/30 bg-red-500/3' : 'border-secondary hover:border-secondary/80'}`}>
                      <div className="grid grid-cols-12 gap-0">

                        {/* Thumbnail */}
                        {thumb && (
                          <div className="col-span-2 hidden sm:block">
                            <div className="h-full min-h-[110px] overflow-hidden">
                              <img src={thumb} alt={listing.item_name}
                                className="w-full h-full object-cover"
                                onError={e => e.target.style.display='none'} />
                            </div>
                          </div>
                        )}

                        {/* Info */}
                        <div className={`${thumb ? 'col-span-12 sm:col-span-7' : 'col-span-12 sm:col-span-9'} p-4`}>
                          <div className="flex flex-wrap items-center gap-2 mb-2">
                            <span className="font-heading text-sm uppercase">{listing.item_name}</span>
                            <ModerationBadge status={listing.status || 'pending'} />
                            <TransactionBadge status={listing.transaction_status || 'available'} />
                          </div>
                          <div className="flex flex-wrap gap-2 font-paragraph text-xs text-muted-foreground mb-2">
                            {listing.subject   && <span className="inline-flex items-center gap-1 px-2 py-0.5 border border-secondary bg-secondary/20"><BookOpen className="h-3 w-3 flex-shrink-0" />{listing.subject}</span>}
                            {listing.condition && <span className="inline-flex items-center gap-1 px-2 py-0.5 border border-secondary bg-secondary/20"><ClipboardList className="h-3 w-3 flex-shrink-0" />{listing.condition}</span>}
                            {listing.category  && <span className="inline-flex items-center gap-1 px-2 py-0.5 border border-secondary bg-secondary/20"><Tag className="h-3 w-3 flex-shrink-0" />{listing.category}</span>}
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 border border-secondary bg-secondary/20">
                              <Banknote className="h-3 w-3 flex-shrink-0" />
                              {listing.item_price === 0 ? 'Miễn phí' : `${listing.item_price?.toLocaleString('vi-VN')}đ`}
                            </span>
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 border border-secondary bg-secondary/20">
                              <Calendar className="h-3 w-3 flex-shrink-0" />
                              {new Date(listing.created_at).toLocaleDateString('vi-VN')}
                            </span>
                          </div>

                          {/* Lý do từ chối */}
                          {listing.status === 'rejected' && listing.reject_reason && (
                            <div className="flex items-start gap-2 px-3 py-2 bg-red-500/10 border border-red-500/20">
                              <AlertCircle className="h-3.5 w-3.5 text-red-500 flex-shrink-0 mt-0.5" />
                              <p className="font-paragraph text-xs text-red-500">
                                <strong>Lý do từ chối:</strong> {listing.reject_reason}
                                <span className="ml-2 text-red-400">— Hãy chỉnh sửa và gửi lại.</span>
                              </p>
                            </div>
                          )}
                        </div>

                        {/* Actions */}
                        <div className="col-span-12 sm:col-span-3 border-t sm:border-t-0 sm:border-l border-secondary flex sm:flex-col">
                          <Link to={`/listings/${listing.id}`}
                            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-3 font-heading text-[10px] uppercase tracking-widest text-muted-foreground hover:text-primary hover:bg-primary/5 transition-colors sm:border-b border-secondary border-r sm:border-r-0">
                            <Eye className="h-3.5 w-3.5" />Xem
                          </Link>

                          {listing.status !== 'sold' ? (
                            <button
                              onClick={() => setEditingListing(listing)}
                              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-3 font-heading text-[10px] uppercase tracking-widest text-muted-foreground hover:text-primary hover:bg-primary/5 transition-colors sm:border-b border-secondary border-r sm:border-r-0">
                              <Pencil className="h-3.5 w-3.5" />Sửa
                            </button>
                          ) : (
                            <div className="flex-1 flex items-center justify-center gap-1.5 px-3 py-3 font-heading text-[10px] uppercase tracking-widest text-muted-foreground/30 sm:border-b border-secondary border-r sm:border-r-0 cursor-not-allowed">
                              <Pencil className="h-3.5 w-3.5" />Sửa
                            </div>
                          )}

                          {/* Dropdown trạng thái giao dịch */}
                          {listing.status === 'approved' && (
                            <div className="flex-1 sm:border-b border-secondary border-r sm:border-r-0">
                              <select
                                value={listing.transaction_status || 'available'}
                                onChange={e => handleUpdateTransactionStatus(listing, e.target.value)}
                                className="w-full h-full px-2 py-2 font-heading text-[10px] uppercase tracking-widest text-muted-foreground bg-transparent hover:bg-primary/5 transition-colors cursor-pointer outline-none border-0">
                                <option value="available">Còn hàng</option>
                                <option value="negotiating">Thương lượng</option>
                                <option value="sold">Đã bán</option>
                              </select>
                            </div>
                          )}

                          <button onClick={() => handleDeleteListing(listing)}
                            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-3 font-heading text-[10px] uppercase tracking-widest text-muted-foreground hover:text-red-500 hover:bg-red-500/5 transition-colors">
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

      {/* Edit Panel */}
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