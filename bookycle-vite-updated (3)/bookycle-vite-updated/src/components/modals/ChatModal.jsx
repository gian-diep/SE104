import { useState, useEffect, useRef, useCallback } from 'react'
import { X, Send, CheckCircle, XCircle, MessageCircle, Star } from 'lucide-react'
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
} from '@/lib/Chatapi'

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
            className="relative z-10 w-full max-w-lg mx-4 bg-background border border-secondary shadow-2xl flex flex-col"
            style={{ maxHeight: '90vh' }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-secondary flex-shrink-0">
              <div className="flex items-center gap-3">
                <MessageCircle className="h-5 w-5 text-primary" />
                <div>
                  <p className="font-heading text-sm uppercase tracking-widest">
                    {isSeller ? session.buyer_name : session.seller_name}
                  </p>
                  <p className="font-paragraph text-xs text-muted-foreground line-clamp-1">
                    {session.listing_name}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {isClosed && (
                  <span className="font-heading text-xs uppercase tracking-widest text-muted-foreground border border-secondary px-2 py-1">
                    {isCompleted ? '✅ Đã hoàn thành' : '❌ Đã hủy'}
                  </span>
                )}
                <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
                  <X className="h-5 w-5" />
                </button>
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
            <div className="flex-1 overflow-y-auto p-6 space-y-4 min-h-0" style={{ maxHeight: '50vh' }}>
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
                    <div key={msg.id} className={`flex ${msg.sender_id === currentUser?.id ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[75%] px-4 py-2.5 ${
                        msg.sender_id === currentUser?.id
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-secondary/40 text-foreground'
                      }`}>
                        <p className="font-paragraph text-sm">{msg.text}</p>
                        <p className="font-paragraph text-xs opacity-50 mt-1 text-right">
                          {new Date(msg.timestamp).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
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
              <div className="px-6 pb-2 pt-3 border-t border-secondary/50 flex gap-2 flex-shrink-0">
                {!hasConfirmed ? (
                  <Button onClick={handleConfirmComplete} variant="outline"
                    className="flex-1 h-9 rounded-none border-green-500/50 text-green-600 hover:bg-green-500/10 font-heading text-xs uppercase tracking-widest">
                    <CheckCircle className="h-4 w-4 mr-1.5" />Xác nhận hoàn thành
                  </Button>
                ) : (
                  <div className="flex-1 h-9 flex items-center justify-center font-heading text-xs uppercase tracking-widest text-green-600">
                    <CheckCircle className="h-4 w-4 mr-1.5" />Đã xác nhận — chờ bên kia
                  </div>
                )}
                <Button onClick={handleCancel} variant="outline"
                  className="h-9 px-3 rounded-none border-red-500/50 text-red-500 hover:bg-red-500/10 font-heading text-xs uppercase tracking-widest">
                  <XCircle className="h-4 w-4 mr-1.5" />Hủy
                </Button>
              </div>
            )}

            {/* Input */}
            {!isClosed && (
              <div className="flex gap-0 border-t border-secondary flex-shrink-0">
                <Input
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
                  placeholder="Nhập tin nhắn..."
                  className="flex-1 h-12 rounded-none border-0 border-r border-secondary focus-visible:ring-0 font-paragraph bg-transparent"
                />
                <button
                  onClick={handleSend}
                  disabled={!input.trim() || isSending}
                  className="w-12 h-12 flex items-center justify-center text-primary hover:bg-primary/10 transition-colors disabled:opacity-40"
                >
                  <Send className="h-4 w-4" />
                </button>
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
