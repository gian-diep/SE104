import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowLeft, MessageCircle, CheckCircle, XCircle,
  Clock, Archive, Star, Inbox,
} from 'lucide-react'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import { useAuth } from '@/context/AuthContext'
import ChatModal from '@/components/modals/ChatModal'
import RatingModal from '@/components/modals/RatingModal'
import {
  getSellerRequests, getBuyerRequests, getUserSessions,
  acceptRequest, rejectRequest,
} from '@/lib/Chatapi'

function EmptyState({ icon: Icon, title, subtitle }) {
  return (
    <div className="py-20 flex flex-col items-center justify-center bg-white rounded-2xl border border-dashed border-teal-200 text-center gap-3">
      <div className="w-16 h-16 rounded-2xl bg-teal-50 flex items-center justify-center">
        <Icon className="h-8 w-8 text-teal-300" />
      </div>
      <p className="font-heading text-base font-bold text-muted-foreground">{title}</p>
      {subtitle && <p className="font-paragraph text-sm text-muted-foreground">{subtitle}</p>}
    </div>
  )
}

export default function MessagesPage() {
  const { currentUser } = useAuth()
  const [sellerRequests, setSellerRequests] = useState([])
  const [buyerRequests,  setBuyerRequests]  = useState([])
  const [sessions,       setSessions]       = useState([])
  const [activeTab,      setActiveTab]      = useState('requests')
  const [selectedSession, setSelectedSession] = useState(null)
  const [showChat,        setShowChat]        = useState(false)
  const [ratingSession,   setRatingSession]   = useState(null)
  const [showRating,      setShowRating]      = useState(false)
  const [isLoading,       setIsLoading]       = useState(true)

  const loadData = useCallback(async () => {
    if (!currentUser) return
    try {
      setIsLoading(true)
      const [sReqs, bReqs, sess] = await Promise.all([
        getSellerRequests(currentUser.id),
        getBuyerRequests(currentUser.id),
        getUserSessions(currentUser.id),
      ])
      setSellerRequests(sReqs)
      setBuyerRequests(bReqs)
      setSessions(sess)
    } catch (err) {
      console.error('loadData error:', err)
    } finally {
      setIsLoading(false)
    }
  }, [currentUser])

  useEffect(() => { loadData() }, [loadData])

  const handleApprove = async (req) => {
    try {
      const newSession = await acceptRequest(req.id)
      await loadData()
      setSelectedSession(newSession)
      setShowChat(true)
    } catch (err) {
      alert(err.message || 'Không thể chấp thuận yêu cầu')
    }
  }

  const handleReject = async (req) => {
    try {
      await rejectRequest(req.id)
      await loadData()
    } catch (err) {
      alert(err.message || 'Không thể từ chối yêu cầu')
    }
  }

  const openSession = async (session) => { setSelectedSession(session); setShowChat(true) }
  const onChatClose = async () => { setShowChat(false); await loadData() }

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="max-w-[100rem] mx-auto px-6 md:px-16 py-32 text-center">
          <div className="w-20 h-20 rounded-3xl bg-teal-50 flex items-center justify-center mx-auto mb-6">
            <MessageCircle className="w-10 h-10 text-teal-300" />
          </div>
          <h2 className="font-heading text-2xl font-bold mb-4 text-foreground">Bạn chưa đăng nhập</h2>
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

  const incomingPending = sellerRequests.filter(r => r.status === 'pending')
  const sentPending     = buyerRequests.filter(r => r.status === 'pending')
  const rejectedByBuyer = buyerRequests.filter(r => r.status === 'rejected')
  const activeSessions  = sessions.filter(s => s.status === 'active')
  const closedSessions  = sessions.filter(s => s.status === 'closed')
  const pendingCount    = incomingPending.length + activeSessions.length

  const tabs = [
    { id: 'requests', label: 'Yêu cầu', count: incomingPending.length, icon: Inbox },
    { id: 'active',   label: 'Đang chat', count: activeSessions.length, icon: MessageCircle },
    { id: 'history',  label: 'Lịch sử', count: 0, icon: Archive },
  ]

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

        {/* Header */}
        <div className="mb-8">
          <div className="inline-flex items-center gap-2 bg-teal-50 text-primary px-3 py-1.5 rounded-full border border-teal-200 text-xs font-heading font-semibold uppercase tracking-wide mb-3">
            <MessageCircle className="w-3.5 h-3.5" />
            Tin nhắn
          </div>
          <div className="flex items-center gap-4">
            <h1 className="font-heading text-4xl md:text-5xl font-black tracking-tighter text-foreground">TIN NHẮN</h1>
            {pendingCount > 0 && (
              <span className="bg-primary text-white font-heading text-xs font-bold px-3 py-1.5 rounded-full shadow-btn animate-pulse-soft">
                {pendingCount} mới
              </span>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-8 p-1.5 bg-white rounded-2xl border border-teal-100 shadow-soft w-fit">
          {tabs.map(tab => {
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-heading text-sm font-semibold transition-all ${
                  activeTab === tab.id
                    ? 'bg-teal-gradient text-white shadow-btn'
                    : 'text-muted-foreground hover:text-foreground hover:bg-surface'
                }`}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
                {tab.count > 0 && (
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                    activeTab === tab.id ? 'bg-white/20 text-white' : 'bg-primary text-white'
                  }`}>
                    {tab.count}
                  </span>
                )}
              </button>
            )
          })}
        </div>

        {isLoading ? (
          <div className="py-20 flex flex-col items-center gap-4">
            <div className="relative w-12 h-12">
              <div className="absolute inset-0 rounded-full border-4 border-teal-100" />
              <div className="absolute inset-0 rounded-full border-4 border-t-primary animate-spin" />
            </div>
            <p className="font-paragraph text-sm text-muted-foreground">Đang tải...</p>
          </div>
        ) : (
          <>
            {/* Requests Tab */}
            {activeTab === 'requests' && (
              <div className="space-y-6">
                {incomingPending.length > 0 && (
                  <div>
                    <p className="font-heading text-xs uppercase tracking-widest text-muted-foreground mb-4">Yêu cầu nhận được</p>
                    <div className="space-y-3">
                      {incomingPending.map(req => (
                        <div key={req.id} className="bg-white rounded-2xl border border-teal-100 shadow-soft p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
                              <p className="font-heading text-sm font-bold text-foreground">{req.buyer_name}</p>
                            </div>
                            <p className="font-paragraph text-sm text-muted-foreground">
                              muốn mua: <span className="text-foreground font-medium">{req.listing_name}</span>
                            </p>
                            <p className="font-paragraph text-xs text-muted-foreground mt-1">
                              {new Date(req.created_at).toLocaleString('vi-VN')}
                            </p>
                          </div>
                          <div className="flex gap-2 flex-shrink-0">
                            <button onClick={() => handleApprove(req)}
                              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-teal-gradient text-white font-heading text-xs font-semibold shadow-btn hover:shadow-card hover:-translate-y-0.5 transition-all">
                              <CheckCircle className="h-3.5 w-3.5" />Chấp thuận
                            </button>
                            <button onClick={() => handleReject(req)}
                              className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-red-200 bg-red-50 text-red-500 font-heading text-xs font-semibold hover:bg-red-100 transition-colors">
                              <XCircle className="h-3.5 w-3.5" />Từ chối
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {sentPending.length > 0 && (
                  <div>
                    <p className="font-heading text-xs uppercase tracking-widest text-muted-foreground mb-4">Yêu cầu đã gửi</p>
                    <div className="space-y-3">
                      {sentPending.map(req => (
                        <div key={req.id} className="bg-white rounded-2xl border border-amber-100 shadow-soft p-5 flex items-center justify-between">
                          <div>
                            <p className="font-paragraph text-sm text-foreground">
                              Đang chờ <span className="font-semibold">{req.seller_name}</span> phản hồi
                            </p>
                            <p className="font-paragraph text-sm text-muted-foreground">{req.listing_name}</p>
                          </div>
                          <div className="flex items-center gap-2 bg-amber-50 px-3 py-1.5 rounded-xl border border-amber-200">
                            <Clock className="h-4 w-4 text-amber-500 animate-pulse" />
                            <span className="font-heading text-xs font-semibold text-amber-600">Đang chờ</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {rejectedByBuyer.length > 0 && (
                  <div>
                    <p className="font-heading text-xs uppercase tracking-widest text-muted-foreground mb-4">Đã bị từ chối</p>
                    <div className="space-y-2">
                      {rejectedByBuyer.map(req => (
                        <div key={req.id} className="bg-white rounded-xl border border-teal-100 p-4 opacity-50">
                          <p className="font-paragraph text-sm text-foreground">{req.listing_name}</p>
                          <p className="font-paragraph text-xs text-muted-foreground">Người bán đã từ chối yêu cầu</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {incomingPending.length === 0 && sentPending.length === 0 && rejectedByBuyer.length === 0 && (
                  <EmptyState icon={Inbox} title="Chưa có yêu cầu nào" subtitle="Khi ai đó muốn mua tài liệu của bạn, yêu cầu sẽ hiện ở đây" />
                )}
              </div>
            )}

            {/* Active Sessions Tab */}
            {activeTab === 'active' && (
              <div className="space-y-4">
                {activeSessions.length > 0 ? (
                  activeSessions.map(session => {
                    const isSeller = session.seller_id === currentUser.id
                    const otherName = isSeller
                      ? session.buyer_name
                      : session.seller_name

                    return (
                      <div
                        key={session.id}
                        className="
                          group relative overflow-hidden
                          bg-white rounded-3xl border border-teal-100
                          shadow-soft hover:shadow-card
                          transition-all duration-300
                          hover:-translate-y-0.5
                        "
                      >
                        {/* Accent bar */}
                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary" />

                        <div className="p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-5">
                          {/* Left content */}
                          <div className="flex items-start gap-4 min-w-0">
                            {/* Chat icon bubble */}
                            <div className="w-14 h-14 rounded-2xl bg-teal-50 border border-teal-100 flex items-center justify-center flex-shrink-0">
                              <MessageCircle className="h-6 w-6 text-primary" />
                            </div>

                            <div className="min-w-0">
                              {/* Status */}
                              <div className="flex items-center gap-2 mb-2">
                                <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-100 text-emerald-600">
                                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                  <span className="font-heading text-[10px] font-semibold uppercase tracking-widest">
                                    Đang hoạt động
                                  </span>
                                </span>
                              </div>

                              {/* Listing name */}
                              <h3 className="font-heading text-lg font-bold text-foreground line-clamp-2 mb-1">
                                {session.listing_name}
                              </h3>

                              {/* User info */}
                              <p className="font-paragraph text-sm text-muted-foreground">
                                {isSeller ? 'Người mua:' : 'Người bán:'}{' '}
                                <span className="font-semibold text-foreground">
                                  {otherName}
                                </span>
                              </p>
                            </div>
                          </div>

                          {/* Right action */}
                          <button
                            onClick={() => openSession(session)}
                            className="
                              flex items-center justify-center gap-2
                              px-5 py-3 rounded-2xl
                              bg-teal-gradient text-white
                              font-heading text-xs font-semibold uppercase tracking-wide
                              shadow-btn hover:shadow-card
                              hover:-translate-y-0.5
                              transition-all flex-shrink-0
                            "
                          >
                            <MessageCircle className="h-4 w-4" />
                            Mở chat
                          </button>
                        </div>
                      </div>
                    )
                  })
                ) : (
                  <EmptyState
                    icon={MessageCircle}
                    title="Không có cuộc trò chuyện nào"
                    subtitle="Chấp thuận yêu cầu để bắt đầu chat"
                  />
                )}
              </div>
            )}

            {/* History Tab */}
            {activeTab === 'history' && (
              <div className="space-y-3">
                {closedSessions.length > 0 ? closedSessions.map(session => {
                  const isSeller = session.seller_id === currentUser.id
                  const hasRated = isSeller ? session.seller_rated : session.buyer_rated
                  const canRate  = session.close_reason === 'completed' && !hasRated
                  return (
                    <div key={session.id} className={`bg-white rounded-2xl border shadow-soft p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                      canRate ? 'border-amber-200' : 'border-teal-100 opacity-75'
                    }`}>
                      <div>
                        <div className="flex items-center gap-2 mb-1.5">
                          <Archive className="h-4 w-4 text-muted-foreground" />
                          <span className="font-heading text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                            {session.close_reason === 'completed' ? '✓ Đã hoàn thành' : 'Đã hủy'}
                          </span>
                          {hasRated && (
                            <span className="flex items-center gap-1 font-heading text-[10px] font-semibold text-emerald-600">
                              <CheckCircle className="h-3 w-3" />Đã đánh giá
                            </span>
                          )}
                        </div>
                        <p className="font-heading text-sm font-bold text-foreground">{session.listing_name}</p>
                        <p className="font-paragraph text-sm text-muted-foreground">
                          {isSeller ? `Người mua: ${session.buyer_name}` : `Người bán: ${session.seller_name}`}
                        </p>
                        {session.closed_at && (
                          <p className="font-paragraph text-xs text-muted-foreground mt-1">
                            {new Date(session.closed_at).toLocaleString('vi-VN')}
                          </p>
                        )}
                      </div>
                      <div className="flex gap-2 flex-shrink-0">
                        {canRate && (
                          <button
                            onClick={() => { setRatingSession(session); setShowRating(true) }}
                            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-heading text-xs font-semibold transition-colors shadow-btn">
                            <Star className="h-3.5 w-3.5 fill-white" />Đánh giá
                          </button>
                        )}
                        <button onClick={() => openSession(session)}
                          className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-teal-100 text-foreground font-heading text-xs font-semibold hover:border-primary hover:text-primary transition-colors">
                          Xem lại
                        </button>
                      </div>
                    </div>
                  )
                }) : (
                  <EmptyState icon={Archive} title="Chưa có lịch sử" subtitle="Các giao dịch đã hoàn thành sẽ hiện ở đây" />
                )}
              </div>
            )}
          </>
        )}
      </div>
      <Footer />

      {selectedSession && (
        <ChatModal isOpen={showChat} onClose={onChatClose} session={selectedSession} />
      )}
      {ratingSession && (
        <RatingModal
          isOpen={showRating}
          onClose={async () => { setShowRating(false); setRatingSession(null); await loadData() }}
          session={ratingSession}
          onRated={loadData}
        />
      )}
    </div>
  )
}