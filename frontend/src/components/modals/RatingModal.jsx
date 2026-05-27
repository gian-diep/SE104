import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Star, Send } from 'lucide-react'
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

  if (!isOpen || !session || !currentUser) return null

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
      <div className="fixed inset-0 z-[200] flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          onClick={onClose}
        />

        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
          className="relative z-10 w-full max-w-md mx-4 bg-background border border-secondary shadow-2xl"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-5 border-b border-secondary">
            <div>
              <p className="font-heading text-xs uppercase tracking-widest text-muted-foreground mb-0.5">[ Đánh giá giao dịch ]</p>
              <h2 className="font-heading text-xl uppercase">Đánh giá {ratedName}</h2>
            </div>
            <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
              <X className="h-5 w-5" />
            </button>
          </div>

          {submitted ? (
            <div className="px-6 py-12 text-center">
              <div className="flex justify-center gap-1 mb-6">
                {[1,2,3,4,5].map(i => (
                  <Star key={i} className={`h-8 w-8 ${i <= stars ? 'fill-amber-400 text-amber-400' : 'text-secondary'}`} />
                ))}
              </div>
              <h3 className="font-heading text-2xl uppercase mb-3">Cảm ơn bạn!</h3>
              <p className="font-paragraph text-sm text-muted-foreground mb-8">
                Đánh giá của bạn giúp xây dựng cộng đồng trao đổi tài liệu tin cậy hơn.
              </p>
              <Button onClick={onClose} className="rounded-none bg-primary text-primary-foreground font-heading uppercase tracking-widest">
                Đóng
              </Button>
            </div>
          ) : (
            <div className="px-6 py-6 space-y-6">
              {/* Tên tài liệu */}
              <div className="px-4 py-3 bg-secondary/20 border border-secondary">
                <p className="font-paragraph text-xs text-muted-foreground mb-0.5">Giao dịch</p>
                <p className="font-heading text-sm uppercase">{session.listing_name}</p>
              </div>

              {/* Stars */}
              <div>
                <label className="font-heading text-xs uppercase tracking-widest text-muted-foreground block mb-4">
                  Số sao *
                </label>
                <div className="flex items-center gap-2">
                  {[1,2,3,4,5].map(i => (
                    <button key={i}
                      onMouseEnter={() => setHovered(i)}
                      onMouseLeave={() => setHovered(0)}
                      onClick={() => setStars(i)}
                      className="transition-transform hover:scale-110 focus:outline-none"
                    >
                      <Star className={`h-10 w-10 transition-colors ${
                        i <= display ? 'fill-amber-400 text-amber-400' : 'text-secondary hover:text-amber-300'
                      }`} />
                    </button>
                  ))}
                  {display > 0 && (
                    <span className="font-heading text-sm uppercase tracking-widest text-amber-500 ml-2">
                      {STAR_LABELS[display]}
                    </span>
                  )}
                </div>
              </div>

              {/* Comment */}
              <div>
                <label className="font-heading text-xs uppercase tracking-widest text-muted-foreground block mb-2">
                  Nhận xét <span className="text-muted-foreground/50">(không bắt buộc, tối đa 300 ký tự)</span>
                </label>
                <textarea
                  value={comment}
                  onChange={e => { if (e.target.value.length <= 300) setComment(e.target.value) }}
                  rows={3}
                  placeholder="Mô tả trải nghiệm giao dịch của bạn..."
                  className="w-full border border-secondary bg-transparent font-paragraph text-sm px-3 py-2.5 resize-none focus:outline-none focus:ring-1 focus:ring-primary text-foreground"
                />
                <p className="font-paragraph text-xs text-muted-foreground text-right mt-1">{comment.length}/300</p>
              </div>

              {error && <p className="font-paragraph text-sm text-red-500">{error}</p>}

              <div className="flex gap-3 pt-2">
                <Button
                  onClick={handleSubmit}
                  disabled={isLoading}
                  className="flex-1 rounded-none bg-primary text-primary-foreground hover:bg-primary/90 font-heading uppercase tracking-widest h-12"
                >
                  <Send className="h-4 w-4 mr-2" />{isLoading ? 'Đang gửi...' : 'Gửi đánh giá'}
                </Button>
                <Button onClick={onClose} variant="outline"
                  className="rounded-none border-secondary hover:border-foreground font-heading uppercase tracking-widest h-12 px-5">
                  Bỏ qua
                </Button>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
