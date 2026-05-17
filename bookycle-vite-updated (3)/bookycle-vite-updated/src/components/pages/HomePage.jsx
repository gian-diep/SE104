import Footer from '@/components/Footer'
import Header from '@/components/Header'
import { Button } from '@/components/ui/button'
import { Image } from '@/components/ui/image'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useAuth } from '@/context/AuthContext'
import { AnimatePresence, motion, useScroll, useTransform } from 'framer-motion'
import { ArrowDown, Search, SlidersHorizontal, PlusCircle, Star, ListIcon } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import logo from '@/logo.png'
import { getListings } from '@/lib/ListingApi'
import { buildImageUrl } from '@/lib/Imageapi' 
const CATEGORIES = ['Tài liệu photo', 'Tài liệu online', 'Tài liệu viết tay', 'Giáo trình', 'Sách']
const CONDITIONS = ['Mới', 'Như mới', 'Tốt', 'Khá tốt', 'Trung bình']


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

const TEAL_SHADES = ['#4DB6AC','#26A69A','#009688','#00897B','#00796B','#00695C','#004D40']
function avatarColor(name = '') {
  const str = String(name)
  const idx = (str.charCodeAt(0) || 0) % TEAL_SHADES.length
  return TEAL_SHADES[idx]
}


function getListingImage(listing) {
  try {
    if (!listing?.images || listing.images.length === 0) return null

    const images = Array.isArray(listing.images)
      ? listing.images
      : JSON.parse(listing.images)

    if (!Array.isArray(images) || images.length === 0) return null

    return buildImageUrl(images[0])
  } catch (err) {
    console.error('Image parse error:', err)
    return null
  }
}

export default function HomePage() {
  const { currentUser } = useAuth()
  const [listings, setListings] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [subjectFilter, setSubjectFilter] = useState('all')
  const [universityFilter, setUniversityFilter] = useState('all')
  const [conditionFilter, setConditionFilter] = useState('all')

  useEffect(() => {
    async function loadListings() {
      try {
        setIsLoading(true)

        const data = await getListings()
        console.log('full listing:', data[0])
        setListings(data)
      } catch (err) {
        console.error("Load listings failed:", err)
      } finally {
        setIsLoading(false)
      }
    }

    loadListings()
  }, [])

  // console.log(listing.images)
  const filteredListings = listings.filter((item) => {
    if (item.status !== 'approved' || item.transaction_status !== 'available') return false
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
    if (subjectFilter !== 'all' && item.subject !== subjectFilter) return false
    if (universityFilter !== 'all' && item.university !== universityFilter) return false
    if (conditionFilter !== 'all' && item.condition !== conditionFilter) return false
    return true
  })

  const allSubjects = Array.from(new Set(listings.map(i => i.subject).filter(Boolean)))
  const allUniversities = Array.from(new Set(listings.map(i => i.university).filter(Boolean)))

  const heroRef = useRef(null)
  const { scrollYProgress: heroScroll } = useScroll({ target: heroRef, offset: ['start start', 'end start'] })
  const heroY = useTransform(heroScroll, [0, 1], ['0%', '40%'])
  const heroOpacity = useTransform(heroScroll, [0, 0.8], [1, 0])

  const resetFilters = () => {
    setSearchQuery(''); setCategoryFilter('all'); setSubjectFilter('all')
    setUniversityFilter('all'); setConditionFilter('all')
  }

  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-primary selection:text-primary-foreground overflow-clip">
      <Header />

      {/* HERO */}
      <section ref={heroRef} className="relative w-full min-h-[95vh] flex flex-col justify-between pt-32 pb-12 px-6 md:px-12 max-w-[120rem] mx-auto">
        <div className="grid grid-cols-12 gap-6 z-10 relative">
          <div className="col-span-12 lg:col-span-9">
            <motion.div
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
              className="flex items-center gap-[2vw]"
            >
              <Image src={logo} alt="BookCycle Logo" className="w-[24vw] h-[24vw] min-w-[120px] min-h-[120px] max-w-[420px] max-h-[420px] object-contain flex-shrink-0"/>
              <h1 className="font-heading text-[12vw] leading-none tracking-tighter uppercase text-foreground m-0 p-0">
                Book<br />ycle.
              </h1>
            </motion.div>
          </div>
          <div className="col-span-12 lg:col-span-3 flex flex-col justify-end pb-4 lg:pb-8">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.8, delay: 0.4 }}>
              <p className="font-paragraph text-lg md:text-xl text-muted-foreground mb-8 leading-relaxed">
                Nền tảng trao đổi tài liệu học tập dành cho sinh viên. Mua, bán các loại giáo trình, đề cương và tài liệu nghiên cứu một cách minh bạch và dễ dàng.
              </p>
              <div className="flex flex-col gap-3">
                <a href="#search" className="group inline-flex items-center gap-4 text-primary font-heading uppercase tracking-widest text-sm hover:text-foreground transition-colors duration-300">
                  <span>Tìm kiếm tài liệu</span>
                  <span className="w-8 h-8 border border-primary group-hover:border-foreground rounded-full flex items-center justify-center transition-colors duration-300">
                    <ArrowDown className="w-4 h-4" />
                  </span>
                </a>
                {currentUser && (
                  <Link to="/dang-ban" className="group inline-flex items-center gap-4 text-muted-foreground font-heading uppercase tracking-widest text-sm hover:text-primary transition-colors duration-300">
                    <PlusCircle className="w-4 h-4" />
                    <span>Đăng bán tài liệu</span>
                  </Link>
                )}
              </div>
            </motion.div>
          </div>
        </div>

        {/* STATS BAR */}
        <motion.div
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.65, ease: [0.16, 1, 0.3, 1] }}
          className="grid grid-cols-3 border border-secondary mt-10 z-10 relative"
        >
          {[
            {
              value: listings.filter(l => l.status === 'approved' && l.transaction_status== 'available').length,
              label: 'Tài liệu đang rao',
              suffix: '',
            },
            {
              value: Array.from(new Set(listings.filter(l => l.status === 'approved').map(l => l.university).filter(Boolean))).length,
              label: 'Trường đại học',
              suffix: '',
            },
            {
              value: listings.filter(l => l.status === 'approved' && l.item_price === 0).length,
              label: 'Tài liệu miễn phí',
              suffix: '',
            },
          ].map((stat, i) => (
            <div key={i} className={`px-6 py-5 flex flex-col gap-1 ${i < 2 ? 'border-r border-secondary' : ''}`}>
              <span className="font-heading text-3xl md:text-4xl tracking-tighter text-foreground leading-none">
                {stat.value > 0 ? stat.value.toLocaleString('vi-VN') : '—'}
              </span>
              <span className="font-paragraph text-xs text-muted-foreground uppercase tracking-widest">
                {stat.label}
              </span>
            </div>
          ))}
        </motion.div>

        <div className="w-full h-[45vh] md:h-[55vh] mt-8 overflow-hidden relative border border-secondary">
          <motion.div style={{ y: heroY, opacity: heroOpacity }} className="absolute inset-[-10%] w-[120%] h-[120%]">
            <Image src="https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=1920&q=80" alt="Tài liệu học tập" className="w-full h-full object-cover grayscale hover:grayscale-0 transition-all duration-1000 ease-out" />
          </motion.div>
          <div className="absolute inset-0 pointer-events-none grid grid-cols-12 gap-6 px-6 md:px-12 opacity-20">
            {Array.from({ length: 12 }).map((_, i) => <div key={i} className="h-full border-l border-background/50" />)}
          </div>
        </div>
      </section>

      {/* SEARCH */}
      <section id="search" className="w-full py-24 border-t border-secondary relative">
        <div className="max-w-[120rem] mx-auto px-6 md:px-12">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-16 pb-8 border-b border-secondary">
            <div>
              <h2 className="font-heading text-sm uppercase tracking-widest text-muted-foreground mb-4">[ 01. Search ]</h2>
              <h3 className="font-heading text-5xl md:text-6xl uppercase tracking-tighter">Tìm kiếm</h3>
            </div>
            <div className="mt-8 md:mt-0 text-right">
              <p className="font-paragraph text-muted-foreground">Hiển thị {filteredListings.length} kết quả phù hợp</p>
            </div>
          </div>

          <div className="grid grid-cols-12 gap-8 lg:gap-12 items-start">
            {/* Filter Sidebar */}
            <div className="col-span-12 lg:col-span-3 lg:sticky lg:top-32 space-y-6">
              <div className="flex items-center gap-3 mb-2">
                <SlidersHorizontal className="w-5 h-5 text-primary" />
                <h4 className="font-heading text-xl uppercase tracking-wide">Bộ lọc</h4>
              </div>

              {/* Search */}
              <div className="space-y-2">
                <label className="font-heading text-xs uppercase tracking-widest text-muted-foreground">Từ khóa</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input type="text" placeholder="Tên tài liệu, môn học..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 h-12 rounded-none border-secondary focus-visible:ring-primary font-paragraph bg-transparent" />
                </div>
              </div>

              {/* Subject */}
              <div className="space-y-2">
                <label className="font-heading text-xs uppercase tracking-widest text-muted-foreground">Tên môn học</label>
                <Select value={subjectFilter} onValueChange={setSubjectFilter}>
                  <SelectTrigger className="h-12 rounded-none border-secondary focus:ring-primary font-paragraph bg-transparent">
                    <SelectValue placeholder="Tất cả môn học" />
                  </SelectTrigger>
                  <SelectContent className="rounded-none border-secondary">
                    <SelectItem value="all" className="rounded-none">Tất cả môn học</SelectItem>
                    {allSubjects.map(s => <SelectItem key={s} value={s} className="rounded-none">{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              {/* University */}
              <div className="space-y-2">
                <label className="font-heading text-xs uppercase tracking-widest text-muted-foreground">Tên trường</label>
                <Select value={universityFilter} onValueChange={setUniversityFilter}>
                  <SelectTrigger className="h-12 rounded-none border-secondary focus:ring-primary font-paragraph bg-transparent">
                    <SelectValue placeholder="Tất cả trường" />
                  </SelectTrigger>
                  <SelectContent className="rounded-none border-secondary">
                    <SelectItem value="all" className="rounded-none">Tất cả trường</SelectItem>
                    {allUniversities.map(u => <SelectItem key={u} value={u} className="rounded-none">{u}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              {/* Condition */}
              <div className="space-y-2">
                <label className="font-heading text-xs uppercase tracking-widest text-muted-foreground">Tình trạng</label>
                <Select value={conditionFilter} onValueChange={setConditionFilter}>
                  <SelectTrigger className="h-12 rounded-none border-secondary focus:ring-primary font-paragraph bg-transparent">
                    <SelectValue placeholder="Tất cả tình trạng" />
                  </SelectTrigger>
                  <SelectContent className="rounded-none border-secondary">
                    <SelectItem value="all" className="rounded-none">Tất cả tình trạng</SelectItem>
                    {CONDITIONS.map(c => <SelectItem key={c} value={c} className="rounded-none">{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              {/* Category */}
              <div className="space-y-2">
                <label className="font-heading text-xs uppercase tracking-widest text-muted-foreground">Phân loại</label>
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger className="h-12 rounded-none border-secondary focus:ring-primary font-paragraph bg-transparent">
                    <SelectValue placeholder="Tất cả loại" />
                  </SelectTrigger>
                  <SelectContent className="rounded-none border-secondary">
                    <SelectItem value="all" className="rounded-none">Tất cả loại</SelectItem>
                    {CATEGORIES.map(c => <SelectItem key={c} value={c} className="rounded-none">{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <Button variant="outline" onClick={resetFilters}
                className="w-full rounded-none border-secondary hover:border-primary hover:text-primary uppercase font-heading tracking-widest text-xs h-10">
                Xóa bộ lọc
              </Button>
            </div>

            {/* Listings */}
            <div className="col-span-12 lg:col-span-9 min-h-[60vh]">
              {isLoading ? (
                <div className="w-full h-full flex items-center justify-center">
                  <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-2 border-secondary border-t-primary rounded-full animate-spin" />
                    <p className="font-heading uppercase tracking-widest text-sm text-muted-foreground">Đang tải...</p>
                  </div>
                </div>
              ) : filteredListings.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                  <AnimatePresence mode="popLayout">
                    {filteredListings.map((listing, index) => (
                      <motion.div key={listing.id} layout initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ duration: 0.4, delay: index * 0.04 }} className="h-full">
                        <Link to={`/listings/${listing.id}`} className="block h-full group">
                          <div className="bg-background border border-secondary hover:border-primary transition-colors duration-300 h-full flex flex-col">
                            {/* Image */}
                            <div className="w-full aspect-[4/3] bg-muted relative overflow-hidden border-b border-secondary">
                              {getListingImage(listing)? (
                                <Image src={getListingImage(listing)} alt={listing.item_name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center bg-secondary/20">
                                  <span className="font-heading text-xs uppercase tracking-widest text-muted-foreground">Không có ảnh</span>
                                </div>
                              )}
                              {listing.category && (
                                <span className="absolute top-3 left-3 bg-primary text-primary-foreground font-heading text-[10px] uppercase tracking-widest px-2 py-1">
                                  {listing.category}
                                </span>
                              )}
                              {/* Price badge — overlay bottom-right */}
                              <span className={`absolute bottom-3 right-3 font-heading text-[11px] tracking-widest px-2.5 py-1 ${
                                listing.item_price === 0
                                  ? 'bg-primary text-primary-foreground'
                                  : listing.item_price <= 50000
                                  ? 'bg-amber-500 text-white'
                                  : 'bg-foreground text-background'
                              }`}>
                                {listing.item_price === 0 ? 'Miễn phí' : `${listing.item_price?.toLocaleString('vi-VN')}đ`}
                              </span>
                            </div>

                            {/* Body */}
                            <div className="p-5 flex flex-col flex-grow">
                              <h3 className="font-heading text-base uppercase leading-snug text-foreground group-hover:text-primary transition-colors line-clamp-2 mb-2">
                                {listing.item_name}
                              </h3>
                              {listing.item_description && (
                                <p className="font-paragraph text-sm text-muted-foreground line-clamp-2 mb-4 flex-grow">{listing.item_description}</p>
                              )}

                              {/* Tags */}
                              {(listing.subject || listing.condition) && (
                                <div className="flex flex-wrap gap-1.5 mb-4">
                                  {listing.subject && <span className="font-paragraph text-xs text-muted-foreground bg-muted px-2 py-1">{listing.subject}</span>}
                                  {listing.condition && <span className="font-paragraph text-xs text-muted-foreground bg-muted px-2 py-1">{listing.condition}</span>}
                                </div>
                              )}

                              {/* Seller row */}
                              <div className="mt-auto pt-3 border-t border-secondary/50 flex items-center justify-between gap-3">
                                <div className="flex items-center gap-2 min-w-0">
                                  {/* Avatar */}
                                  <div
                                    className="w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center font-heading text-[10px] text-white"
                                    style={{ backgroundColor: avatarColor(listing.seller_name) }}
                                  >
                                    {getInitials(listing.seller_name)}
                                  </div>
                                  <span className="font-paragraph text-xs text-muted-foreground truncate">
                                    {listing.seller_name || 'Ẩn danh'}
                                  </span>
                                </div>

                                {/* Rating */}
                                {(() => {
                                  const r = getSellerRating(listing.seller_id)
                                  return r !== null ? (
                                    <div className="flex items-center gap-1 flex-shrink-0">
                                      <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                                      <span className="font-heading text-xs text-amber-600">{r.toFixed(1)}</span>
                                    </div>
                                  ) : null
                                })()}
                              </div>
                            </div>
                          </div>
                        </Link>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              ) : (
                <div className="w-full h-[40vh] flex flex-col items-center justify-center border border-dashed border-secondary">
                  <p className="font-heading text-2xl uppercase text-muted-foreground mb-2">Không có kết quả</p>
                  <p className="font-paragraph text-sm text-muted-foreground mb-6">Thử thay đổi bộ lọc tìm kiếm</p>
                  <Button variant="outline" onClick={resetFilters}
                    className="rounded-none border-secondary hover:border-primary hover:text-primary uppercase font-heading tracking-widest text-xs">
                    Xóa bộ lọc
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* TICKER */}
      <section className="w-full border-y border-secondary overflow-hidden bg-primary text-primary-foreground py-4">
        <div className="flex whitespace-nowrap animate-[marquee_20s_linear_infinite]">
          {Array.from({ length: 10 }).map((_, i) => (
            <span key={i} className="font-heading text-sm uppercase tracking-[0.2em] mx-8 flex items-center gap-8">
              <span>Chia sẻ kiến thức</span>
              <span className="w-1.5 h-1.5 bg-primary-foreground rounded-full" />
              <span>Tiết kiệm chi phí</span>
              <span className="w-1.5 h-1.5 bg-primary-foreground rounded-full" />
              <span>Kết nối sinh viên</span>
              <span className="w-1.5 h-1.5 bg-primary-foreground rounded-full" />
            </span>
          ))}
        </div>
      </section>

      <Footer />
      <style>{`@keyframes marquee { 0% { transform: translateX(0%); } 100% { transform: translateX(-50%); } }`}</style>
    </div>
  )
}