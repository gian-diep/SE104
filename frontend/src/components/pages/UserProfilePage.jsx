import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import { API_URL } from '@/lib/Api'
import { getUserProfile, getUserRatings } from '@/lib/Userapi'
import { getListingsBySeller } from '@/lib/Listingapi'
import {
  Star, User, GraduationCap, BookOpen, Package,
  ArrowLeft, MessageCircle, CheckCircle, XCircle, MessageSquare, X,
} from 'lucide-react'

function get_avatar_url(avatar_url) {
  if (!avatar_url) return null
  if (avatar_url.startsWith('http') || avatar_url.startsWith('data:')) return avatar_url
  return `${API_URL}/avatars/${avatar_url}`
}

function get_image_url(image_id) {
  if (!image_id) return null
  if (image_id.startsWith('http')) return image_id
  return `${API_URL}/images/${image_id}`
}

function fmt_price(p) {
  return p === 0 ? 'Miễn phí' : `${Number(p).toLocaleString('vi-VN')}đ`
}

const AVATAR_COLORS = ['#0D9488', '#14B8A6', '#0F766E', '#F59E0B', '#10B981', '#6366F1']
function avatarColor(name = '') {
  return AVATAR_COLORS[(String(name).charCodeAt(0) || 0) % AVATAR_COLORS.length]
}
function getInitials(name = '') {
  return name.trim().split(/\s+/).slice(-2).map(w => w[0]?.toUpperCase() || '').join('')
}

function StarRating({ rating, count, onClick }) {
  return (
    <div className="flex items-center gap-1.5">
      <div className="flex items-center">
        {[1, 2, 3, 4, 5].map(s => (
          <Star key={s} className={`h-4 w-4 ${s <= Math.round(rating) ? 'text-amber-400 fill-amber-400' : 'text-muted-foreground/20'}`} />
        ))}
      </div>
      <button
        onClick={onClick}
        className="font-paragraph text-sm text-muted-foreground hover:text-primary hover:underline transition-colors"
      >
        {rating > 0 ? `${rating.toFixed(1)} (${count} đánh giá)` : 'Chưa có đánh giá'}
      </button>
    </div>
  )
}

function ListingBadge({ status }) {
  const badge_map = {
    available:   { label: 'Còn hàng', cls: 'text-emerald-600 bg-emerald-50 border-emerald-200', Icon: CheckCircle },
    negotiating: { label: 'Đang TL',  cls: 'text-blue-600 bg-blue-50 border-blue-200',         Icon: MessageCircle },
    sold:        { label: 'Đã bán',   cls: 'text-muted-foreground bg-surface border-border',   Icon: XCircle },
  }
  const { label, cls, Icon } = badge_map[status] ?? badge_map.available
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full border font-heading text-[10px] font-semibold uppercase tracking-wide ${cls}`}>
      <Icon className="h-3 w-3" />{label}
    </span>
  )
}

function SkeletonProfile() {
  return (
    <div className="animate-pulse space-y-6">
      <div className="bg-white rounded-3xl border border-teal-100 p-6">
        <div className="flex items-start gap-5">
          <div className="w-20 h-20 rounded-full bg-teal-100/50 flex-shrink-0" />
          <div className="flex-1 space-y-3 pt-2">
            <div className="h-5 bg-teal-100/50 rounded-xl w-1/3" />
            <div className="h-3 bg-teal-100/30 rounded-xl w-1/4" />
            <div className="h-3 bg-teal-100/30 rounded-xl w-1/5" />
          </div>
        </div>
      </div>
      <div className="space-y-3">
        {[1, 2, 3].map(i => (
          <div key={i} className="bg-white rounded-2xl border border-teal-100 p-5 h-24" />
        ))}
      </div>
    </div>
  )
}

function PublicListingCard({ listing }) {
  const thumb_url = listing.images?.[0] ? get_image_url(listing.images[0]) : null

  return (
    <Link
      to={`/listings/${listing.id}`}
      className="group flex bg-white rounded-2xl border border-teal-100 shadow-soft hover:shadow-card hover:-translate-y-0.5 transition-all duration-300 overflow-hidden"
    >
      {thumb_url ? (
        <div className="w-28 flex-shrink-0 hidden sm:block overflow-hidden bg-surface">
          <img
            src={thumb_url}
            alt={listing.item_name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            onError={e => e.target.style.display = 'none'}
          />
        </div>
      ) : (
        <div className="w-28 flex-shrink-0 hidden sm:flex items-center justify-center bg-surface">
          <BookOpen className="h-8 w-8 text-teal-200" />
        </div>
      )}
      <div className="flex-1 p-4 flex flex-col gap-2">
        <div className="flex items-start justify-between gap-3">
          <h3 className="font-heading text-sm font-bold leading-tight line-clamp-2 group-hover:text-primary transition-colors text-foreground">
            {listing.item_name}
          </h3>
          <ListingBadge status={listing.transaction_status ?? 'available'} />
        </div>
        <div className="flex flex-wrap gap-2 text-xs font-paragraph text-muted-foreground">
          {listing.subject && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-teal-50 text-teal-700 border border-teal-100">
              <BookOpen className="h-3 w-3" />{listing.subject}
            </span>
          )}
          {listing.condition && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 border border-amber-100">
              {listing.condition}
            </span>
          )}
        </div>
        <p className={`font-heading text-base font-black mt-auto ${listing.item_price === 0 ? 'text-emerald-500' : 'text-primary'}`}>
          {fmt_price(listing.item_price)}
        </p>
      </div>
    </Link>
  )
}

// ── Ratings Modal ─────────────────────────────────────────────────────────────
function RatingsModal({ userId, onClose }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getUserRatings(userId)
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [userId])

  return (
    <>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal wrapper */}
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
          {/* Header */}
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

          {/* Body */}
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4 bg-background">
            {loading && (
              <div className="py-12 flex flex-col items-center gap-3">
                <div className="relative w-8 h-8">
                  <div className="absolute inset-0 rounded-full border-4 border-teal-100" />
                  <div className="absolute inset-0 rounded-full border-4 border-t-primary animate-spin" />
                </div>

                <p className="font-paragraph text-sm text-muted-foreground">
                  Đang tải...
                </p>
              </div>
            )}

            {!loading &&
              (!data?.ratings || data.ratings.length === 0) && (
                <div className="py-12 text-center">
                  <Star className="h-10 w-10 text-teal-100 mx-auto mb-3" />
                  <p className="font-heading text-sm font-bold text-muted-foreground">
                    Chưa có đánh giá nào
                  </p>
                </div>
              )}

            {!loading &&
              data?.ratings?.map(r => {
                const listingImage = r.listing_image
                  ? get_image_url(r.listing_image)
                  : null

                return (
                  <div
                    key={r.id}
                    className="bg-white rounded-2xl border border-teal-100 shadow-soft p-4"
                  >
                    <div className="flex items-start gap-3">
                      {/* Avatar */}
                      <div className="w-9 h-9 rounded-full flex-shrink-0 overflow-hidden bg-teal-50 flex items-center justify-center font-heading text-sm font-black text-primary">
                        {r.rater_avatar ? (
                          <img
                            src={get_avatar_url(r.rater_avatar)}
                            alt={r.rater_name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          getInitials(r.rater_name)
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <span className="font-heading text-sm font-bold text-foreground truncate">
                            {r.rater_name}
                          </span>

                          <span className="font-paragraph text-xs text-muted-foreground flex-shrink-0">
                            {new Date(r.created_at).toLocaleDateString('vi-VN')}
                          </span>
                        </div>

                        {/* Stars */}
                        <div className="flex items-center gap-0.5 mb-3">
                          {[1, 2, 3, 4, 5].map(s => (
                            <Star
                              key={s}
                              className={`h-3.5 w-3.5 ${
                                s <= r.stars
                                  ? 'text-amber-400 fill-amber-400'
                                  : 'text-muted-foreground/20'
                              }`}
                            />
                          ))}
                        </div>

                        {/* Listing */}
                        {r.listing_name && (
                          <Link
                            to={`/listings/${r.listing_id}`}
                            className="mb-3 block"
                          >
                            <div className="rounded-xl border border-teal-100 bg-teal-50/50 p-2.5 hover:border-primary transition-colors">
                              <div className="flex items-center gap-3">
                                {listingImage && (
                                  <img
                                    src={listingImage}
                                    alt="listing"
                                    className="w-14 h-14 rounded-lg object-cover border border-teal-100 flex-shrink-0"
                                  />
                                )}

                                <div className="min-w-0">
                                  <p className="font-heading text-xs uppercase tracking-wide text-primary mb-0.5">
                                    Đánh giá cho bài đăng
                                  </p>

                                  <p className="font-heading text-sm font-bold text-foreground truncate">
                                    {r.listing_name}
                                  </p>
                                </div>
                              </div>
                            </div>
                          </Link>
                        )}

                        {/* Comment */}
                        {r.comment && (
                          <p className="font-paragraph text-sm text-foreground leading-relaxed">
                            {r.comment}
                          </p>
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

// ══════════════════════════════════════════════════════════════════════════════
export default function UserProfilePage() {
  const { id: user_id } = useParams()
  const navigate = useNavigate()

  const [profile_data, set_profile_data]   = useState(null)
  const [user_listings, set_user_listings] = useState([])
  const [is_loading, set_is_loading]       = useState(true)
  const [load_error, set_load_error]       = useState('')
  const [user_ratings, set_user_ratings]   = useState([])
  const [showRatings, setShowRatings]       = useState(false)

  useEffect(() => {
    if (!user_id) return
    async function load_profile() {
      set_is_loading(true)
      set_load_error('')

      try {
        const [user_data, listings_data, ratings_data] = await Promise.all([
          getUserProfile(user_id),
          getListingsBySeller(user_id),
          getUserRatings(user_id),
        ])

        set_profile_data(user_data)

        // Thứ tự hiển thị:
        // còn hàng -> đang thương lượng -> đã bán
        const status_order = {
          available: 0,
          negotiating: 1,
          sold: 2,
        }

        const sorted_listings = (listings_data ?? [])
          // chỉ hiện bài đã được admin duyệt
          .filter(listing => listing.status === 'approved')
          // sort theo transaction_status
          .sort((a, b) => {
            const a_order =
              status_order[a.transaction_status ?? 'available'] ?? 99

            const b_order =
              status_order[b.transaction_status ?? 'available'] ?? 99

            return a_order - b_order
          })

        set_user_listings(sorted_listings)
        set_user_ratings(ratings_data?.ratings ?? [])

      } catch (err) {
        set_load_error(err.message || 'Không thể tải hồ sơ người dùng.')
      } finally {
        set_is_loading(false)
      }
    }
    load_profile()
  }, [user_id])

  const avatar_src = profile_data ? get_avatar_url(profile_data.avatar_url) : null
  const active_listing_count = user_listings.filter(l => (l.transaction_status ?? 'available') !== 'sold').length

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <Header />

      <main className="flex-1 max-w-4xl mx-auto w-full px-6 md:px-12 py-10">
        {/* Back */}
        <div className="mb-8">
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-2 font-paragraph text-sm text-muted-foreground hover:text-primary transition-colors bg-white border border-teal-100 px-4 py-2 rounded-xl shadow-soft hover:shadow-card"
          >
            <ArrowLeft className="h-4 w-4" />Quay lại
          </button>
        </div>

        {is_loading ? (
          <SkeletonProfile />
        ) : load_error ? (
          <div className="py-24 flex flex-col items-center justify-center bg-white rounded-3xl border border-dashed border-teal-200 text-center gap-3">
            <div className="w-16 h-16 rounded-2xl bg-teal-50 flex items-center justify-center">
              <User className="h-8 w-8 text-teal-300" />
            </div>
            <p className="font-heading text-lg font-bold text-muted-foreground">Không tìm thấy người dùng</p>
            <p className="font-paragraph text-sm text-muted-foreground">{load_error}</p>
          </div>
        ) : profile_data ? (
          <>
            {/* Profile card */}
            <div className="bg-white rounded-3xl border border-teal-100 shadow-card overflow-hidden mb-8">
              {/* Top gradient banner */}
              <div className="h-24 bg-teal-gradient relative">
                <div className="absolute inset-0 opacity-20"
                  style={{ backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.4) 1px, transparent 1px)', backgroundSize: '18px 18px' }}
                />
              </div>
              <div className="px-6 md:px-8 pb-6">
                <div className="flex flex-col sm:flex-row items-start gap-5 -mt-12 relative z-20">
                  {/* Avatar */}
                  <div className="flex-shrink-0 relative z-20">
                    {avatar_src ? (
                      <img
                        src={avatar_src}
                        alt={profile_data.username}
                        className="w-20 h-20 rounded-full object-cover border-4 border-white shadow-card"
                        onError={e => { e.target.style.display = 'none'; e.target.nextSibling?.style.removeProperty('display') }}
                      />
                    ) : null}
                    <div
                      className={`w-20 h-20 rounded-full border-4 border-white shadow-card flex items-center justify-center font-heading text-2xl font-black text-white ${avatar_src ? 'hidden' : ''}`}
                      style={{ backgroundColor: avatarColor(profile_data.username) }}
                    >
                      {getInitials(profile_data.username)}
                    </div>
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0 pt-0 sm:pt-6">
                    <h1 className="font-heading text-3xl md:text-4xl font-black tracking-tight text-white drop-shadow-md -mt-10 sm:-mt-10 mb-8 relative z-20">
                      {profile_data.username}
                    </h1>
                    {profile_data.university && (
                      <div className="flex items-center gap-1.5 text-sm font-paragraph text-muted-foreground mb-3">
                        <GraduationCap className="h-4 w-4 flex-shrink-0 text-primary" />
                        {profile_data.university}
                      </div>
                    )}
                    {/* ✅ Use profile_data (not currentUser), wire onClick */}
                    <StarRating
                      rating={profile_data.rating ?? 0}
                      count={profile_data.rating_count ?? 0}
                      onClick={() => setShowRatings(true)}
                    />
                  </div>
                </div>

                {/* Stats */}
                <div className="flex flex-wrap gap-4 mt-5 pt-5 border-t border-teal-50">
                  <div className="flex items-center gap-2 bg-surface px-4 py-2 rounded-xl border border-teal-100">
                    <Package className="h-4 w-4 text-primary" />
                    <span className="font-heading text-sm font-bold text-foreground">{user_listings.length}</span>
                    <span className="font-paragraph text-sm text-muted-foreground">bài đăng</span>
                  </div>
                  <div className="flex items-center gap-2 bg-emerald-50 px-4 py-2 rounded-xl border border-emerald-100">
                    <CheckCircle className="h-4 w-4 text-emerald-500" />
                    <span className="font-heading text-sm font-bold text-emerald-600">{active_listing_count}</span>
                    <span className="font-paragraph text-sm text-muted-foreground">còn hàng</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Listings */}
            <div>
              <div className="flex items-center justify-between mb-5">
                <div className="inline-flex items-center gap-2 bg-teal-50 text-primary px-3 py-1.5 rounded-full border border-teal-200 text-xs font-heading font-semibold uppercase tracking-wide">
                  <BookOpen className="w-3.5 h-3.5" />
                  Bài đăng của {profile_data.username}
                </div>
                <span className="font-heading text-xs text-muted-foreground bg-white border border-teal-100 px-3 py-1.5 rounded-full shadow-soft">
                  {user_listings.length} bài
                </span>
              </div>

              {user_listings.length === 0 ? (
                <div className="py-20 flex flex-col items-center justify-center bg-white rounded-2xl border border-dashed border-teal-200 text-center gap-3">
                  <div className="w-16 h-16 rounded-2xl bg-teal-50 flex items-center justify-center">
                    <BookOpen className="h-8 w-8 text-teal-300" />
                  </div>
                  <p className="font-heading text-base font-bold text-muted-foreground">Chưa có bài đăng nào</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {user_listings.map(listing => (
                    <PublicListingCard key={listing.id} listing={listing} />
                  ))}
                </div>
              )}
            </div>

          </>
        ) : null}
      </main>

      <Footer />

      {/* ✅ Ratings modal */}
      <AnimatePresence>
        {showRatings && (
          <RatingsModal userId={user_id} onClose={() => setShowRatings(false)} />
        )}
      </AnimatePresence>
    </div>
  )
}