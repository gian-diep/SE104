import { useState, useEffect, useCallback } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import { Input } from '@/components/ui/input'
import { useAuth } from '@/context/AuthContext'
import { uploadAvatar, getUserRatings } from '@/lib/Userapi.js'
import { loginApi } from '@/lib/Authapi.js'
import { getListingsBySeller, updateListing, deleteListing as deleteListingApi, updateTransactionStatus } from '@/lib/Listingapi.js'
import { API_URL } from '@/lib/Api.js'
import {
  Clock, CheckCircle, XCircle, Eye, Trash2, AlertCircle,
  Pencil, X, Upload, Save, Info, BookOpen, ClipboardList,
  Tag, Banknote, Star, User, RefreshCw, MessageCircle, PlusCircle,
  Send, RotateCcw, Ban,
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

const SUBJECTS = [
  'An toàn thông tin',
  'Bài chế học',
  'Bảo vệ thực vật',
  'Bệnh học ngoại khoa',
  'Bệnh học nội khoa',
  'Chăn nuôi học',
  'Chẩn đoán hình ảnh',
  'Chủ nghĩa xã hội khoa học',
  'Cơ học kỹ thuật',
  'Cơ học lượng tử',
  'Cơ sở dữ liệu',
  'Công nghệ phần mềm',
  'Công nghệ thực phẩm',
  'Công pháp quốc tế',
  'Cấu trúc dữ liệu và giải thuật',
  'DevOps',
  'Dược liệu học',
  'Dược lý học',
  'Đại số tuyến tính',
  'Điều dưỡng cơ bản',
  'Điện tử cơ bản',
  'Điện tử số',
  'Điện toán đám mây',
  'Đầu tư tài chính',
  'Đồ họa máy tính',
  'Giải phẫu học',
  'Giải tích 1',
  'Giải tích 2',
  'Giải tích 3',
  'Giáo dục học',
  'Hành vi tổ chức',
  'Hệ điều hành',
  'Hệ quản trị cơ sở dữ liệu',
  'Hóa học đại cương',
  'Hóa hữu cơ',
  'Hóa lý',
  'Hóa phân tích',
  'Hóa sinh',
  'Hóa vô cơ',
  'Học máy',
  'Kế toán đại cương',
  'Kế toán tài chính',
  'Kế toán quản trị',
  'Khoa học đất',
  'Kinh doanh quốc tế',
  'Kinh tế chính trị Mác-Lênin',
  'Kinh tế lượng',
  'Kinh tế vĩ mô',
  'Kinh tế vi mô',
  'Kiểm thử phần mềm',
  'Kiến trúc máy tính',
  'Kỹ thuật cơ khí',
  'Kỹ thuật điện',
  'Kỹ thuật lập trình',
  'Lâm nghiệp đại cương',
  'Lập trình C',
  'Lập trình hướng đối tượng',
  'Lập trình Java',
  'Lập trình Python',
  'Lịch sử Đảng Cộng sản Việt Nam',
  'Lý luận nhà nước và pháp luật',
  'Lý thuyết mạch',
  'Luật dân sự',
  'Luật hành chính',
  'Luật hiến pháp',
  'Luật hình sự',
  'Luật hôn nhân và gia đình',
  'Luật lao động',
  'Luật quốc tế',
  'Luật thương mại',
  'Luật tố tụng hình sự',
  'Marketing căn bản',
  'Marketing quốc tế',
  'Mạng máy tính',
  'Mô phôi học',
  'Nhập môn lập trình',
  'Nhúng hệ thống',
  'Nhiệt động lực học',
  'Pháp luật đại cương',
  'Phát triển ứng dụng di động',
  'Phát triển ứng dụng web',
  'Phương pháp dạy học Hóa',
  'Phương pháp dạy học Lý',
  'Phương pháp dạy học tiếng Anh',
  'Phương pháp dạy học Toán',
  'Phương pháp dạy học Văn',
  'Phương trình vi phân',
  'Quản trị doanh nghiệp',
  'Quản trị học',
  'Quản trị nhân lực',
  'Sinh học đại cương',
  'Sinh lý học',
  'Sinh thái học',
  'Sức bền vật liệu',
  'Thị giác máy tính',
  'Thống kê kinh tế',
  'Thương mại điện tử',
  'Thủy sản đại cương',
  'Tiếng Anh',
  'Tài chính doanh nghiệp',
  'Tâm lý học giáo dục',
  'Tín hiệu và hệ thống',
  'Toán ứng dụng',
  'Triết học Mác-Lênin',
  'Trí tuệ nhân tạo',
  'Trồng trọt học',
  'Tư pháp quốc tế',
  'Tư tưởng Hồ Chí Minh',
  'Vi điều khiển',
  'Vi sinh vật học',
  'Vật lý đại cương A1',
  'Vật lý đại cương A2',
  'Vật lý lý thuyết',
  'Xác suất thống kê',
  'Xử lý ngôn ngữ tự nhiên',
  'Khác',
]

function SelectWithCustom({ value, onChange, options, placeholder, className }) {
  const sentinel = options[options.length - 1]
  const CUSTOM_SENTINELS = ['Khác', 'Trường khác']
  const supportsCustom = CUSTOM_SENTINELS.includes(sentinel)

  const [customMode, setCustomMode] = useState(false)

  const isCustom = supportsCustom && (customMode || (value !== '' && !options.includes(value)))

  const handleSelectChange = (e) => {
    if (supportsCustom && e.target.value === sentinel) {
      setCustomMode(true)
      onChange({ target: { value: '' } })
    } else {
      setCustomMode(false)
      onChange(e)
    }
  }

  return (
    <div className="space-y-2">
      <select value={isCustom ? sentinel : value} onChange={handleSelectChange} className={className}>
        <option value="">{placeholder}</option>
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
      {isCustom && (
        <input
          type="text"
          value={value}
          onChange={onChange}
          autoFocus
          placeholder={`Nhập ${sentinel === 'Trường khác' ? 'tên trường' : 'tên môn học'}...`}
          className={className}
        />
      )}
    </div>
  )
}

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
    available:   { label: 'Còn hàng',    Icon: CheckCircle,   cls: 'text-emerald-600 bg-emerald-50 border-emerald-200' },
    negotiating: { label: 'Thương lượng', Icon: MessageCircle, cls: 'text-blue-600 bg-blue-50 border-blue-200' },
    sold:        { label: 'Đã bán',       Icon: XCircle,       cls: 'text-muted-foreground bg-surface border-border' },
  }
  const { label, Icon, cls } = map[status] ?? map.available
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full border font-heading text-[10px] font-semibold uppercase tracking-wide ${cls}`}>
      <Icon className="h-3 w-3" />{label}
    </span>
  )
}

function StarRating({ rating, count, onClick }) {
  return (
    <div className="flex items-center gap-1.5">
      <div className="flex items-center">
        {[1, 2, 3, 4, 5].map(s => (
          <Star key={s} className={`h-4 w-4 ${s <= Math.round(rating) ? 'text-amber-400 fill-amber-400' : 'text-muted-foreground/20'}`} />
        ))}
      </div>
      {onClick ? (
        <button
          type="button"
          onClick={onClick}
          className="font-paragraph text-sm text-muted-foreground hover:text-primary hover:underline transition-colors"
        >
          {rating > 0 ? `${rating.toFixed(1)} (${count} đánh giá)` : 'Chưa có đánh giá'}
        </button>
      ) : (
        <span className="font-paragraph text-sm text-muted-foreground">
          {rating > 0 ? `${rating.toFixed(1)} (${count} đánh giá)` : 'Chưa có đánh giá'}
        </span>
      )}
    </div>
  )
}

// ── Ratings Modal ─────────────────────────────────────────────────────────────
function RatingsModal({ userId, onClose }) {
  const [data, setData]       = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getUserRatings(userId)
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [userId])

  return (
  <>
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    />

    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        transition={{ type: 'spring', damping: 28, stiffness: 280 }}
        className="pointer-events-auto
                   w-[95vw] max-w-2xl
                   bg-white rounded-3xl shadow-2xl
                   flex flex-col max-h-[80vh]
                   overflow-hidden border border-teal-100"
      >
        <div className="px-6 py-5 flex items-center justify-between flex-shrink-0 bg-teal-gradient">
          <div>
            <p className="font-heading text-white/70 text-xs uppercase tracking-widest mb-0.5">
              Đánh giá
            </p>
            <h2 className="font-heading text-white font-bold text-base">
              {data
                ? `${Number(data.rating ?? 0).toFixed(1)} ★ · ${data.rating_count ?? 0} đánh giá`
                : '...'}
            </h2>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors"
          >
            <X className="h-4 w-4 text-white" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4 bg-background">
          {loading && (
            <div className="py-12 flex flex-col items-center gap-3">
              <div className="relative w-8 h-8">
                <div className="absolute inset-0 rounded-full border-4 border-teal-100" />
                <div className="absolute inset-0 rounded-full border-4 border-t-primary animate-spin" />
              </div>
              <p className="font-paragraph text-sm text-muted-foreground">Đang tải...</p>
            </div>
          )}

          {!loading && (!data?.ratings || data.ratings.length === 0) && (
            <div className="py-12 text-center">
              <Star className="h-10 w-10 text-teal-100 mx-auto mb-3" />
              <p className="font-heading text-sm font-bold text-muted-foreground">Chưa có đánh giá nào</p>
            </div>
          )}

          {!loading && data?.ratings?.map(r => {
            const listingImage = r.listing_image ? getImageUrl(r.listing_image) : null
            return (
              <div key={r.id} className="bg-white rounded-2xl border border-teal-100 shadow-soft p-4">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-full flex-shrink-0 overflow-hidden bg-teal-50 flex items-center justify-center font-heading text-sm font-black text-primary">
                    {r.rater_avatar ? (
                      <img src={getAvatarUrl(r.rater_avatar)} alt={r.rater_name} className="w-full h-full object-cover" />
                    ) : (
                      getInitials(r.rater_name)
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="font-heading text-sm font-bold text-foreground truncate">{r.rater_name}</span>
                      <span className="font-paragraph text-xs text-muted-foreground flex-shrink-0">
                        {new Date(r.created_at).toLocaleDateString('vi-VN')}
                      </span>
                    </div>

                    {r.rated_role && (
                      <div className="mb-2">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-heading uppercase tracking-widest border ${
                          r.rated_role === 'seller'
                            ? 'bg-blue-50 text-blue-600 border-blue-200'
                            : 'bg-purple-50 text-purple-600 border-purple-200'
                        }`}>
                          {r.rated_role === 'seller' ? (
                            <>
                              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 9H4L5 9z" />
                              </svg>
                              Đánh giá với tư cách Người bán
                            </>
                          ) : (
                            <>
                              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                              </svg>
                              Đánh giá với tư cách Người mua
                            </>
                          )}
                        </span>
                      </div>
                    )}

                    <div className="flex items-center gap-0.5 mb-3">
                      {[1, 2, 3, 4, 5].map(s => (
                        <Star key={s} className={`h-3.5 w-3.5 ${s <= r.stars ? 'text-amber-400 fill-amber-400' : 'text-muted-foreground/20'}`} />
                      ))}
                    </div>

                    {(r.listing_name || r.listing?.item_name) && (
                      <Link to={`/listings/${r.listing_id || r.listing?.id}`} className="mb-3 block">
                        <div className="rounded-xl border border-teal-100 bg-teal-50/50 p-2.5 hover:border-primary transition-colors">
                          <div className="flex items-center gap-3">
                            {listingImage && (
                              <img src={listingImage} alt="listing" className="w-14 h-14 rounded-lg object-cover border border-teal-100 flex-shrink-0" />
                            )}
                            <div className="min-w-0">
                              <p className="font-heading text-xs uppercase tracking-wide text-primary mb-0.5">Đánh giá cho bài đăng</p>
                              <p className="font-heading text-sm font-bold text-foreground truncate">{r.listing_name || r.listing?.item_name}</p>
                            </div>
                          </div>
                        </div>
                      </Link>
                    )}

                    {r.comment && (
                      <p className="font-paragraph text-sm text-foreground leading-relaxed">{r.comment}</p>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </motion.div>
    </div>
  </>
  )
}

// ── Edit Panel ────────────────────────────────────────────────────────────────
function EditPanel({ listing, onClose, onSaved }) {
  const isResubmit = listing.status === 'rejected'

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
        subject:          form.subject,
        university:       form.university,
        keywords:         form.keywords.trim(),
        ...(isResubmit && { status: 'pending' }),
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
        <div className={`px-6 py-5 flex items-center justify-between flex-shrink-0 ${isResubmit ? 'bg-gradient-to-r from-red-500 to-rose-500' : 'bg-teal-gradient'}`}>
          <div>
            <p className="font-heading text-white/70 text-xs uppercase tracking-widest mb-0.5">
              {isResubmit ? 'Sửa & Gửi lại' : 'Chỉnh sửa bài đăng'}
            </p>
            <h2 className="font-heading text-white font-bold text-base leading-tight line-clamp-1">{listing.item_name}</h2>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors">
            <X className="h-4 w-4 text-white" />
          </button>
        </div>

        {isResubmit && listing.reject_reason && (
          <div className="flex items-start gap-3 px-6 py-4 bg-red-50 border-b border-red-200 flex-shrink-0">
            <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0 mt-0.5">
              <XCircle className="h-4 w-4 text-red-500" />
            </div>
            <div>
              <p className="font-heading text-xs font-bold uppercase tracking-wide text-red-600 mb-1">Lý do bị từ chối</p>
              <p className="font-paragraph text-sm text-red-700 leading-relaxed">{listing.reject_reason}</p>
              <p className="font-paragraph text-xs text-red-500 mt-1.5">
                Hãy chỉnh sửa nội dung bên dưới, sau đó nhấn <strong>"Gửi lại"</strong> để Admin xét duyệt lại.
              </p>
            </div>
          </div>
        )}

        {!isResubmit && (
          <div className="flex items-start gap-2 px-6 py-3 bg-amber-50 border-b border-amber-200 flex-shrink-0">
            <Info className="h-4 w-4 text-amber-500 flex-shrink-0 mt-0.5" />
            <p className="font-paragraph text-xs text-amber-700">
              Sau khi lưu, bài đăng sẽ chuyển về <strong>Chờ duyệt</strong> cho đến khi Admin duyệt lại.
            </p>
          </div>
        )}

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
              <SelectWithCustom 
                value={form.subject} 
                onChange={set('subject')} 
                options={SUBJECTS} 
                placeholder="-- Chọn tên môn học --" 
                className={selectCls} 
              />
            </div>
            <div className="space-y-1.5">
              <label className={labelCls}>Giá (VNĐ)</label>
              <Input type="number" min="0" value={form.item_price} onChange={set('item_price')} placeholder="0 = Miễn phí" className={inputCls} />
            </div>
          </div>
          
          <div className="space-y-1.5">
            <label className={labelCls}>Trường đại học</label>
            <SelectWithCustom 
              value={form.university} 
              onChange={set('university')} 
              options={UNIVERSITIES} 
              placeholder="-- Chọn trường --" 
              className={selectCls} 
            />
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

        <div className="px-6 py-4 border-t border-teal-100 flex-shrink-0 space-y-3 bg-white">
          {isResubmit && !error && !saved && (
            <div className="flex items-center gap-2 px-3 py-2.5 bg-blue-50 border border-blue-200 rounded-xl">
              <Send className="h-4 w-4 text-blue-500 flex-shrink-0" />
              <p className="font-paragraph text-xs text-blue-700">
                Sau khi gửi lại, bài đăng sẽ chờ Admin xét duyệt lại từ đầu.
              </p>
            </div>
          )}
          {error && (
            <div className="flex items-center gap-2 px-3 py-2.5 bg-red-50 border border-red-200 rounded-xl">
              <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0" />
              <p className="font-paragraph text-sm text-red-500">{error}</p>
            </div>
          )}
          <div className="flex gap-3">
            <button onClick={handleSave} disabled={saving || saved}
              className={`flex-1 h-12 rounded-xl text-white font-heading font-semibold text-sm flex items-center justify-center gap-2 shadow-btn hover:shadow-card-hover hover:-translate-y-0.5 transition-all disabled:opacity-60 disabled:translate-y-0 ${
                isResubmit
                  ? 'bg-gradient-to-r from-red-500 to-rose-500 hover:from-red-600 hover:to-rose-600'
                  : 'bg-teal-gradient'
              }`}>
              {saved ? (
                <><CheckCircle className="h-4 w-4" />{isResubmit ? 'Đã gửi lại!' : 'Đã lưu!'}</>
              ) : saving ? (
                isResubmit ? 'Đang gửi...' : 'Đang lưu...'
              ) : isResubmit ? (
                <><RotateCcw className="h-4 w-4" />Gửi lại để duyệt</>
              ) : (
                <><Save className="h-4 w-4" />Lưu thay đổi</>
              )}
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

  const [username, setUsername]           = useState('')
  const [university, setUniversity]       = useState('')
  const [password, setPassword]           = useState('')
  const [currentPassword, setCurrentPassword] = useState('')
  const [avatarFile, setAvatarFile]       = useState(null)
  const [avatarPreview, setAvatarPreview] = useState(null)
  const [message, setMessage]             = useState('')
  const [saving, setSaving]               = useState(false)

  const [showRatings, setShowRatings] = useState(false)

  const [ratingData, setRatingData] = useState(null)
  useEffect(() => {
    if (!currentUser?.id) return
    getUserRatings(currentUser.id)
      .then(setRatingData)
      .catch(() => {})
  }, [currentUser?.id])

  useEffect(() => {
    if (currentUser) {
      setUsername(currentUser.username || '')
      setUniversity(currentUser.university || '')
    }
  }, [currentUser])

  const [myListings,      setMyListings]      = useState([])
  const [listingsLoading, setListingsLoading] = useState(false)
  const [listingFilter,   setListingFilter]   = useState('all')
  const [editingListing,  setEditingListing]  = useState(null)
  const [deleteModal, setDeleteModal] = useState({
    open: false,
    type: null,
    listing: null,
  })

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
    if (currentUser) loadMyListings()
  }, [currentUser?.id, loadMyListings])

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
      if (password) {
        if (!currentPassword) {
          setMessage('Vui lòng nhập mật khẩu hiện tại')
          setSaving(false)
          return
        }
        try {
          await loginApi({ email: currentUser.email, password: currentPassword })
        } catch {
          setMessage('Mật khẩu hiện tại không đúng')
          setSaving(false)
          return
        }
      }

      let avatarUrl = undefined
      if (avatarFile) {
        const res = await uploadAvatar(avatarFile)
        avatarUrl = res.avatar_id
      }
      await updateProfile({
        username:   username.trim() || currentUser.username,
        university: university.trim() || currentUser.university,
        avatar_url: avatarUrl,
        password:   password || undefined,
      })
      setMessage('Cập nhật thành công'); setPassword(''); setCurrentPassword(''); setAvatarFile(null)
    } catch (err) {
      setMessage(err.message || 'Lỗi khi cập nhật')
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteAccount = async () => {
    setDeleteModal({ open: true, type: 'account', listing: null })
  }

  const handleDeleteListing = (listing) => {
    if (listing.transaction_status === 'negotiating') {
      alert('Không thể xóa bài đăng đang trong tình trạng thương lượng.')
      return
    }
    setDeleteModal({ open: true, type: 'listing', listing })
  }

  const confirmDelete = async () => {
    try {
      if (deleteModal.type === 'account') {
        await deleteAccount()
        navigate('/')
        return
      }
      if (deleteModal.type === 'listing') {
        await deleteListingApi(deleteModal.listing.id)
        loadMyListings()
      }
      setDeleteModal({ open: false, type: null, listing: null })
    } catch (err) {
      alert(err.message || 'Có lỗi xảy ra')
    }
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

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />

      <div className="max-w-7xl mx-auto px-6 py-10">
        <div className="mb-8">
          <div className="inline-flex items-center gap-2 bg-teal-50 text-primary px-3 py-1.5 rounded-full border border-teal-200 text-xs font-heading font-semibold uppercase tracking-wide mb-3">
            <User className="w-3.5 h-3.5" />
            Tài khoản
          </div>
          <h1 className="font-heading text-4xl md:text-5xl font-black tracking-tighter text-foreground">TÀI KHOẢN</h1>
        </div>

        <div className="flex gap-2 mb-8 p-1.5 bg-white rounded-2xl border border-teal-100 shadow-soft w-fit">
          <div className="px-5 py-2.5 rounded-xl bg-teal-gradient text-white shadow-btn font-heading text-sm font-semibold">
            Tài khoản của tôi
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
          {/* ══ CỘT TRÁI: HỒ SƠ ══ */}
          <div className="space-y-5">
            <form onSubmit={handleProfileSubmit} className="space-y-5">
              <div className="bg-white rounded-3xl border border-teal-100 shadow-card overflow-hidden">
                <div className="px-6 pt-6 pb-6">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="relative flex-shrink-0">
                      <div className="w-16 h-16 rounded-full border-4 border-white shadow-card overflow-hidden">
                        {avatarSrc ? (
                          <img src={avatarSrc} alt="Avatar" className="w-full h-full object-cover" />
                        ) : (
                          <div
                            className="w-full h-full flex items-center justify-center font-heading text-xl font-black text-white"
                            style={{ backgroundColor: avatarColor(currentUser?.username) }}
                          >
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
                      <p className="font-heading text-2xl font-black truncate text-foreground">{currentUser?.username}</p>
                      <p className="font-paragraph text-sm text-muted-foreground">{currentUser?.email}</p>
                    </div>

                    {currentUser.role === 'admin' && (
                      <span className="mb-1 px-2.5 py-1 rounded-full bg-primary/10 text-primary font-heading text-[10px] font-semibold uppercase tracking-wide border border-primary/20">
                        Admin
                      </span>
                    )}
                  </div>

                  <StarRating
                    rating={ratingData?.rating ?? currentUser.rating ?? 0}
                    count={ratingData?.rating_count ?? currentUser.rating_count ?? 0}
                    onClick={() => setShowRatings(true)}
                  />
                </div>
              </div>

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
                  <SelectWithCustom 
                    value={university} 
                    onChange={e => setUniversity(e.target.value)} 
                    options={UNIVERSITIES} 
                    placeholder="-- Chọn trường --" 
                    className="w-full h-11 rounded-xl border border-teal-100 bg-surface font-paragraph text-sm px-3 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30" 
                  />
                </div>

                {/* ── Đổi mật khẩu: current trước, new sau ── */}
                <div className="space-y-1.5">
                  <label className="font-heading text-xs font-semibold uppercase tracking-widest text-muted-foreground">Mật khẩu hiện tại</label>
                  <Input
                    type="password"
                    value={currentPassword}
                    onChange={e => setCurrentPassword(e.target.value)}
                    placeholder="Nhập nếu muốn đổi mật khẩu"
                    autoComplete="current-password"
                    className="h-11 rounded-xl border-teal-100 focus-visible:ring-primary font-paragraph bg-surface text-sm"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="font-heading text-xs font-semibold uppercase tracking-widest text-muted-foreground">Mật khẩu mới</label>
                  <Input
                    type="password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="Để trống nếu không đổi"
                    autoComplete="new-password"
                    className="h-11 rounded-xl border-teal-100 focus-visible:ring-primary font-paragraph bg-surface text-sm"
                  />
                  <p className="font-paragraph text-xs text-muted-foreground">Bắt buộc nhập mật khẩu hiện tại khi đổi mật khẩu mới</p>
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
                    Xóa tài khoản
                  </button>
                </div>
              </div>
            </form>
          </div>

          {/* ══ CỘT PHẢI: BÀI ĐĂNG ══ */}
          <div>
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

            {!listingsLoading && counts.pending > 0 && listingFilter !== 'rejected' && (
              <div className="mb-5 flex items-start gap-3 px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl">
                <Clock className="h-4 w-4 text-amber-500 flex-shrink-0 mt-0.5" />
                <p className="font-paragraph text-sm text-amber-700">
                  Bạn có <strong>{counts.pending}</strong> bài đang chờ Admin kiểm duyệt.
                </p>
              </div>
            )}

            {!listingsLoading && counts.rejected > 0 && (listingFilter === 'all' || listingFilter === 'rejected') && (
              <div className="mb-5 flex items-start gap-3 px-4 py-3 bg-red-50 border border-red-200 rounded-xl">
                <XCircle className="h-4 w-4 text-red-500 flex-shrink-0 mt-0.5" />
                <p className="font-paragraph text-sm text-red-700">
                  Bạn có <strong>{counts.rejected}</strong> bài bị từ chối. Nhấn <strong>"Sửa & Gửi lại"</strong> để chỉnh sửa theo phản hồi của Admin và gửi lại để xét duyệt.
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
                  const isRejected = listing.status === 'rejected'
                  return (
                    <div key={listing.id}
                      className={`bg-white rounded-2xl border shadow-soft overflow-hidden transition-all ${
                        isRejected ? 'border-red-200' : 'border-teal-100 hover:shadow-card'
                      }`}>
                      <div className="flex">
                        {thumb && (
                          <div className="w-24 flex-shrink-0 hidden sm:block overflow-hidden bg-surface">
                            <img src={thumb} alt={listing.item_name} className="w-full h-full object-cover"
                              onError={e => e.target.style.display='none'} />
                          </div>
                        )}
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
                          {isRejected && listing.reject_reason && (
                            <div className="mt-3 rounded-xl border border-red-200 bg-gradient-to-r from-red-50 to-rose-50 p-3">
                              <div className="flex items-start gap-2">
                                <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                                  <AlertCircle className="h-4 w-4 text-red-500" />
                                </div>
                                <div className="min-w-0">
                                  <p className="font-heading text-xs font-bold uppercase tracking-wide text-red-600 mb-1">Lý do bị từ chối</p>
                                  <p className="font-paragraph text-sm text-red-700 leading-relaxed break-words">{listing.reject_reason}</p>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                        <div className="flex-shrink-0 flex flex-col border-l divide-y divide-teal-100"
                          style={{ borderColor: isRejected ? '#fecaca' : '' }}>
                          <Link to={`/listings/${listing.id}`}
                            className="flex items-center justify-center gap-1.5 px-4 py-3 font-heading text-[10px] font-semibold uppercase tracking-wide text-muted-foreground hover:text-primary hover:bg-teal-50 transition-colors">
                            <Eye className="h-3.5 w-3.5" />Xem
                          </Link>
                          <button
                            onClick={() => listing.transaction_status !== 'sold' && setEditingListing(listing)}
                            disabled={listing.transaction_status === 'sold'}
                            className={`flex items-center justify-center gap-1.5 px-4 py-3 font-heading text-[10px] font-semibold uppercase tracking-wide transition-colors disabled:opacity-30 disabled:cursor-not-allowed ${
                              isRejected
                                ? 'text-red-500 hover:text-red-600 hover:bg-red-50'
                                : 'text-muted-foreground hover:text-primary hover:bg-teal-50'
                            }`}>
                            {isRejected
                              ? <><RotateCcw className="h-3.5 w-3.5" />Gửi lại</>
                              : <><Pencil className="h-3.5 w-3.5" />Sửa</>
                            }
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
        </div>
      </div>

      <Footer />

      {deleteModal.open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[90] bg-black/60 backdrop-blur-sm"
            onClick={() => setDeleteModal({ open: false, type: null, listing: null })}
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ type: 'spring', damping: 24, stiffness: 260 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4"
          >
            <div className="w-full max-w-md overflow-hidden rounded-[2rem] border border-red-100 bg-white shadow-[0_20px_60px_rgba(0,0,0,0.18)]">
              <div className="h-1 bg-gradient-to-r from-red-400 via-rose-500 to-red-500" />

              <div className="border-b border-red-100 bg-gradient-to-b from-red-50/70 to-white px-7 py-6">
                <div className="flex items-center gap-4">
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-red-100">
                    <Trash2 className="h-7 w-7 text-red-500" />
                  </div>
                  <div>
                    <p className="font-heading text-lg font-bold uppercase text-gray-900">
                      {deleteModal.type === 'account' ? 'Xóa tài khoản' : 'Xóa bài đăng'}
                    </p>
                    <p className="text-sm text-gray-500 mt-1">Hành động này không thể hoàn tác.</p>
                  </div>
                </div>
              </div>

              <div className="px-7 py-6">
                <p className="text-sm text-gray-600 leading-relaxed">
                  {deleteModal.type === 'account'
                    ? 'Bạn có chắc chắn muốn xóa tài khoản của mình không?'
                    : 'Bạn có chắc chắn muốn xóa bài đăng này không?'}
                </p>

                {deleteModal.type === 'listing' && deleteModal.listing && (
                  <div className="mt-4 rounded-2xl border border-red-100 bg-red-50/50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-widest text-red-500 mb-1">Bài đăng sẽ bị xóa</p>
                    <p className="font-heading text-sm uppercase text-gray-900">{deleteModal.listing.item_name}</p>
                  </div>
                )}

                <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
                  <p className="text-xs leading-relaxed text-amber-800">
                    ⚠️ Dữ liệu sẽ bị xóa khỏi hệ thống và không thể khôi phục.
                  </p>
                </div>
              </div>

              <div className="flex justify-end gap-3 border-t border-gray-100 bg-gray-50/60 px-7 py-5">
                <button
                  onClick={() => setDeleteModal({ open: false, type: null, listing: null })}
                  className="rounded-xl border border-gray-200 bg-white px-5 py-2.5 text-sm font-heading uppercase tracking-wider text-gray-600 transition-all hover:border-gray-300 hover:bg-gray-50 hover:text-gray-900"
                >
                  Hủy
                </button>
                <button
                  onClick={confirmDelete}
                  className="rounded-xl bg-red-500 px-5 py-2.5 text-sm font-heading uppercase tracking-wider text-white shadow-lg shadow-red-500/20 transition-all hover:bg-red-600"
                >
                  {deleteModal.type === 'account' ? 'Xóa tài khoản' : 'Xóa bài đăng'}
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}

      <AnimatePresence>
        {showRatings && currentUser && (
          <RatingsModal userId={currentUser.id} onClose={() => setShowRatings(false)} />
        )}
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