import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowLeft, MessageCircle, CheckCircle, XCircle,
  Clock, Archive, Star,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import { useAuth } from '@/context/AuthContext'
import ChatModal from '@/components/modals/ChatModal'
import RatingModal from '@/components/modals/RatingModal'
import {
  getSellerRequests,
  getBuyerRequests,
  getUserSessions,
  acceptRequest,
  rejectRequest,
} from '@/lib/Chatapi'

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

  // ── Load data ─────────────────────────────────────────────────────────────
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

  // ── Handlers ─────────────────────────────────────────────────────────────
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

  const openSession = async (session) => {
    setSelectedSession(session)
    setShowChat(true)
  }

  const onChatClose = async () => {
    setShowChat(false)
    await loadData()
  }

  // ── Guard ─────────────────────────────────────────────────────────────────
  if (!currentUser) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="max-w-[100rem] mx-auto px-6 md:px-[80px] py-[120px] text-center">
          <h2 className="font-heading text-3xl uppercase mb-6">Bạn chưa đăng nhập</h2>
          <Link to="/"><Button className="rounded-none bg-primary text-primary-foreground font-heading uppercase tracking-widest"><ArrowLeft className="mr-2 h-4 w-4" />Về trang chủ</Button></Link>
        </div>
        <Footer />
      </div>
    )
  }

  // ── Categorize ────────────────────────────────────────────────────────────
  const incomingPending = sellerRequests.filter(r => r.status === 'pending')
  const sentPending     = buyerRequests.filter(r => r.status === 'pending')
  const rejectedByBuyer = buyerRequests.filter(r => r.status === 'rejected')
  const activeSessions  = sessions.filter(s => s.status === 'active')
  const closedSessions  = sessions.filter(s => s.status === 'closed')
  const pendingCount    = incomingPending.length + activeSessions.length

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="max-w-[100rem] mx-auto px-6 md:px-[80px] py-[60px]">

        <div className="mb-8">
          <Link to="/"><Button variant="outline" className="border-secondary text-foreground hover:border-primary hover:text-primary rounded-none font-paragraph"><ArrowLeft className="mr-2 h-4 w-4" />Quay về</Button></Link>
        </div>

        <div className="mb-10 pb-8 border-b border-secondary">
          <h2 className="font-heading text-sm uppercase tracking-widest text-muted-foreground mb-3">[ Tin nhắn ]</h2>
          <div className="flex items-center gap-4">
            <h1 className="font-heading text-5xl uppercase tracking-tighter">Tin nhắn</h1>
            {pendingCount > 0 && (
              <span className="bg-primary text-primary-foreground font-heading text-sm px-3 py-1 uppercase tracking-widest">{pendingCount} mới</span>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-secondary mb-8">
          {[
            { id: 'requests', label: `Yêu cầu${incomingPending.length > 0 ? ` (${incomingPending.length})` : ''}` },
            { id: 'active',   label: `Đang chat${activeSessions.length > 0 ? ` (${activeSessions.length})` : ''}` },
            { id: 'history',  label: 'Lịch sử' },
          ].map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`px-6 py-4 font-heading text-sm uppercase tracking-widest transition-colors ${
                activeTab === tab.id
                  ? 'text-primary border-b-2 border-primary'
                  : 'text-muted-foreground hover:text-foreground'
              }`}>
              {tab.label}
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="py-20 text-center font-paragraph text-muted-foreground">Đang tải...</div>
        ) : (
          <>
            {/* ── Requests Tab ── */}
            {activeTab === 'requests' && (
              <div className="space-y-4">
                {/* Incoming (as seller) */}
                {incomingPending.length > 0 && (
                  <div>
                    <h3 className="font-heading text-xs uppercase tracking-widest text-muted-foreground mb-4">Yêu cầu nhận được</h3>
                    <div className="space-y-3">
                      {incomingPending.map(req => (
                        <div key={req.id} className="border border-secondary p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                          <div>
                            <p className="font-heading text-base uppercase">{req.buyer_name}</p>
                            <p className="font-paragraph text-sm text-muted-foreground">
                              muốn mua: <span className="text-foreground">{req.listing_name}</span>
                            </p>
                            <p className="font-paragraph text-xs text-muted-foreground mt-1">
                              {new Date(req.created_at).toLocaleString('vi-VN')}
                            </p>
                          </div>
                          <div className="flex gap-2">
                            <Button onClick={() => handleApprove(req)}
                              className="rounded-none bg-primary text-primary-foreground hover:bg-primary/90 font-heading uppercase tracking-widest text-xs h-10 px-4">
                              <CheckCircle className="h-4 w-4 mr-1.5" />Chấp thuận
                            </Button>
                            <Button onClick={() => handleReject(req)} variant="outline"
                              className="rounded-none border-red-500/50 text-red-500 hover:bg-red-500/10 font-heading uppercase tracking-widest text-xs h-10 px-4">
                              <XCircle className="h-4 w-4 mr-1.5" />Từ chối
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Sent (as buyer) */}
                {sentPending.length > 0 && (
                  <div className={incomingPending.length > 0 ? 'mt-8' : ''}>
                    <h3 className="font-heading text-xs uppercase tracking-widest text-muted-foreground mb-4">Yêu cầu đã gửi</h3>
                    <div className="space-y-3">
                      {sentPending.map(req => (
                        <div key={req.id} className="border border-secondary p-5 flex items-center justify-between">
                          <div>
                            <p className="font-paragraph text-sm text-foreground">
                              Đang chờ <span className="font-semibold">{req.seller_name}</span> phản hồi
                            </p>
                            <p className="font-paragraph text-sm text-muted-foreground">{req.listing_name}</p>
                          </div>
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Clock className="h-4 w-4 animate-pulse text-primary" />
                            <span className="font-heading text-xs uppercase tracking-widest">Đang chờ</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Rejected */}
                {rejectedByBuyer.length > 0 && (
                  <div className="mt-6">
                    <h3 className="font-heading text-xs uppercase tracking-widest text-muted-foreground mb-4">Đã bị từ chối</h3>
                    {rejectedByBuyer.map(req => (
                      <div key={req.id} className="border border-secondary/50 p-4 opacity-60">
                        <p className="font-paragraph text-sm">{req.listing_name}</p>
                        <p className="font-paragraph text-xs text-muted-foreground">Người bán đã từ chối yêu cầu</p>
                      </div>
                    ))}
                  </div>
                )}

                {incomingPending.length === 0 && sentPending.length === 0 && rejectedByBuyer.length === 0 && (
                  <div className="py-16 flex flex-col items-center justify-center border border-dashed border-secondary text-center">
                    <MessageCircle className="h-10 w-10 text-muted-foreground mb-4 opacity-40" />
                    <p className="font-heading text-xl uppercase text-muted-foreground">Chưa có yêu cầu nào</p>
                  </div>
                )}
              </div>
            )}

            {/* ── Active Sessions Tab ── */}
            {activeTab === 'active' && (
              <div className="space-y-3">
                {activeSessions.length > 0 ? activeSessions.map(session => (
                  <div key={session.id} className="border border-primary/30 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-primary/5">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
                        <p className="font-heading text-sm uppercase tracking-widest text-primary">Đang chat</p>
                      </div>
                      <p className="font-heading text-base uppercase">{session.listing_name}</p>
                      <p className="font-paragraph text-sm text-muted-foreground">
                        {session.seller_id === currentUser.id
                          ? `Buyer: ${session.buyer_name}`
                          : `Seller: ${session.seller_name}`}
                      </p>
                    </div>
                    <Button onClick={() => openSession(session)}
                      className="rounded-none bg-primary text-primary-foreground hover:bg-primary/90 font-heading uppercase tracking-widest text-xs h-10 px-5">
                      <MessageCircle className="h-4 w-4 mr-1.5" />Mở chat
                    </Button>
                  </div>
                )) : (
                  <div className="py-16 flex flex-col items-center justify-center border border-dashed border-secondary text-center">
                    <MessageCircle className="h-10 w-10 text-muted-foreground mb-4 opacity-40" />
                    <p className="font-heading text-xl uppercase text-muted-foreground">Không có cuộc trò chuyện nào</p>
                  </div>
                )}
              </div>
            )}

            {/* ── History Tab ── */}
            {activeTab === 'history' && (
              <div className="space-y-3">
                {closedSessions.length > 0 ? closedSessions.map(session => {
                  const isSeller  = session.seller_id === currentUser.id
                  const hasRated  = isSeller ? session.seller_rated : session.buyer_rated
                  const canRate   = session.close_reason === 'completed' && !hasRated
                  return (
                    <div key={session.id} className={`border p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4
                      ${canRate ? 'border-amber-500/40 bg-amber-500/5' : 'border-secondary opacity-80'}`}>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <Archive className="h-4 w-4 text-muted-foreground" />
                          <span className="font-heading text-xs uppercase tracking-widest text-muted-foreground">
                            {session.close_reason === 'completed' ? 'Đã hoàn thành' : 'Đã hủy'}
                          </span>
                          {hasRated && (
                            <span className="flex items-center gap-1 font-heading text-[10px] uppercase tracking-widest text-green-600">
                              <CheckCircle className="h-3 w-3" />Đã đánh giá
                            </span>
                          )}
                        </div>
                        <p className="font-heading text-base uppercase">{session.listing_name}</p>
                        <p className="font-paragraph text-sm text-muted-foreground">
                          {isSeller ? `Buyer: ${session.buyer_name}` : `Seller: ${session.seller_name}`}
                        </p>
                        {session.closed_at && (
                          <p className="font-paragraph text-xs text-muted-foreground mt-1">
                            {new Date(session.closed_at).toLocaleString('vi-VN')}
                          </p>
                        )}
                      </div>
                      <div className="flex gap-2">
                        {canRate && (
                          <Button
                            onClick={() => { setRatingSession(session); setShowRating(true) }}
                            className="rounded-none bg-amber-500 hover:bg-amber-600 text-white font-heading uppercase tracking-widest text-xs h-10 px-4">
                            <Star className="h-3.5 w-3.5 mr-1.5 fill-white" />Đánh giá
                          </Button>
                        )}
                        <Button variant="outline" onClick={() => openSession(session)}
                          className="rounded-none border-secondary hover:border-primary hover:text-primary font-heading uppercase tracking-widest text-xs h-10 px-5">
                          Xem lại
                        </Button>
                      </div>
                    </div>
                  )
                }) : (
                  <div className="py-16 flex flex-col items-center justify-center border border-dashed border-secondary text-center">
                    <Archive className="h-10 w-10 text-muted-foreground mb-4 opacity-40" />
                    <p className="font-heading text-xl uppercase text-muted-foreground">Chưa có lịch sử</p>
                  </div>
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
