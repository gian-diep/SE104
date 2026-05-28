import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Star, Send, BookOpen, CheckCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/context/AuthContext'
import { rateSession } from '@/lib/Chatapi.js'

const STAR_LABELS = { 1: 'Rất tệ', 2: 'Không tốt', 3: 'Bình thường', 4: 'Tốt', 5: 'Rất tốt' }

export default function RatingModal({ isOpen, onClose, session, onRated }) {
  const { currentUser } = useAuth()
  const [stars,     setStars]     = useState(0)
  const [hovered,   setHovered]   = useState(0)
  const [comment,   setComment]   = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [error,     setError]     = useState('')
  const [isLoading, setIsLoading] = useState(false)

  // Logic: Xoá sạch dữ liệu cũ mỗi khi Modal được mở lên
  useEffect(() => {
    if (isOpen) {
      setStars(0)
      setHovered(0)
      setComment('')
      setSubmitted(false)
      setError('')
    }
  }, [isOpen])

  // Tránh lỗi crash nếu thiếu dữ liệu
  if (!session || !currentUser) return null

  const isSeller  = currentUser.id === session.seller_id
  const ratedName = isSeller ? session.buyer_name : session.seller_name

  const handleSubmit = async () => {
    if (stars === 0) { setError('Vui lòng chọn số sao'); return }
    setError('')
    setIsLoading(true)
    try {
      await rateSession(session.id, {
        raterId:  currentUser.id,
        stars,
        comment:  comment.trim(),
      })
      setSubmitted(true)
      onRated?.()
    } catch (e) {
      setError(e.message || 'Không thể gửi đánh giá')
    } finally {
      setIsLoading(false)
    }
  }

  const display = hovered || stars

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Modal Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 12 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="relative z-10 w-full max-w-md bg-white rounded-[2rem] shadow-[0_20px_60px_rgba(0,0,0,0.12)] border border-amber-100 overflow-hidden"
          >
            {/* Header */}
            <div className="relative border-b border-amber-100 bg-gradient-to-b from-amber-50/70 to-white px-6 py-5">
              <div className="flex items-start justify-between pr-8">
                <div>
                  <p className="font-heading text-xs font-semibold uppercase tracking-widest text-amber-600 mb-1">
                    Đánh giá giao dịch
                  </p>
                  <h2 className="font-heading text-xl font-bold text-foreground">
                    {ratedName}
                  </h2>
                </div>
              </div>
              <button
                onClick={onClose}
                className="absolute top-5 right-5 w-8 h-8 rounded-full bg-white/50 hover:bg-amber-50 border border-transparent hover:border-amber-100 flex items-center justify-center text-muted-foreground hover:text-foreground transition-all"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {submitted ? (
              /* Màn hình thành công */
              <div className="px-8 py-10 text-center space-y-4">
                <div className="flex justify-center">
                  <div className="w-16 h-16 rounded-2xl bg-amber-50 flex items-center justify-center mb-2">
                    <CheckCircle className="h-8 w-8 text-amber-500" />
                  </div>
                </div>
                
                <div className="flex justify-center gap-1">
                  {[1,2,3,4,5].map(i => (
                    <Star key={i} className={`h-6 w-6 ${i <= stars ? 'fill-amber-400 text-amber-400' : 'text-slate-200'}`} />
                  ))}
                </div>

                <div>
                  <h3 className="font-heading text-xl font-bold text-foreground mb-1">Cảm ơn bạn!</h3>
                  <p className="font-paragraph text-sm text-muted-foreground">
                    Đánh giá của bạn giúp xây dựng cộng đồng trao đổi tài liệu tin cậy hơn.
                  </p>
                </div>

                <div className="pt-4">
                  <button
                    onClick={onClose}
                    className="w-full h-12 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 text-white font-heading font-semibold text-sm shadow-btn hover:shadow-[0_8px_20px_rgba(251,191,36,0.3)] hover:-translate-y-0.5 transition-all duration-200"
                  >
                    Đóng
                  </button>
                </div>
              </div>
            ) : (
              /* Màn hình form đánh giá */
              <div className="px-6 py-6 space-y-6">
                
                {/* Tên tài liệu */}
                <div className="px-4 py-3 bg-amber-50/50 border border-amber-100 rounded-2xl flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-100/50 flex items-center justify-center shrink-0">
                    <BookOpen className="h-5 w-5 text-amber-600" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-heading text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Bài đăng</p>
                    <p className="font-heading text-sm font-bold text-foreground truncate">{session.listing_name}</p>
                  </div>
                </div>

                {/* Stars */}
                <div>
                  <label className="font-heading text-xs font-semibold uppercase tracking-widest text-muted-foreground block mb-3 text-center">
                    Chất lượng giao dịch
                  </label>
                  <div className="flex flex-col items-center gap-2">
                    <div className="flex items-center gap-1.5">
                      {[1,2,3,4,5].map(i => (
                        <button key={i}
                          onMouseEnter={() => setHovered(i)}
                          onMouseLeave={() => setHovered(0)}
                          onClick={() => setStars(i)}
                          className="transition-transform hover:scale-110 focus:outline-none p-1"
                        >
                          <Star className={`h-10 w-10 transition-colors ${
                            i <= display ? 'fill-amber-400 text-amber-400' : 'text-slate-200 hover:text-amber-200'
                          }`} />
                        </button>
                      ))}
                    </div>
                    <span className="font-heading text-sm font-bold text-amber-500 h-5">
                      {display > 0 ? STAR_LABELS[display] : ''}
                    </span>
                  </div>
                </div>

                {/* Comment */}
                <div className="space-y-1.5">
                  <label className="font-heading text-xs font-semibold uppercase tracking-widest text-muted-foreground flex justify-between">
                    <span>Nhận xét chi tiết</span>
                    <span className="text-muted-foreground/50 normal-case tracking-normal">Tùy chọn</span>
                  </label>
                  <textarea
                    value={comment}
                    onChange={e => setComment(e.target.value)}
                    maxLength={300}
                    rows={3}
                    placeholder="Chia sẻ trải nghiệm của bạn về người dùng này..."
                    className="w-full rounded-xl border border-amber-100 bg-surface font-paragraph text-sm px-4 py-3 text-foreground focus:outline-none focus:ring-2 focus:ring-amber-500/30 resize-none shadow-sm"
                  />
                  <p className="font-paragraph text-[11px] text-muted-foreground text-right">{comment.length}/300</p>
                </div>

                {/* Error */}
                {error && (
                  <div className="px-4 py-2.5 bg-red-50 border border-red-200 text-red-600 font-paragraph text-xs rounded-xl flex items-center gap-2">
                    <span className="text-red-400">⚠</span>{error}
                  </div>
                )}

                {/* Buttons */}
                <div className="flex gap-3 pt-2">
                  <button
                    onClick={onClose}
                    disabled={isLoading}
                    className="px-5 h-12 rounded-xl border border-amber-200 text-amber-600 font-heading font-semibold text-sm hover:bg-amber-50 transition-colors disabled:opacity-50"
                  >
                    Bỏ qua
                  </button>
                  <button
                    onClick={handleSubmit}
                    disabled={isLoading}
                    className="flex-1 h-12 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 text-white font-heading font-semibold text-sm shadow-btn hover:shadow-[0_8px_20px_rgba(251,191,36,0.3)] hover:-translate-y-0.5 transition-all duration-200 disabled:opacity-60 disabled:translate-y-0 flex items-center justify-center gap-2"
                  >
                    <Send className="h-4 w-4" />
                    {isLoading ? 'Đang gửi...' : 'Gửi đánh giá'}
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}