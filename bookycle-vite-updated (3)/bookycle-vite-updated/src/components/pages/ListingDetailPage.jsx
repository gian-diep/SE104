import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import {
  ArrowLeft, Tag, BookOpen, FileText,
  MessageSquarePlus, School, Lock, Flag, X, ChevronDown, Star, User,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Image } from '@/components/ui/image'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import { useAuth } from '@/context/AuthContext'
import AuthModal from '@/components/modals/AuthModal'
import ChatModal from '@/components/modals/ChatModal'
import { getListingById } from '@/lib/Listingapi'
import { buildImageUrl } from '@/lib/Imageapi'
import {
  sendChatRequest,
  getBuyerRequests,
  getUserSessions,
} from '@/lib/Chatapi'
import { createReport } from '@/lib/Reportapi'


function getImageUrls(listing) {
  try {
    if (!listing?.images?.length) return []
    return listing.images.map(img => buildImageUrl(img))
  } catch {
    return []
  }
}

const REPORT_REASONS = [
  'Spam / quảng cáo',
  'Lừa đảo',
  'Tài liệu sai mô tả',
  'Nội dung không phù hợp',
  'Khác',
]

export default function ListingDetailPage() {
  const { id } = useParams()
  const listingId = Number(id)
  const { currentUser } = useAuth()

  const [listing, setListing]             = useState(null)
  const [isLoading, setIsLoading]         = useState(true)
  const [showAuth, setShowAuth]           = useState(false)
  const [requestStatus, setRequestStatus] = useState(null) // null | 'pending' | 'approved' | 'rejected' | 'active'
  const [activeSession, setActiveSession] = useState(null)
  const [showChat, setShowChat]           = useState(false)
  const [isSending, setIsSending]         = useState(false)
  const [selectedImage, setSelectedImage] = useState(0)

  // Report
  const [showReport, setShowReport]   = useState(false)
  const [reportReason, setReportReason] = useState('')
  const [reportDetail, setReportDetail] = useState('')
  const [reportDone, setReportDone]   = useState(false)
  const [reportError, setReportError] = useState('')

  // ── Load listing ────────────────────────────────────────────────────────
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

  // ── Check existing request / session for this buyer ─────────────────────
  useEffect(() => {
    if (!currentUser || !listing) return

    async function checkStatus() {
      try {
        // Kiểm tra session active
        const sessions = await getUserSessions(currentUser.id)
        const mySession = sessions.find(
          s => s.listing_id === listingId && s.status === 'active'
        )
        if (mySession) {
          setActiveSession(mySession)
          setRequestStatus('active')
          return
        }

        // Kiểm tra request đã gửi
        const requests = await getBuyerRequests(currentUser.id)
        const myReq = requests.find(r => r.listing_id === listingId)
        if (myReq) {
          setRequestStatus(myReq.status) // pending | approved | rejected
        }
      } catch (e) {
        console.error('checkStatus error:', e)
      }
    }
    checkStatus()
  }, [currentUser, listing, listingId])

  // ── Send request ─────────────────────────────────────────────────────────
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

  // ── Report ───────────────────────────────────────────────────────────────
const handleReport = async () => {
  setReportError('')

  if (!currentUser) {
    setReportError('Bạn cần đăng nhập')
    return
  }

  if (!reportReason) {
    setReportError('Vui lòng chọn lý do')
    return
  }

  if (!reportDetail.trim()) {
    setReportError('Vui lòng nhập nội dung chi tiết')
    return
  }

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

  const isSeller   = currentUser?.id === listing?.seller_id
  const imageUrls  = getImageUrls(listing)

  // ── Loading / Not found ──────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="flex items-center justify-center py-40">
          <LoadingSpinner />
        </div>
        <Footer />
      </div>
    )
  }

  if (!listing) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="max-w-[100rem] mx-auto px-6 md:px-[80px] py-[120px] text-center">
          <h2 className="font-heading text-3xl uppercase mb-6">Không tìm thấy bài đăng</h2>
          <Link to="/"><Button className="rounded-none bg-primary text-primary-foreground font-heading uppercase tracking-widest"><ArrowLeft className="mr-2 h-4 w-4" />Về trang chủ</Button></Link>
        </div>
        <Footer />
      </div>
    )
  }

  // ── Request button text ──────────────────────────────────────────────────
  const renderRequestButton = () => {
    if (isSeller) return null
    if (listing.transaction_status === 'sold' || listing.transaction_status === 'negotiating') {
      return (
        <Button disabled className="w-full rounded-none font-heading uppercase tracking-widest h-14 text-base opacity-50">
          <Lock className="mr-2 h-5 w-5" />Đang thương lượng
        </Button>
      )
    }
    if (requestStatus === 'active') {
      return (
        <Button
          onClick={() => setShowChat(true)}
          className="w-full rounded-none bg-green-600 hover:bg-green-700 text-white font-heading uppercase tracking-widest h-14 text-base"
        >
          <MessageSquarePlus className="mr-2 h-5 w-5" />Mở chat
        </Button>
      )
    }
    if (requestStatus === 'pending') {
      return (
        <Button disabled className="w-full rounded-none font-heading uppercase tracking-widest h-14 text-base opacity-70">
          ⏳ Đang chờ phản hồi từ người bán
        </Button>
      )
    }
    if (requestStatus === 'rejected') {
      return (
        <Button disabled className="w-full rounded-none font-heading uppercase tracking-widest h-14 text-base opacity-50">
          ❌ Yêu cầu đã bị từ chối
        </Button>
      )
    }
    return (
      <Button
        onClick={handleSendRequest}
        disabled={isSending}
        className="w-full rounded-none bg-primary text-primary-foreground hover:bg-primary/90 font-heading uppercase tracking-widest h-14 text-base"
      >
        <MessageSquarePlus className="mr-2 h-5 w-5" />
        {isSending ? 'Đang gửi...' : 'Liên hệ người bán'}
      </Button>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <div className="max-w-[100rem] mx-auto px-6 md:px-[80px] py-[60px]">
        {/* Back */}
        <div className="mb-8">
          <Link to="/">
            <Button variant="outline" className="border-secondary text-foreground hover:border-primary hover:text-primary rounded-none font-paragraph">
              <ArrowLeft className="mr-2 h-4 w-4" />Quay về
            </Button>
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 xl:gap-20">
          {/* Images */}
          <div>
            <div className="aspect-square bg-secondary/20 border border-secondary overflow-hidden mb-3">
              {imageUrls.length > 0 ? (
                <img
                  src={imageUrls[selectedImage]}
                  alt={listing.item_name}
                  className="w-full h-full object-contain"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                  <BookOpen className="h-16 w-16 opacity-20" />
                </div>
              )}
            </div>
            {imageUrls.length > 1 && (
              <div className="flex gap-2 flex-wrap">
                {imageUrls.map((url, i) => (
                  <button
                    key={i}
                    onClick={() => setSelectedImage(i)}
                    className={`w-16 h-16 border overflow-hidden transition-all ${
                      i === selectedImage ? 'border-primary' : 'border-secondary hover:border-primary/50'
                    }`}
                  >
                    <img src={url} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Info */}
          <div className="flex flex-col gap-6">
            {/* Status badges */}
            <div className="flex gap-2 flex-wrap">
              <span className="font-heading text-xs uppercase tracking-widest border border-secondary px-3 py-1">
                {listing.condition}
              </span>
              {listing.transaction_status === 'sold' && (
                <span className="font-heading text-xs uppercase tracking-widest border border-red-500/50 text-red-500 px-3 py-1">
                  Đã bán
                </span>
              )}
              {listing.transaction_status === 'negotiating' && (
                <span className="font-heading text-xs uppercase tracking-widest border border-amber-500/50 text-amber-500 px-3 py-1">
                  Đang thương lượng
                </span>
              )}
              {listing.transaction_status === 'available' && (
                <span className="font-heading text-xs uppercase tracking-widest border border-red-500/50 text-red-500 px-3 py-1">
                  Còn hàng
                </span>
              )}
            </div>

            <div>
              <h1 className="font-heading text-4xl uppercase tracking-tight leading-tight mb-4">
                {listing.item_name}
              </h1>
              <p className="font-heading text-3xl text-primary">
                {listing.item_price === 0
                  ? 'Miễn phí'
                  : `${listing.item_price.toLocaleString('vi-VN')} đ`}
              </p>
            </div>

            {/* Meta */}
            <div className="space-y-3 py-5 border-t border-b border-secondary">
              {listing.category && (
                <div className="flex items-center gap-3">
                  <Tag className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <span className="font-paragraph text-sm">{listing.category}</span>
                </div>
              )}
              {listing.subject && (
                <div className="flex items-center gap-3">
                  <BookOpen className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <span className="font-paragraph text-sm">{listing.subject}</span>
                </div>
              )}
              {listing.university && (
                <div className="flex items-center gap-3">
                  <School className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <span className="font-paragraph text-sm">{listing.university}</span>
                </div>
              )}
              {listing.seller_name && (
                <div className="flex items-center gap-3">
                  <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <span className="font-paragraph text-sm">
                    Đăng bởi{' '}
                    <Link
                      to={`/nguoi-dung/${listing.seller_id}`}
                      className="font-semibold hover:text-primary transition-colors underline underline-offset-2"
                    >
                      {listing.seller_name}
                    </Link>
                  </span>
                  {listing.seller_rating != null && (
                    <Link
                      to={`/nguoi-dung/${listing.seller_id}`}
                      className="flex items-center gap-1 text-xs text-amber-500 hover:text-amber-600 transition-colors"
                      title="Xem đánh giá người bán"
                    >
                      <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                      <span className="font-heading">
                        {Number(listing.seller_rating).toFixed(1)}
                      </span>
                      <span className="text-muted-foreground">
                        ({listing.seller_rating_count ?? 0})
                      </span>
                    </Link>
                  )}
                </div>
              )}
            </div>

            {/* Description */}
            {listing.item_description && (
              <div>
                <p className="font-heading text-xs uppercase tracking-widest text-muted-foreground mb-2">Mô tả</p>
                <p className="font-paragraph text-sm leading-relaxed">{listing.item_description}</p>
              </div>
            )}

            {/* Action */}
            <div className="space-y-3 pt-2">
              {renderRequestButton()}

              {/* Report */}
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

      {/* Auth Modal */}
      <AuthModal isOpen={showAuth} onClose={() => setShowAuth(false)} />

      {/* Chat Modal */}
      {activeSession && (
        <ChatModal
          isOpen={showChat}
          onClose={() => { setShowChat(false) }}
          session={activeSession}
        />
      )}

      {/* Report Modal */}
      {showReport && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowReport(false)} />
          <div className="relative z-10 w-full max-w-md mx-4 bg-background border border-secondary shadow-2xl p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-heading text-lg uppercase">Báo cáo bài đăng</h3>
              <button onClick={() => setShowReport(false)}><X className="h-5 w-5" /></button>
            </div>
            {reportDone ? (
              <div className="text-center py-6">
                <p className="font-heading text-base uppercase text-green-600 mb-2">✅ Đã ghi nhận báo cáo</p>
                <p className="font-paragraph text-sm text-muted-foreground mb-6">Cảm ơn bạn đã giúp cộng đồng.</p>
                <Button onClick={() => setShowReport(false)} className="rounded-none bg-primary text-primary-foreground font-heading uppercase tracking-widest">Đóng</Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="font-heading text-xs uppercase tracking-widest text-muted-foreground block mb-2">Lý do *</label>
                  <div className="relative">
                    <select
                      value={reportReason}
                      onChange={e => setReportReason(e.target.value)}
                      className="w-full border border-secondary bg-background font-paragraph text-sm px-3 py-2.5 appearance-none pr-8 focus:outline-none focus:ring-1 focus:ring-primary"
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
                    className="w-full border border-secondary bg-transparent font-paragraph text-sm px-3 py-2.5 resize-none focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
                {reportError && <p className="font-paragraph text-sm text-red-500">{reportError}</p>}
                <div className="flex gap-3">
                  <Button onClick={handleReport} className="flex-1 rounded-none bg-primary text-primary-foreground font-heading uppercase tracking-widest">Gửi báo cáo</Button>
                  <Button onClick={() => setShowReport(false)} variant="outline" className="rounded-none border-secondary font-heading uppercase tracking-widest px-5">Hủy</Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}