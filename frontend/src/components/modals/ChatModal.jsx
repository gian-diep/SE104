import { useState, useEffect, useRef, useCallback } from 'react'
import { X as XIcon, Send, CheckCircle, XCircle, MessageCircle, Star, BookOpen } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useAuth } from '@/context/AuthContext'
import { motion, AnimatePresence } from 'framer-motion'
import RatingModal from '@/components/modals/RatingModal'
import {
  getMessages,
  sendMessage,
  getSession,
  confirmComplete,
  cancelSession,
} from '@/lib/Chatapi.js'
import { Link } from 'react-router-dom'

export default function ChatModal({ isOpen, onClose, session: sessionProp }) {
  const { currentUser } = useAuth()
  const [session,    setSession]    = useState(sessionProp)
  const [messages,   setMessages]   = useState([])
  const [input,      setInput]      = useState('')
  const [isSending,  setIsSending]  = useState(false)
  const [showRating, setShowRating] = useState(false)
  const [isLoading,  setIsLoading]  = useState(true)
  const messagesEndRef = useRef(null)
  const pollRef        = useRef(null)

  // ── Load session + messages ───────────────────────────────────────────────
  const refresh = useCallback(async () => {
    if (!sessionProp?.id) return
    try {
      const [sess, msgs] = await Promise.all([
        getSession(sessionProp.id),
        getMessages(sessionProp.id),
      ])
      setSession(sess)
      setMessages(msgs)
    } catch (e) {
      console.error('refresh error:', e)
    }
  }, [sessionProp?.id])

  useEffect(() => {
    if (!isOpen || !sessionProp) return
    setIsLoading(true)
    refresh().finally(() => setIsLoading(false))
  }, [isOpen, sessionProp, refresh])

  // Polling mỗi 3 giây khi chat đang mở và session active
  useEffect(() => {
    if (!isOpen || session?.status !== 'active') return
    pollRef.current = setInterval(refresh, 3000)
    return () => clearInterval(pollRef.current)
  }, [isOpen, session?.status, refresh])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // ── Send message ─────────────────────────────────────────────────────────
  const handleSend = async () => {
    if (!input.trim() || !session || session.status === 'closed') return
    setIsSending(true)
    try {
      const msg = await sendMessage(session.id, {
        senderId: currentUser.id,
        text: input.trim(),
      })
      setMessages(prev => [...prev, msg])
      setInput('')
    } catch (e) {
      alert(e.message || 'Không thể gửi tin nhắn')
    } finally {
      setIsSending(false)
    }
  }

  // ── Confirm complete ─────────────────────────────────────────────────────
  const handleConfirmComplete = async () => {
    try {
      const updated = await confirmComplete(session.id, currentUser.id)
      setSession(updated)
      await refresh()
    } catch (e) {
      alert(e.message || 'Lỗi xác nhận')
    }
  }

  // ── Cancel ───────────────────────────────────────────────────────────────
  const handleCancel = async () => {
    try {
      const updated = await cancelSession(session.id, currentUser.id)
      setSession(updated)
      await refresh()
      setTimeout(onClose, 1500)
    } catch (e) {
      alert(e.message || 'Lỗi hủy session')
    }
  }

  // ── Derived state ────────────────────────────────────────────────────────
  const isClosed     = session?.status === 'closed'
  const isCompleted  = isClosed && session?.close_reason === 'completed'
  const isSeller     = currentUser?.id === session?.seller_id
  const hasConfirmed = isSeller ? session?.seller_confirmed : session?.buyer_confirmed
  const hasRated     = isSeller ? session?.seller_rated : session?.buyer_rated

  if (!isOpen || !session) return null

  return (
    <>
      <AnimatePresence>
        <div className="fixed inset-0 z-[100] flex items-center justify-center">
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 16 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="
              relative z-10 w-full max-w-2xl mx-4
              bg-white rounded-[2rem]
              border border-teal-100
              shadow-[0_20px_60px_rgba(0,0,0,0.12)]
              overflow-hidden
              flex flex-col
            "
            style={{ maxHeight: '88vh' }}
          >

            {/* Header */}
            <div className="relative border-b border-teal-100 bg-gradient-to-b from-teal-50/70 to-white rounded-t-[2rem] flex-shrink-0 px-6 py-5">

              {/* Close */}
              <button
                onClick={onClose}
                className="absolute top-5 right-5 z-10 w-10 h-10 rounded-xl hover:bg-white border border-transparent hover:border-teal-100 transition flex items-center justify-center text-muted-foreground hover:text-foreground"
              >
                <XIcon className="h-5 w-5" />
              </button>

              {/* Panels */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pr-14">

                {/* LEFT - USER */}
                <div className="rounded-3xl bg-white border border-teal-100 p-4 shadow-sm hover:shadow-md transition-all flex items-start gap-4 min-w-0">

                  <div className="w-14 h-14 rounded-2xl bg-teal-gradient text-white flex items-center justify-center shadow-md shrink-0">
                    <MessageCircle className="h-6 w-6" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <Link
                      to={`/nguoi-dung/${isSeller ? session.buyer_id : session.seller_id}`}
                      className="group block"
                    >
                      <h2 className="font-heading text-lg font-bold text-foreground truncate group-hover:text-primary transition-colors">
                        {isSeller ? session.buyer_name : session.seller_name}
                      </h2>

                      <p className="font-paragraph text-sm text-muted-foreground group-hover:text-primary transition-colors">
                        Xem hồ sơ người dùng →
                      </p>
                    </Link>

                    {/* Status */}
                    <div className="mt-3">
                      {isClosed ? (
                        <span
                          className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-heading font-semibold ${
                            isCompleted
                              ? 'bg-emerald-100 text-emerald-700'
                              : 'bg-red-100 text-red-600'
                          }`}
                        >
                          {isCompleted ? '✓ Đã hoàn thành' : '✕ Đã huỷ'}
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-3 py-1 rounded-full bg-teal-100 text-primary text-xs font-heading font-semibold">
                          Đang giao dịch
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* RIGHT - LISTING */}
                <Link
                  to={`/listings/${session.listing_id}`}
                  className="group block h-full"
                >
                  <div className="h-full rounded-3xl border border-teal-100 bg-white hover:border-primary/30 hover:shadow-md transition-all p-4 flex flex-col justify-between">

                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-8 h-8 rounded-xl bg-teal-50 flex items-center justify-center text-sm">
                            <BookOpen className="h-4 w-4" />
                        </div>

                        <span className="font-heading text-xs uppercase tracking-wide text-muted-foreground">
                          Bài đăng
                        </span>
                      </div>

                      <p className="font-heading text-sm font-bold text-foreground line-clamp-2 group-hover:text-primary transition-colors">
                        {session.listing_name}
                      </p>
                    </div>

                    <p className="font-paragraph text-xs text-muted-foreground mt-4 group-hover:text-primary transition-colors">
                      Xem chi tiết bài đăng →
                    </p>
                  </div>
                </Link>
              </div>
            </div>
            {/* Banner đánh giá */}
            {isCompleted && !hasRated && (
              <div className="flex items-center justify-between gap-3 px-6 py-3 bg-amber-500/10 border-b border-amber-500/30 flex-shrink-0">
                <div className="flex items-center gap-2">
                  <Star className="h-4 w-4 text-amber-500 fill-amber-500" />
                  <p className="font-paragraph text-sm text-amber-700">
                    Giao dịch hoàn thành! Hãy đánh giá <strong>{isSeller ? session.buyer_name : session.seller_name}</strong>
                  </p>
                </div>
                <Button
                  onClick={() => setShowRating(true)}
                  className="rounded-none bg-amber-500 hover:bg-amber-600 text-white font-heading text-xs uppercase tracking-widest h-8 px-4 flex-shrink-0"
                >
                  Đánh giá ngay
                </Button>
              </div>
            )}

            {isCompleted && hasRated && (
              <div className="flex items-center gap-2 px-6 py-2.5 bg-green-500/10 border-b border-green-500/20 flex-shrink-0">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <p className="font-paragraph text-xs text-green-600">Bạn đã gửi đánh giá cho giao dịch này.</p>
              </div>
            )}

            {/* Messages */}
            <div
              className="flex-1 overflow-y-auto px-5 py-5 bg-[#f8fbfb] space-y-4 min-h-0"
              style={{ maxHeight: '52vh' }}
            >
              {isLoading ? (
                <div className="flex items-center justify-center h-32 text-muted-foreground">
                  <p className="font-paragraph text-sm">Đang tải...</p>
                </div>
              ) : messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
                  <MessageCircle className="h-8 w-8 mb-2 opacity-40" />
                  <p className="font-paragraph text-sm">Bắt đầu cuộc trò chuyện</p>
                </div>
              ) : (
                messages.map((msg) =>
                  msg.type === 'system' ? (
                    <div key={msg.id} className="text-center">
                      <span className="font-paragraph text-xs text-muted-foreground bg-secondary/30 px-3 py-1.5 inline-block">
                        {msg.text}
                      </span>
                    </div>
                  ) : (
                    <div
                      key={msg.id}
                      className={`flex ${
                        msg.sender_id === currentUser?.id
                          ? 'justify-end'
                          : 'justify-start'
                      }`}
                    >
                      <div
                        className={`
                          max-w-[78%] px-4 py-3 rounded-[1.4rem]
                          shadow-sm transition-all
                          ${
                            msg.sender_id === currentUser?.id
                              ? 'bg-teal-gradient text-white rounded-br-md'
                              : 'bg-white border border-teal-100 text-foreground rounded-bl-md'
                          }
                        `}
                      >
                        <p className="font-paragraph text-sm leading-relaxed break-words">
                          {msg.text}
                        </p>

                        <p
                          className={`text-[11px] mt-1 text-right ${
                            msg.sender_id === currentUser?.id
                              ? 'text-white/70'
                              : 'text-muted-foreground'
                          }`}
                        >
                          {new Date(msg.timestamp).toLocaleTimeString(
                            'vi-VN',
                            {
                              hour: '2-digit',
                              minute: '2-digit',
                            }
                          )}
                        </p>
                      </div>
                    </div>
                  )
                )
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Confirm / Cancel */}
            {!isClosed && (
              <div className="px-5 py-4 border-t border-teal-100 bg-[#fcfefe] flex-shrink-0">
                <div className="grid grid-cols-2 gap-3">
                  {!hasConfirmed ? (
                    <button
                      onClick={handleConfirmComplete}
                      className="
                        h-12 rounded-2xl
                        bg-teal-gradient text-white
                        font-heading text-xs font-semibold uppercase tracking-wide
                        shadow-btn hover:shadow-card
                        hover:-translate-y-0.5
                        transition-all
                        flex items-center justify-center gap-2
                      "
                    >
                      <CheckCircle className="h-4 w-4" />
                      Xác nhận hoàn thành
                    </button>
                  ) : (
                    <div
                      className="
                        h-12 rounded-2xl
                        bg-emerald-50 border border-emerald-200
                        text-emerald-600
                        font-heading text-xs uppercase tracking-wide
                        flex items-center justify-center gap-2
                      "
                    >
                      <CheckCircle className="h-4 w-4" />
                      Đã xác nhận
                    </div>
                  )}

                  <button
                    onClick={handleCancel}
                    className="
                      h-12 rounded-2xl
                      border border-red-200
                      bg-red-50 text-red-500
                      font-heading text-xs font-semibold uppercase tracking-wide
                      hover:bg-red-100
                      hover:border-red-300
                      transition-all
                      flex items-center justify-center gap-2
                    "
                  >
                    <XCircle className="h-4 w-4" />
                    Hủy giao dịch
                  </button>
                </div>

                {hasConfirmed && (
                  <p className="text-center text-xs text-muted-foreground mt-3">
                    Đang chờ bên còn lại xác nhận hoàn thành
                  </p>
                )}
              </div>
            )}

            {/* Input */}
            {!isClosed && (
              <div className="px-5 py-4 border-t border-teal-100 bg-white flex-shrink-0">
                <div className="flex items-center gap-3 bg-surface border border-teal-100 rounded-2xl px-3 py-2 shadow-soft">
                  <Input
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={e =>
                      e.key === 'Enter' &&
                      !e.shiftKey &&
                      handleSend()
                    }
                    placeholder="Nhập tin nhắn..."
                    className="
                      flex-1 border-0 bg-transparent
                      focus-visible:ring-0
                      font-paragraph text-sm
                      shadow-none
                    "
                  />

                  <button
                    onClick={handleSend}
                    disabled={!input.trim() || isSending}
                    className="
                      w-11 h-11 rounded-xl
                      bg-teal-gradient text-white
                      flex items-center justify-center
                      shadow-btn hover:shadow-card
                      hover:-translate-y-0.5
                      transition-all
                      disabled:opacity-40
                    "
                  >
                    <Send className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        </div>
      </AnimatePresence>

      <RatingModal
        isOpen={showRating}
        onClose={async () => { setShowRating(false); await refresh() }}
        session={session}
      />
    </>
  )
}