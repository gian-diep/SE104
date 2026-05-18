import Footer from '@/components/Footer'
import Header from '@/components/Header'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useAuth } from '@/context/AuthContext'
import { AnimatePresence, motion, useScroll, useTransform } from 'framer-motion'
import {
  Search, SlidersHorizontal, PlusCircle, Star, BookOpen,
  Sparkles, GraduationCap, TrendingUp, Zap, Clock, Gift,
  ChevronRight, Layers,
} from 'lucide-react'
import { useEffect, useRef, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { getListings } from '@/lib/ListingApi'
import { buildImageUrl } from '@/lib/Imageapi'

const CATEGORIES = ['Tài liệu photo', 'Tài liệu online', 'Tài liệu viết tay', 'Giáo trình', 'Sách']
const CONDITIONS = ['Mới', 'Như mới', 'Tốt', 'Khá tốt', 'Trung bình']

const UNIVERSITIES = [
  'Đại học Bách Khoa TP.HCM',
  'Đại học Kinh Tế TP.HCM',
  'Đại học Khoa học Tự nhiên',
  'Đại học Công nghệ Thông tin',
  'Đại học Sư phạm TP.HCM',
  'Đại học Luật TP.HCM',
  'Đại học Y Dược TP.HCM',
  'Đại học Nông Lâm TP.HCM',
  'Đại học Mở TP.HCM',
  'Khác',
]

const SUBJECTS = [
  'Giải tích 1', 'Giải tích 2', 'Giải tích 3',
  'Đại số tuyến tính', 'Xác suất thống kê',
  'Vật lý đại cương A1', 'Vật lý đại cương A2',
  'Hóa học đại cương',
  'Triết học Mác-Lênin', 'Kinh tế chính trị Mác-Lênin',
  'Chủ nghĩa xã hội khoa học', 'Lịch sử Đảng Cộng sản Việt Nam',
  'Tư tưởng Hồ Chí Minh',
  'Pháp luật đại cương',
  'Tiếng Anh',
  'Nhập môn lập trình', 'Kỹ thuật lập trình',
  'Lập trình hướng đối tượng', 'Lập trình C', 'Lập trình Java', 'Lập trình Python',
  'Cấu trúc dữ liệu và giải thuật',
  'Cơ sở dữ liệu', 'Hệ quản trị cơ sở dữ liệu',
  'Mạng máy tính', 'An toàn thông tin',
  'Hệ điều hành', 'Kiến trúc máy tính',
  'Công nghệ phần mềm', 'Kiểm thử phần mềm',
  'Trí tuệ nhân tạo', 'Học máy', 'Xử lý ngôn ngữ tự nhiên',
  'Phát triển ứng dụng web', 'Phát triển ứng dụng di động',
  'Điện toán đám mây', 'DevOps',
  'Đồ họa máy tính', 'Thị giác máy tính',
  'Kỹ thuật điện', 'Điện tử cơ bản', 'Điện tử số',
  'Lý thuyết mạch', 'Tín hiệu và hệ thống',
  'Vi điều khiển', 'Nhúng hệ thống',
  'Kỹ thuật cơ khí', 'Sức bền vật liệu', 'Cơ học kỹ thuật',
  'Nhiệt động lực học',
  'Hóa hữu cơ', 'Hóa vô cơ', 'Hóa phân tích', 'Hóa lý',
  'Sinh học đại cương', 'Vi sinh vật học', 'Hóa sinh',
  'Vật lý lý thuyết', 'Cơ học lượng tử',
  'Toán ứng dụng', 'Phương trình vi phân',
  'Kinh tế vi mô', 'Kinh tế vĩ mô',
  'Quản trị học', 'Quản trị doanh nghiệp',
  'Marketing căn bản', 'Marketing quốc tế',
  'Kế toán đại cương', 'Kế toán tài chính', 'Kế toán quản trị',
  'Tài chính doanh nghiệp', 'Đầu tư tài chính',
  'Quản trị nhân lực', 'Hành vi tổ chức',
  'Kinh doanh quốc tế', 'Thương mại điện tử',
  'Thống kê kinh tế', 'Kinh tế lượng',
  'Lý luận nhà nước và pháp luật',
  'Luật hiến pháp', 'Luật hành chính',
  'Luật dân sự', 'Luật hôn nhân và gia đình',
  'Luật hình sự', 'Luật tố tụng hình sự',
  'Luật thương mại', 'Luật lao động',
  'Luật quốc tế', 'Công pháp quốc tế',
  'Tư pháp quốc tế',
  'Giải phẫu học', 'Sinh lý học', 'Mô phôi học',
  'Bệnh học nội khoa', 'Bệnh học ngoại khoa',
  'Dược lý học', 'Dược liệu học', 'Bào chế học',
  'Điều dưỡng cơ bản', 'Chẩn đoán hình ảnh',
  'Tâm lý học giáo dục', 'Giáo dục học',
  'Phương pháp dạy học Toán', 'Phương pháp dạy học Văn',
  'Phương pháp dạy học Lý', 'Phương pháp dạy học Hóa',
  'Phương pháp dạy học tiếng Anh',
  'Sinh thái học', 'Lâm nghiệp đại cương',
  'Khoa học đất', 'Trồng trọt học', 'Chăn nuôi học',
  'Thủy sản đại cương', 'Bảo vệ thực vật',
  'Công nghệ thực phẩm',
  'Khác',
]

const PRICE_OPTIONS = [
  { value: 'all',      label: 'Tất cả mức giá' },
  { value: 'free',     label: 'Miễn phí' },
  { value: 'under50',  label: 'Dưới 50,000đ' },
  { value: 'under100', label: 'Dưới 100,000đ' },
  { value: 'above100', label: 'Trên 100,000đ' },
]

function getInitials(name = '') {
  return name.trim().split(/\s+/).slice(-2).map(w => w[0]?.toUpperCase() || '').join('')
}

function getSellerRating(sellerId) {
  try {
    const users = JSON.parse(localStorage.getItem('bookycle_users') || '[]')
    const user = users.find(u => u.id === sellerId)
    return user?.rating ?? null
  } catch { return null }
}

const AVATAR_COLORS = ['#0D9488', '#14B8A6', '#0F766E', '#F59E0B', '#10B981', '#6366F1']
function avatarColor(name = '') {
  const idx = (String(name).charCodeAt(0) || 0) % AVATAR_COLORS.length
  return AVATAR_COLORS[idx]
}

function getListingImage(listing) {
  try {
    if (!listing?.images || listing.images.length === 0) return null
    const images = Array.isArray(listing.images) ? listing.images : JSON.parse(listing.images)
    if (!Array.isArray(images) || images.length === 0) return null
    return buildImageUrl(images[0])
  } catch { return null }
}

function IllustrationBooks() {
  return (
    <svg viewBox="0 0 120 140" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
      <rect x="20" y="30" width="55" height="75" rx="6" fill="#CCFBF1" stroke="#0D9488" strokeWidth="1.5"/>
      <rect x="20" y="30" width="8" height="75" rx="4" fill="#0D9488"/>
      <line x1="35" y1="50" x2="68" y2="50" stroke="#0D9488" strokeWidth="1.5" strokeLinecap="round" opacity="0.4"/>
      <line x1="35" y1="62" x2="68" y2="62" stroke="#0D9488" strokeWidth="1.5" strokeLinecap="round" opacity="0.3"/>
      <line x1="35" y1="74" x2="55" y2="74" stroke="#0D9488" strokeWidth="1.5" strokeLinecap="round" opacity="0.2"/>
      <rect x="42" y="20" width="55" height="75" rx="6" fill="#F0FDFA" stroke="#14B8A6" strokeWidth="1.5"/>
      <rect x="42" y="20" width="9" height="75" rx="4" fill="#14B8A6"/>
      <line x1="58" y1="42" x2="90" y2="42" stroke="#0D9488" strokeWidth="1.5" strokeLinecap="round" opacity="0.5"/>
      <line x1="58" y1="54" x2="90" y2="54" stroke="#0D9488" strokeWidth="1.5" strokeLinecap="round" opacity="0.4"/>
      <line x1="58" y1="66" x2="90" y2="66" stroke="#0D9488" strokeWidth="1.5" strokeLinecap="round" opacity="0.3"/>
      <line x1="58" y1="78" x2="78" y2="78" stroke="#0D9488" strokeWidth="1.5" strokeLinecap="round" opacity="0.2"/>
      <path d="M85 20 L85 36 L80 32 L75 36 L75 20Z" fill="#F59E0B"/>
      <circle cx="15" cy="18" r="3" fill="#F59E0B" opacity="0.7"/>
      <circle cx="108" cy="105" r="2.5" fill="#14B8A6" opacity="0.6"/>
      <circle cx="100" cy="15" r="2" fill="#F59E0B" opacity="0.5"/>
    </svg>
  )
}

function FeatureChip({ icon: Icon, label, color = 'teal' }) {
  const colors = {
    teal:  'bg-teal-50 text-teal-700 border-teal-200',
    amber: 'bg-amber-50 text-amber-700 border-amber-200',
    green: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  }
  return (
    <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-paragraph font-semibold ${colors[color]}`}>
      <Icon className="h-3.5 w-3.5" />{label}
    </div>
  )
}

function ListingCardCompact({ listing }) {
  const imgUrl = getListingImage(listing)
  const isFree = listing.item_price === 0
  return (
    <Link to={`/listings/${listing.id}`} className="block group flex-shrink-0 w-52">
      <div className="bg-white rounded-2xl border border-teal-100 shadow-card hover:shadow-card-hover hover:-translate-y-1 transition-all duration-300 overflow-hidden">
        <div className="w-full aspect-[3/2] bg-surface relative overflow-hidden">
          {imgUrl ? (
            <img src={imgUrl} alt={listing.item_name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out" />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-teal-50 to-teal-100/50">
              <BookOpen className="w-8 h-8 text-teal-300" />
            </div>
          )}
          <span className={`absolute bottom-2 right-2 font-heading text-[10px] font-bold px-2 py-1 rounded-full shadow-sm ${isFree ? 'bg-emerald-500 text-white' : 'bg-foreground text-white'}`}>
            {isFree ? '🎁 Free' : `${listing.item_price?.toLocaleString('vi-VN')}đ`}
          </span>
        </div>
        <div className="p-3">
          <h3 className="font-heading text-xs font-bold leading-snug text-foreground group-hover:text-primary transition-colors line-clamp-2 mb-1.5">
            {listing.item_name}
          </h3>
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-4 rounded-full flex-shrink-0 flex items-center justify-center font-heading text-[8px] font-bold text-white"
              style={{ backgroundColor: avatarColor(listing.seller_name) }}>
              {getInitials(listing.seller_name)}
            </div>
            <span className="font-paragraph text-[10px] text-muted-foreground truncate">{listing.seller_name || 'Ẩn danh'}</span>
          </div>
        </div>
      </div>
    </Link>
  )
}

function ListingCard({ listing, index }) {
  const imgUrl = getListingImage(listing)
  const isFree = listing.item_price === 0
  return (
    <motion.div layout initial={{ opacity: 0, y: 20, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.96 }} transition={{ duration: 0.35, delay: index * 0.05, ease: [0.25, 1, 0.5, 1] }} className="h-full">
      <Link to={`/listings/${listing.id}`} className="block h-full group">
        <div className="bg-white rounded-2xl border border-teal-100 shadow-card hover:shadow-card-hover hover:-translate-y-1 transition-all duration-300 h-full flex flex-col overflow-hidden">
          <div className="w-full aspect-[4/3] bg-surface relative overflow-hidden">
            {imgUrl ? (
              <img src={imgUrl} alt={listing.item_name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out" />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-teal-50 to-teal-100/50 gap-2">
                <BookOpen className="w-10 h-10 text-teal-300" />
                <span className="font-paragraph text-xs text-teal-400">Không có ảnh</span>
              </div>
            )}
            {listing.category && (
              <span className="absolute top-3 left-3 bg-white/90 backdrop-blur-sm text-primary font-heading text-[10px] font-semibold uppercase tracking-wide px-2.5 py-1 rounded-full border border-teal-100 shadow-sm">
                {listing.category}
              </span>
            )}
            <span className={`absolute bottom-3 right-3 font-heading text-xs font-bold px-3 py-1.5 rounded-full shadow-sm ${
              isFree ? 'bg-emerald-500 text-white' : listing.item_price <= 50000 ? 'bg-accent text-white' : 'bg-foreground text-white'
            }`}>
              {isFree ? '🎁 Miễn phí' : `${listing.item_price?.toLocaleString('vi-VN')}đ`}
            </span>
          </div>
          <div className="p-4 flex flex-col flex-grow">
            <h3 className="font-heading text-sm font-bold leading-snug text-foreground group-hover:text-primary transition-colors line-clamp-2 mb-2">
              {listing.item_name}
            </h3>
            {listing.item_description && (
              <p className="font-paragraph text-xs text-muted-foreground line-clamp-2 mb-3 flex-grow leading-relaxed">{listing.item_description}</p>
            )}
            {(listing.subject || listing.condition) && (
              <div className="flex flex-wrap gap-1.5 mb-3">
                {listing.subject && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-teal-50 text-teal-700 font-paragraph text-[11px] font-medium border border-teal-100">{listing.subject}</span>
                )}
                {listing.condition && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 font-paragraph text-[11px] font-medium border border-amber-100">{listing.condition}</span>
                )}
              </div>
            )}
            <div className="mt-auto pt-3 border-t border-teal-50 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center font-heading text-[10px] font-bold text-white shadow-sm"
                  style={{ backgroundColor: avatarColor(listing.seller_name) }}>
                  {getInitials(listing.seller_name)}
                </div>
                <span className="font-paragraph text-xs text-muted-foreground truncate">{listing.seller_name || 'Ẩn danh'}</span>
              </div>
              {(() => {
                const r = getSellerRating(listing.seller_id)
                return r !== null ? (
                  <div className="flex items-center gap-1 flex-shrink-0 bg-amber-50 px-2 py-0.5 rounded-full">
                    <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                    <span className="font-heading text-[11px] font-bold text-amber-600">{r.toFixed(1)}</span>
                  </div>
                ) : null
              })()}
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  )
}

function HorizontalSection({ title, icon: Icon, items, onViewAll, accentColor = 'teal', emptyText = 'Không có tài liệu' }) {
  const colorMap = {
    teal:    { badge: 'bg-teal-50 text-teal-700 border-teal-200',     icon: 'text-primary',    link: 'text-primary hover:text-primary/80' },
    amber:   { badge: 'bg-amber-50 text-amber-700 border-amber-200',   icon: 'text-amber-500',  link: 'text-amber-600 hover:text-amber-700' },
    emerald: { badge: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: 'text-emerald-500', link: 'text-emerald-600 hover:text-emerald-700' },
  }
  const c = colorMap[accentColor] || colorMap.teal

  return (
    <div className="mb-14">
      <div className="flex items-center justify-between mb-5 px-6 md:px-16 max-w-[120rem] mx-auto">
        <button onClick={onViewAll} className="flex items-center gap-2.5 group cursor-pointer">
          <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-heading font-semibold uppercase tracking-wide ${c.badge}`}>
            <Icon className={`h-3.5 w-3.5 ${c.icon}`} />
            {title}
          </div>
          <ChevronRight className={`h-4 w-4 ${c.link} group-hover:translate-x-1 transition-transform`} />
        </button>
        <button onClick={onViewAll} className={`font-paragraph text-xs font-semibold ${c.link} flex items-center gap-1`}>
          Xem tất cả
        </button>
      </div>

      {items.length === 0 ? (
        <div className="px-6 md:px-16 max-w-[120rem] mx-auto">
          <div className="py-10 flex items-center justify-center border border-dashed border-teal-200 rounded-2xl">
            <p className="font-paragraph text-sm text-muted-foreground">{emptyText}</p>
          </div>
        </div>
      ) : (
        <div className="flex gap-4 overflow-x-auto pb-3 px-6 md:px-16 scroll-smooth" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
          {items.map(listing => <ListingCardCompact key={listing.id} listing={listing} />)}
          <button
            onClick={onViewAll}
            className="flex-shrink-0 w-36 flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-teal-200 hover:border-primary hover:bg-teal-50/50 transition-all group cursor-pointer"
          >
            <div className="w-10 h-10 rounded-full bg-teal-50 flex items-center justify-center group-hover:bg-teal-100 transition-colors">
              <ChevronRight className="w-5 h-5 text-primary" />
            </div>
            <span className="font-paragraph text-xs text-muted-foreground text-center px-2">Xem thêm</span>
          </button>
        </div>
      )}
    </div>
  )
}

export default function HomePage() {
  const { currentUser } = useAuth()
  const [listings, setListings]               = useState([])
  const [isLoading, setIsLoading]             = useState(true)
  const [searchQuery, setSearchQuery]         = useState('')
  const [categoryFilter, setCategoryFilter]   = useState('all')
  const [subjectFilter, setSubjectFilter]     = useState('all')
  const [universityFilter, setUniversityFilter] = useState('all')
  const [conditionFilter, setConditionFilter] = useState('all')
  const [priceFilter, setPriceFilter]         = useState('all')

  const searchSectionRef = useRef(null)

  useEffect(() => {
    async function loadListings() {
      try {
        setIsLoading(true)
        const data = await getListings()
        setListings(data)
      } catch (err) {
        console.error('Load listings failed:', err)
      } finally {
        setIsLoading(false)
      }
    }
    loadListings()
  }, [])

  const approvedListings = listings.filter(l => l.status === 'approved' && l.transaction_status === 'available')

  const applyPriceFilter = useCallback((list, filter) => {
    if (filter === 'all')      return list
    if (filter === 'free')     return list.filter(l => l.item_price === 0)
    if (filter === 'under50')  return list.filter(l => l.item_price > 0 && l.item_price < 50000)
    if (filter === 'under100') return list.filter(l => l.item_price > 0 && l.item_price < 100000)
    if (filter === 'above100') return list.filter(l => l.item_price >= 100000)
    return list
  }, [])

  // ── Filter logic — hỗ trợ option 'Khác' cho trường & môn ─────────────────
  const knownUniversities = UNIVERSITIES.filter(u => u !== 'Khác')
  const knownSubjects     = SUBJECTS.filter(s => s !== 'Khác')

  const filteredListings = applyPriceFilter(
    approvedListings.filter(item => {
      if (searchQuery) {
        const q = searchQuery.toLowerCase()
        if (
          !item.item_name?.toLowerCase().includes(q) &&
          !item.item_description?.toLowerCase().includes(q) &&
          !item.keywords?.toLowerCase().includes(q) &&
          !item.subject?.toLowerCase().includes(q)
        ) return false
      }
      if (categoryFilter !== 'all' && item.category !== categoryFilter) return false
      if (conditionFilter !== 'all' && item.condition !== conditionFilter) return false

      if (universityFilter !== 'all') {
        if (universityFilter === 'Khác') {
          if (knownUniversities.includes(item.university)) return false
        } else {
          if (item.university !== universityFilter) return false
        }
      }

      if (subjectFilter !== 'all') {
        if (subjectFilter === 'Khác') {
          if (knownSubjects.includes(item.subject)) return false
        } else {
          if (item.subject !== subjectFilter) return false
        }
      }

      return true
    }),
    priceFilter
  )

  const recentListings    = [...approvedListings].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 12)
  const freeListings      = approvedListings.filter(l => l.item_price === 0).slice(0, 12)
  const giaoTrinhListings = approvedListings.filter(l => l.category === 'Giáo trình').slice(0, 12)
  const sachListings      = approvedListings.filter(l => l.category === 'Sách').slice(0, 12)
  const onlineListings    = approvedListings.filter(l => l.category === 'Tài liệu online').slice(0, 12)

  const heroRef = useRef(null)
  const { scrollYProgress: heroScroll } = useScroll({ target: heroRef, offset: ['start start', 'end start'] })
  const heroY       = useTransform(heroScroll, [0, 1], ['0%', '30%'])
  const heroOpacity = useTransform(heroScroll, [0, 0.7], [1, 0])

  const resetFilters = () => {
    setSearchQuery(''); setCategoryFilter('all'); setSubjectFilter('all')
    setUniversityFilter('all'); setConditionFilter('all'); setPriceFilter('all')
  }

  const goToSearch = useCallback((priceVal = 'all') => {
    setPriceFilter(priceVal)
    setSearchQuery(''); setCategoryFilter('all'); setSubjectFilter('all')
    setUniversityFilter('all'); setConditionFilter('all')
    searchSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [])

  const approvedCount = approvedListings.length
  const univCount     = Array.from(new Set(listings.filter(l => l.status === 'approved').map(l => l.university).filter(Boolean))).length
  const freeCount     = freeListings.length

  return (
    <div className="min-h-screen bg-background text-foreground overflow-clip">
      <Header />

      {/* HERO */}
      <section ref={heroRef} className="relative w-full min-h-[92vh] flex flex-col justify-between pt-28 pb-10 px-6 md:px-16 max-w-[120rem] mx-auto">
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-20 right-10 w-80 h-80 rounded-full bg-teal-100/50 blur-3xl animate-float-slow" />
          <div className="absolute top-40 left-1/3 w-64 h-64 rounded-full bg-amber-100/30 blur-3xl animate-float-delayed" />
          <div className="absolute bottom-20 left-10 w-96 h-96 rounded-full bg-teal-50/80 blur-3xl animate-float" />
          <div className="absolute inset-0 opacity-30" style={{ backgroundImage: 'radial-gradient(circle, rgba(13,148,136,0.15) 1.5px, transparent 1.5px)', backgroundSize: '32px 32px' }} />
        </div>

        <div className="grid grid-cols-12 gap-6 z-10 relative">
          <div className="col-span-12 lg:col-span-7 xl:col-span-8">
            <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}>
              <div className="flex flex-wrap gap-2 mb-6">
                <FeatureChip icon={Sparkles} label="Miễn phí tham gia" color="teal" />
                <FeatureChip icon={GraduationCap} label="Dành cho sinh viên" color="amber" />
                <FeatureChip icon={TrendingUp} label="Tin cậy & An toàn" color="green" />
              </div>
              <h1 className="font-heading font-black text-[11vw] sm:text-[8vw] lg:text-[7vw] xl:text-[6.5vw] leading-none tracking-tighter text-foreground mb-6">
                Book<span className="gradient-text">ycle</span><span className="text-teal-300">.</span>
              </h1>
              <p className="font-paragraph text-base md:text-lg text-muted-foreground leading-relaxed max-w-xl mb-8">
                Nền tảng trao đổi tài liệu học tập dành cho sinh viên. Mua, bán giáo trình, đề cương và tài liệu một cách minh bạch và dễ dàng.
              </p>
              <div className="flex flex-wrap gap-3">
                <button onClick={() => goToSearch()}
                  className="inline-flex items-center gap-2.5 bg-teal-gradient text-white px-6 py-3 rounded-xl font-heading font-semibold text-sm shadow-btn hover:shadow-card-hover hover:-translate-y-0.5 transition-all duration-200">
                  <Search className="w-4 h-4" />Tìm tài liệu ngay
                </button>
                {currentUser && (
                  <Link to="/dang-ban" className="inline-flex items-center gap-2.5 bg-white text-primary border border-teal-200 px-6 py-3 rounded-xl font-heading font-semibold text-sm shadow-soft hover:shadow-card hover:-translate-y-0.5 transition-all duration-200">
                    <PlusCircle className="w-4 h-4" />Đăng bán
                  </Link>
                )}
              </div>
            </motion.div>
          </div>

          <div className="col-span-12 lg:col-span-5 xl:col-span-4 flex items-center justify-center lg:justify-end mt-8 lg:mt-0">
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
              className="relative w-72 h-72 lg:w-96 lg:h-80">
              <div className="absolute inset-0 bg-white rounded-3xl shadow-card-hover border border-teal-100 flex items-center justify-center animate-float">
                <div className="w-3/4 h-3/4"><IllustrationBooks /></div>
              </div>
              <div className="absolute -top-5 -right-5 bg-white rounded-2xl shadow-card border border-teal-100 px-3 py-2.5 flex items-center gap-2 animate-float-delayed">
                <div className="w-7 h-7 rounded-xl bg-amber-50 flex items-center justify-center">
                  <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                </div>
                <div>
                  <p className="font-heading text-xs font-bold text-foreground">4.9</p>
                  <p className="font-paragraph text-[10px] text-muted-foreground">Đánh giá</p>
                </div>
              </div>
              <div className="absolute -bottom-4 -left-6 bg-white rounded-2xl shadow-card border border-teal-100 px-3 py-2.5 flex items-center gap-2 animate-float-slow">
                <div className="w-7 h-7 rounded-xl bg-teal-50 flex items-center justify-center">
                  <BookOpen className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <p className="font-heading text-xs font-bold text-foreground">{approvedCount || '—'} tài liệu</p>
                  <p className="font-paragraph text-[10px] text-muted-foreground">Đang rao bán</p>
                </div>
              </div>
              <div className="absolute top-1/2 -right-8 bg-emerald-500 rounded-2xl shadow-card px-3 py-2 flex items-center gap-1.5 animate-pulse-soft">
                <Zap className="w-3.5 h-3.5 text-white" />
                <p className="font-heading text-[11px] font-bold text-white">Miễn phí!</p>
              </div>
            </motion.div>
          </div>
        </div>

        {/* STATS BAR */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="grid grid-cols-3 bg-white rounded-2xl border border-teal-100 shadow-card mt-10 z-10 relative overflow-hidden">
          {[
            { icon: BookOpen,      value: approvedCount, label: 'Tài liệu đang rao',  color: 'text-primary',       onClick: () => goToSearch() },
            { icon: GraduationCap, value: univCount,     label: 'Trường đại học',     color: 'text-indigo-500',    onClick: () => goToSearch() },
            { icon: Sparkles,      value: freeCount,     label: 'Tài liệu miễn phí', color: 'text-emerald-500',   onClick: () => goToSearch('free') },
          ].map((stat, i) => {
            const Icon = stat.icon
            return (
              <button key={i} onClick={stat.onClick}
                className={`px-4 md:px-8 py-5 flex flex-col gap-2 text-left hover:bg-teal-50/40 transition-colors ${i < 2 ? 'border-r border-teal-100' : ''}`}>
                <div className={stat.color}><Icon className="w-5 h-5" /></div>
                <span className="font-heading text-2xl md:text-3xl font-black text-foreground leading-none">
                  {stat.value > 0 ? stat.value.toLocaleString('vi-VN') : '—'}
                </span>
                <span className="font-paragraph text-xs text-muted-foreground leading-tight">{stat.label}</span>
              </button>
            )
          })}
        </motion.div>
      </section>

      {/* HORIZONTAL SECTIONS */}
      <div className="py-10">
        <HorizontalSection title="Mới đăng" icon={Clock} items={recentListings} onViewAll={() => goToSearch()} accentColor="teal" emptyText="Chưa có tài liệu mới" />
        <HorizontalSection title="Miễn phí" icon={Gift} items={freeListings} onViewAll={() => goToSearch('free')} accentColor="emerald" emptyText="Chưa có tài liệu miễn phí" />
        {giaoTrinhListings.length > 0 && (
          <HorizontalSection title="Giáo trình" icon={GraduationCap} items={giaoTrinhListings} onViewAll={() => goToSearch()} accentColor="amber" emptyText="Chưa có giáo trình" />
        )}
        {sachListings.length > 0 && (
          <HorizontalSection title="Sách" icon={BookOpen} items={sachListings} onViewAll={() => goToSearch()} accentColor="teal" emptyText="Chưa có sách" />
        )}
        {onlineListings.length > 0 && (
          <HorizontalSection title="Tài liệu Online" icon={Layers} items={onlineListings} onViewAll={() => goToSearch()} accentColor="emerald" emptyText="Chưa có tài liệu online" />
        )}
      </div>

      {/* SEARCH SECTION */}
      <section ref={searchSectionRef} id="search" className="w-full py-20 relative scroll-mt-20">
        <div className="absolute inset-0 bg-gradient-to-b from-background to-teal-50/30 pointer-events-none" />
        <div className="max-w-[120rem] mx-auto px-6 md:px-16 relative z-10">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-12">
            <div>
              <div className="inline-flex items-center gap-2 bg-teal-50 text-primary px-3 py-1.5 rounded-full border border-teal-200 text-xs font-heading font-semibold uppercase tracking-wide mb-4">
                <Search className="w-3.5 h-3.5" />Tìm kiếm
              </div>
              <h2 className="font-heading text-4xl md:text-5xl font-black tracking-tighter text-foreground">TÌM TÀI LIỆU</h2>
            </div>
            <div className="mt-4 md:mt-0 bg-white rounded-xl border border-teal-100 px-4 py-2 shadow-soft">
              <p className="font-paragraph text-sm text-muted-foreground">
                <span className="font-bold text-primary">{filteredListings.length}</span> kết quả phù hợp
              </p>
            </div>
          </div>

          <div className="grid grid-cols-12 gap-8 items-start">
            {/* Filter Sidebar */}
            <div className="col-span-12 lg:col-span-3 lg:sticky lg:top-28">
              <div className="bg-white rounded-2xl border border-teal-100 shadow-card p-5 space-y-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-teal-50 flex items-center justify-center">
                      <SlidersHorizontal className="w-4 h-4 text-primary" />
                    </div>
                    <h4 className="font-heading text-sm font-bold uppercase tracking-wide text-foreground">Bộ lọc</h4>
                  </div>
                  <button onClick={resetFilters} className="font-paragraph text-xs text-muted-foreground hover:text-primary transition-colors">
                    Xóa hết
                  </button>
                </div>

                {/* Từ khóa */}
                <div className="space-y-1.5">
                  <label className="font-heading text-xs font-semibold uppercase tracking-widest text-muted-foreground">Từ khóa</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input type="text" placeholder="Tên, tài liệu, môn học..."
                      value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                      className="pl-10 h-10 rounded-xl border-teal-100 focus-visible:ring-primary font-paragraph bg-surface text-sm" />
                  </div>
                </div>

                {/* Mức giá */}
                <div className="space-y-1.5">
                  <label className="font-heading text-xs font-semibold uppercase tracking-widest text-muted-foreground">Mức giá</label>
                  <Select value={priceFilter} onValueChange={setPriceFilter}>
                    <SelectTrigger className="h-10 rounded-xl border-teal-100 focus:ring-primary font-paragraph bg-surface text-sm">
                      <SelectValue placeholder="Tất cả mức giá" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl border-teal-100 shadow-card">
                      {PRICE_OPTIONS.map(o => (
                        <SelectItem key={o.value} value={o.value} className="rounded-lg">{o.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Môn học, Trường, Tình trạng, Phân loại */}
                {[
                  { label: 'Tên môn học', value: subjectFilter,    onChange: setSubjectFilter,    placeholder: 'Tất cả môn học', options: SUBJECTS },
                  { label: 'Tên trường',  value: universityFilter, onChange: setUniversityFilter, placeholder: 'Tất cả trường',  options: UNIVERSITIES },
                  { label: 'Tình trạng',  value: conditionFilter,  onChange: setConditionFilter,  placeholder: 'Tất cả',         options: CONDITIONS },
                  { label: 'Phân loại',   value: categoryFilter,   onChange: setCategoryFilter,   placeholder: 'Tất cả loại',    options: CATEGORIES },
                ].map(f => (
                  <div key={f.label} className="space-y-1.5">
                    <label className="font-heading text-xs font-semibold uppercase tracking-widest text-muted-foreground">{f.label}</label>
                    <Select value={f.value} onValueChange={f.onChange}>
                      <SelectTrigger className="h-10 rounded-xl border-teal-100 focus:ring-primary font-paragraph bg-surface text-sm">
                        <SelectValue placeholder={f.placeholder} />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl border-teal-100 shadow-card">
                        <SelectItem value="all" className="rounded-lg">{f.placeholder}</SelectItem>
                        {f.options.map(o => (
                          <SelectItem key={o} value={o} className="rounded-lg">{o}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ))}

                {/* Badge filter giá active */}
                {priceFilter !== 'all' && (
                  <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2">
                    <Gift className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                    <span className="font-paragraph text-xs text-emerald-700 font-semibold flex-1">
                      {PRICE_OPTIONS.find(o => o.value === priceFilter)?.label}
                    </span>
                    <button onClick={() => setPriceFilter('all')} className="text-emerald-400 hover:text-emerald-700 transition-colors text-sm leading-none">✕</button>
                  </div>
                )}
              </div>
            </div>

            {/* Listings grid */}
            <div className="col-span-12 lg:col-span-9 min-h-[60vh]">
              {isLoading ? (
                <div className="w-full h-64 flex items-center justify-center">
                  <div className="flex flex-col items-center gap-4">
                    <div className="relative w-14 h-14">
                      <div className="absolute inset-0 rounded-full border-4 border-teal-100" />
                      <div className="absolute inset-0 rounded-full border-4 border-t-primary animate-spin" />
                    </div>
                    <p className="font-heading text-sm font-semibold text-muted-foreground">Đang tải tài liệu...</p>
                  </div>
                </div>
              ) : filteredListings.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
                  <AnimatePresence mode="popLayout">
                    {filteredListings.map((listing, index) => (
                      <ListingCard key={listing.id} listing={listing} index={index} />
                    ))}
                  </AnimatePresence>
                </div>
              ) : (
                <div className="w-full h-64 flex flex-col items-center justify-center bg-white rounded-2xl border border-dashed border-teal-200 gap-3">
                  <div className="w-16 h-16 rounded-2xl bg-teal-50 flex items-center justify-center">
                    <BookOpen className="w-8 h-8 text-teal-300" />
                  </div>
                  <p className="font-heading text-lg font-bold text-muted-foreground">Không có kết quả</p>
                  <p className="font-paragraph text-sm text-muted-foreground">Thử thay đổi bộ lọc tìm kiếm</p>
                  <button onClick={resetFilters}
                    className="mt-2 px-5 py-2 rounded-xl bg-teal-gradient text-white font-heading text-sm font-semibold shadow-btn hover:shadow-card transition-all">
                    Xóa bộ lọc
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* MARQUEE */}
      <section className="w-full overflow-hidden bg-teal-gradient py-4 my-10">
        <div className="flex w-max animate-marquee">
          {[0, 1].map(trackIdx => (
            <div key={trackIdx} className="flex items-center">
              {['Chia sẻ kiến thức', 'Tiết kiệm chi phí', 'Kết nối sinh viên', 'Học tập hiệu quả', 'Trao đổi tài liệu'].map((text, i) => (
                <span key={i} className="inline-flex items-center gap-6 mx-8 font-heading text-sm font-semibold uppercase tracking-[0.15em] text-white whitespace-nowrap">
                  {text}
                  <span className="w-1.5 h-1.5 bg-white/50 rounded-full" />
                </span>
              ))}
            </div>
          ))}
        </div>
      </section>

      <Footer />
    </div>
  )
}