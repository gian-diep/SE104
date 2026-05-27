import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import {
  ArrowLeft, Tag, BookOpen, FileText,
  MessageSquarePlus, School, Lock, Flag, X, ChevronDown, Star, User,
  ChevronLeft, ChevronRight,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Image } from '@/components/ui/image'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import { useAuth } from '@/context/AuthContext'
import AuthModal from '@/components/modals/AuthModal'
import ChatModal from '@/components/modals/ChatModal'
import { getListingById } from '@/lib/Listingapi.js'
import { buildImageUrl } from '@/lib/Imageapi.js'
import { sendChatRequest, getBuyerRequests, getUserSessions } from '@/lib/Chatapi'
import { createReport } from '@/lib/Reportapi.js'
import { API_URL } from '@/lib/Api.js'

function getImageUrls(listing) {
  try {
    if (!listing?.images?.length) return []
    return listing.images.map(img => buildImageUrl(img))
  } catch { return [] }
}

const REPORT_REASONS = [
  'Spam / quảng cáo',
  'Lừa đảo',
  'Tài liệu sai mô tả',
  'Nội dung không phù hợp',
  'Khác',
]

const AVATAR_COLORS = ['#0D9488', '#14B8A6', '#0F766E', '#F59E0B', '#10B981', '#6366F1']
function avatarColor(name = '') {
  return AVATAR_COLORS[(String(name).charCodeAt(0) || 0) % AVATAR_COLORS.length]
}
function buildAvatarUrl(avatarUrl) {
  if (!avatarUrl) return null
  if (avatarUrl.startsWith('http') || avatarUrl.startsWith('data:')) return avatarUrl
  return `${API_URL}/avatars/${avatarUrl}`
}
function getInitials(name = '') {
  return name.trim().split(/\s+/).slice(-2).map(w => w[0]?.toUpperCase() || '').join('')
}

export default function ListingDetailPage() {
  const { id } = useParams()
  const listingId = Number(id)
  const { currentUser } = useAuth()

  const [listing, setListing]             = useState(null)
  const [isLoading, setIsLoading]         = useState(true)
  const [showAuth, setShowAuth]           = useState(false)
  const [requestStatus, setRequestStatus] = useState(null)
  const [activeSession, setActiveSession] = useState(null)
  const [showChat, setShowChat]           = useState(false)
  const [isSending, setIsSending]         = useState(false)
  const [selectedImage, setSelectedImage] = useState(0)

  const [showReport, setShowReport]     = useState(false)
  const [reportReason, setReportReason] = useState('')
  const [reportDetail, setReportDetail] = useState('')
  const [reportDone, setReportDone]     = useState(false)
  const [reportError, setReportError]   = useState('')

  useEffect(() => {
    async function load() {
      if (!id) return
      try {
        setIsLoading(true)
        const data = await getListingById(id)
        setListing(data)
      } catch (err) {
        console.error('Load listing failed:', err)
        setListing(null)
      } finally {
        setIsLoading(false)
      }
    }
    load()
  }, [id])

  useEffect(() => {
    if (!currentUser || !listing) return
    async function checkStatus() {
      try {
        const sessions = await getUserSessions(currentUser.id)
        const mySession = sessions.find(s => s.listing_id === listingId && s.status === 'active')
        if (mySession) { setActiveSession(mySession); setRequestStatus('active'); return }
        const requests = await getBuyerRequests(currentUser.id)
        const myReq = requests.find(r => r.listing_id === listingId)
        if (myReq) setRequestStatus(myReq.status)
      } catch (e) { console.error('checkStatus error:', e) }
    }
    checkStatus()
  }, [currentUser, listing, listingId])

  const handleSendRequest = async () => {
    if (!currentUser) { setShowAuth(true); return }
    if (currentUser.id === listing.seller_id) return
    try {
      setIsSending(true)
      await sendChatRequest(listingId, currentUser.id)
      setRequestStatus('pending')
    } catch (err) {
      alert(err.message || 'Không thể gửi yêu cầu')
    } finally {
      setIsSending(false)
    }
  }

  const handleReport = async () => {
    setReportError('')
    if (!currentUser) { setReportError('Bạn cần đăng nhập'); return }
    if (!reportReason) { setReportError('Vui lòng chọn lý do'); return }
    if (!reportDetail.trim()) { setReportError('Vui lòng nhập nội dung chi tiết'); return }
    try {
      await createReport({
        reporter_id: currentUser.id,
        reported_user_id: listing.seller_id,
        reported_username: listing.seller_name,
        listing_id: listing.id,
        reason: reportReason,
        detail: reportDetail,
      })
      setReportDone(true)
    } catch (err) {
      setReportError(err.message)
    }
  }

  const isSeller  = currentUser?.id === listing?.seller_id
  const imageUrls = getImageUrls(listing)

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="flex items-center justify-center py-40"><LoadingSpinner /></div>
        <Footer />
      </div>
    )
  }

  if (!listing) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="max-w-[100rem] mx-auto px-6 md:px-16 py-32 text-center">
          <div className="w-20 h-20 rounded-3xl bg-teal-50 flex items-center justify-center mx-auto mb-6">
            <BookOpen className="w-10 h-10 text-teal-300" />
          </div>
          <h2 className="font-heading text-3xl font-bold mb-4 text-foreground">Không tìm thấy bài đăng</h2>
          <Link to="/">
            <button className="inline-flex items-center gap-2 bg-teal-gradient text-white px-6 py-3 rounded-xl font-heading font-semibold text-sm shadow-btn hover:-translate-y-0.5 transition-all">
              <ArrowLeft className="w-4 h-4" />Về trang chủ
            </button>
          </Link>
        </div>
        <Footer />
      </div>
    )
  }

  const renderRequestButton = () => {
    if (isSeller) return null
    if (listing.transaction_status === 'negotiating') {
      return (
        <button disabled className="w-full h-14 rounded-2xl bg-surface border border-teal-100 font-heading font-semibold text-sm text-muted-foreground flex items-center justify-center gap-2 opacity-60 cursor-not-allowed">
          <Lock className="w-5 h-5" />Đang thương lượng
        </button>
      )
    }
    if (listing.transaction_status === 'sold')
    {
        return (
        <button disabled className="w-full h-14 rounded-2xl bg-surface border border-teal-100 font-heading font-semibold text-sm text-muted-foreground flex items-center justify-center gap-2 opacity-60 cursor-not-allowed">
          <Lock className="w-5 h-5" />Đã bán
        </button>
      )
    }
    if (requestStatus === 'active') {
      return (
        <button
          onClick={() => setShowChat(true)}
          className="w-full h-14 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-white font-heading font-semibold text-sm flex items-center justify-center gap-2 shadow-btn hover:shadow-card-hover hover:-translate-y-0.5 transition-all"
        >
          <MessageSquarePlus className="w-5 h-5" />Mở chat
        </button>
      )
    }
    if (requestStatus === 'pending') {
      return (
        <button disabled className="w-full h-14 rounded-2xl bg-amber-50 border border-amber-200 font-heading font-semibold text-sm text-amber-700 flex items-center justify-center gap-2 cursor-not-allowed">
          ⏳ Đang chờ phản hồi từ người bán
        </button>
      )
    }
    if (requestStatus === 'rejected') {
      return (
        <button disabled className="w-full h-14 rounded-2xl bg-red-50 border border-red-200 font-heading font-semibold text-sm text-red-500 flex items-center justify-center gap-2 cursor-not-allowed">
          ❌ Yêu cầu đã bị từ chối
        </button>
      )
    }
    return (
      <button
        onClick={handleSendRequest}
        disabled={isSending}
        className="w-full h-14 rounded-2xl bg-teal-gradient text-white font-heading font-semibold text-sm flex items-center justify-center gap-2 shadow-btn hover:shadow-card-hover hover:-translate-y-0.5 transition-all disabled:opacity-60 disabled:translate-y-0"
      >
        <MessageSquarePlus className="w-5 h-5" />
        {isSending ? 'Đang gửi...' : 'Liên hệ người bán'}
      </button>
    )
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />

      <div className="max-w-[100rem] mx-auto px-6 md:px-16 py-10">
        {/* Back */}
        <div className="mb-8">
          <Link to="/">
            <button className="inline-flex items-center gap-2 font-paragraph text-sm text-muted-foreground hover:text-primary transition-colors bg-white border border-teal-100 px-4 py-2 rounded-xl shadow-soft hover:shadow-card">
              <ArrowLeft className="h-4 w-4" />Quay về
            </button>
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 xl:gap-16">
          {/* Images */}
          <div>
            <div className="aspect-square bg-surface rounded-3xl border border-teal-100 overflow-hidden mb-4 relative group shadow-card">
              {imageUrls.length > 0 ? (
                <img
                  src={imageUrls[selectedImage]}
                  alt={listing.item_name}
                  className="w-full h-full object-contain"
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center gap-3">
                  <BookOpen className="h-16 w-16 text-teal-200" />
                  <span className="font-paragraph text-sm text-muted-foreground">Không có ảnh</span>
                </div>
              )}
              {imageUrls.length > 1 && (
                <>
                  <button onClick={() => setSelectedImage(i => (i - 1 + imageUrls.length) % imageUrls.length)}
                    className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/90 shadow-card border border-teal-100 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white">
                    <ChevronLeft className="w-4 h-4 text-foreground" />
                  </button>
                  <button onClick={() => setSelectedImage(i => (i + 1) % imageUrls.length)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/90 shadow-card border border-teal-100 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white">
                    <ChevronRight className="w-4 h-4 text-foreground" />
                  </button>
                </>
              )}
            </div>
            {imageUrls.length > 1 && (
              <div className="flex gap-2 flex-wrap">
                {imageUrls.map((url, i) => (
                  <button
                    key={i}
                    onClick={() => setSelectedImage(i)}
                    className={`w-16 h-16 rounded-xl border-2 overflow-hidden transition-all ${
                      i === selectedImage ? 'border-primary shadow-btn' : 'border-teal-100 hover:border-primary/50'
                    }`}
                  >
                    <img src={url} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Info */}
          <div className="flex flex-col gap-5">
            {/* Status badges */}
            <div className="flex gap-2 flex-wrap">
              {listing.condition && (
                <span className="font-heading text-xs font-semibold px-3 py-1.5 rounded-full bg-teal-50 text-teal-700 border border-teal-200">
                  {listing.condition}
                </span>
              )}
              {listing.transaction_status === 'sold' && (
                <span className="font-heading text-xs font-semibold px-3 py-1.5 rounded-full bg-red-50 text-red-500 border border-red-200">Đã bán</span>
              )}
              {listing.transaction_status === 'negotiating' && (
                <span className="font-heading text-xs font-semibold px-3 py-1.5 rounded-full bg-amber-50 text-amber-600 border border-amber-200">Đang thương lượng</span>
              )}
              {listing.transaction_status === 'available' && (
                <span className="font-heading text-xs font-semibold px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200">✓ Còn hàng</span>
              )}
            </div>

            {/* Title + Price */}
            <div>
              <h1 className="font-heading text-3xl font-black tracking-tight leading-tight mb-3 text-foreground">
                {listing.item_name}
              </h1>
              <div className={`inline-flex items-center font-heading text-2xl font-black ${
                listing.item_price === 0 ? 'text-emerald-500' : 'text-primary'
              }`}>
                {listing.item_price === 0 ? 'Miễn phí' : `${listing.item_price.toLocaleString('vi-VN')} đ`}
              </div>
            </div>

            {/* Meta info card */}
            <div className="bg-white rounded-2xl border border-teal-100 shadow-soft p-5 space-y-3">
              {listing.category && (
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-teal-50 flex items-center justify-center flex-shrink-0">
                    <Tag className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="font-heading text-[10px] uppercase tracking-widest text-muted-foreground">Phân loại</p>
                    <p className="font-paragraph text-sm text-foreground">{listing.category}</p>
                  </div>
                </div>
              )}
              {listing.subject && (
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-teal-50 flex items-center justify-center flex-shrink-0">
                    <BookOpen className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="font-heading text-[10px] uppercase tracking-widest text-muted-foreground">Môn học</p>
                    <p className="font-paragraph text-sm text-foreground">{listing.subject}</p>
                  </div>
                </div>
              )}
              {listing.university && (
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-teal-50 flex items-center justify-center flex-shrink-0">
                    <School className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="font-heading text-[10px] uppercase tracking-widest text-muted-foreground">Trường</p>
                    <p className="font-paragraph text-sm text-foreground">{listing.university}</p>
                  </div>
                </div>
              )}

              {/* Seller */}
              {listing.seller_name && (
                <div className="pt-3 mt-1 border-t border-teal-50">
                  <p className="font-heading text-[10px] uppercase tracking-widest text-muted-foreground mb-2">Người bán</p>
                  <Link
                    to={`/nguoi-dung/${listing.seller_id}`}
                    className="flex items-center gap-3 group"
                  >
                    <div
                      className="w-10 h-10 rounded-full overflow-hidden flex items-center justify-center font-heading text-sm font-bold text-white shadow-sm flex-shrink-0"
                      style={{ backgroundColor: avatarColor(listing.seller_name) }}
                    >
                      {listing.seller_avatar_url
                        ? <img src={buildAvatarUrl(listing.seller_avatar_url)} alt={listing.seller_name} className="w-full h-full object-cover" onError={e => { e.currentTarget.style.display = 'none' }} />
                        : getInitials(listing.seller_name)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-heading text-sm font-bold text-foreground group-hover:text-primary transition-colors">
                        {listing.seller_name}
                      </p>
                      {listing.seller_rating != null && (
                        <div className="flex items-center gap-1 mt-0.5">
                          <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                          <span className="font-heading text-xs text-amber-600 font-semibold">{Number(listing.seller_rating).toFixed(1)}</span>
                          <span className="font-paragraph text-[10px] text-muted-foreground">({listing.seller_rating_count ?? 0} đánh giá)</span>
                        </div>
                      )}
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all flex-shrink-0" />
                  </Link>
                </div>
              )}
            </div>

            {/* Description */}
            {listing.item_description && (
              <div className="bg-white rounded-2xl border border-teal-100 shadow-soft p-5">
                <p className="font-heading text-xs uppercase tracking-widest text-muted-foreground mb-2">Mô tả</p>
                <p className="font-paragraph text-sm leading-relaxed text-foreground">{listing.item_description}</p>
              </div>
            )}

            {/* Actions */}
            <div className="space-y-3 pt-1">
              {renderRequestButton()}

              {currentUser && !isSeller && (
                <button
                  onClick={() => setShowReport(true)}
                  className="w-full flex items-center justify-center gap-2 font-paragraph text-xs text-muted-foreground hover:text-red-500 transition-colors py-2"
                >
                  <Flag className="h-3.5 w-3.5" />Báo cáo bài đăng này
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <Footer />
      <AuthModal isOpen={showAuth} onClose={() => setShowAuth(false)} />
      {activeSession && (
        <ChatModal isOpen={showChat} onClose={() => setShowChat(false)} session={activeSession} />
      )}

      {/* Report Modal */}
      {showReport && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowReport(false)} />
          <div className="relative z-10 w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden">
            <div className="bg-red-500 px-6 py-5 flex items-center justify-between">
              <h3 className="font-heading text-white font-bold text-base">Báo cáo bài đăng</h3>
              <button onClick={() => setShowReport(false)} className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                <X className="h-4 w-4 text-white" />
              </button>
            </div>
            <div className="p-6">
              {reportDone ? (
                <div className="text-center py-6">
                  <div className="w-16 h-16 rounded-full bg-emerald-50 flex items-center justify-center mx-auto mb-4">
                    <span className="text-3xl">✅</span>
                  </div>
                  <p className="font-heading text-base font-bold text-emerald-600 mb-2">Đã ghi nhận báo cáo</p>
                  <p className="font-paragraph text-sm text-muted-foreground mb-6">Cảm ơn bạn đã giúp cộng đồng.</p>
                  <button onClick={() => setShowReport(false)} className="px-6 py-2.5 rounded-xl bg-teal-gradient text-white font-heading font-semibold text-sm shadow-btn">Đóng</button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label className="font-heading text-xs uppercase tracking-widest text-muted-foreground block mb-2">Lý do *</label>
                    <div className="relative">
                      <select
                        value={reportReason}
                        onChange={e => setReportReason(e.target.value)}
                        className="w-full border border-teal-100 bg-surface font-paragraph text-sm px-3 py-2.5 appearance-none pr-8 focus:outline-none focus:ring-2 focus:ring-primary/30 rounded-xl"
                      >
                        <option value="">-- Chọn lý do --</option>
                        {REPORT_REASONS.map(r => <option key={r} value={r}>{r}</option>)}
                      </select>
                      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                    </div>
                  </div>
                  <div>
                    <label className="font-heading text-xs uppercase tracking-widest text-muted-foreground block mb-2">Chi tiết *</label>
                    <textarea
                      value={reportDetail}
                      onChange={e => setReportDetail(e.target.value)}
                      rows={3}
                      placeholder="Mô tả chi tiết vấn đề..."
                      className="w-full border border-teal-100 bg-surface font-paragraph text-sm px-3 py-2.5 resize-none focus:outline-none focus:ring-2 focus:ring-primary/30 rounded-xl"
                    />
                  </div>
                  {reportError && <p className="font-paragraph text-sm text-red-500">{reportError}</p>}
                  <div className="flex gap-3">
                    <button onClick={handleReport} className="flex-1 h-11 rounded-xl bg-red-500 hover:bg-red-600 text-white font-heading font-semibold text-sm transition-colors shadow-btn">Gửi báo cáo</button>
                    <button onClick={() => setShowReport(false)} className="px-5 h-11 rounded-xl border border-teal-100 font-heading font-semibold text-sm text-foreground hover:border-primary hover:text-primary transition-colors">Hủy</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}