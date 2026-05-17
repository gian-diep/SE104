/**
 * frontend/src/components/pages/CreateListingPage.jsx
 *
 * Thay đổi chính:
 * 1. Ảnh từ máy → upload lên /images/upload trước → lấy image_id
 * 2. Ảnh URL ngoài → vẫn lưu nguyên URL
 * 3. Gửi createListing với images: [image_id | external_url]
 * 4. Preview dùng buildImageUrl để hiển thị đúng
 */

import { useState, useRef } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { ArrowLeft, Upload, Clock, X, ImagePlus, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import { useAuth } from '@/context/AuthContext'
import { createListing } from '@/lib/Listingapi'
import { uploadImage, buildImageUrl } from '@/lib/Imageapi'   // ← THÊM

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
  'Trường khác',
]

export default function CreateListingPage() {
  const { currentUser } = useAuth()
  const navigate = useNavigate()
  const [success, setSuccess] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')

  const [form, setForm] = useState({
    itemName: '',
    itemPrice: '',
    /**
     * images: Array of {
     *   imageId: string,   // image_id trả về từ server, hoặc URL ngoài
     *   preview: string,   // URL để preview (blob URL hoặc URL ngoài)
     *   uploading: boolean // đang upload hay không
     * }
     */
    images: [],
    itemDescription: '',
    category: '',
    condition: '',
    subject: '',
    university: currentUser?.university || '',
    keywords: '',
  })
  const [imageUrl, setImageUrl] = useState('')
  const fileInputRef = useRef(null)

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="max-w-[100rem] mx-auto px-6 md:px-[80px] py-[120px] text-center">
          <h2 className="font-heading text-3xl uppercase mb-6">Bạn chưa đăng nhập</h2>
          <p className="font-paragraph text-muted-foreground mb-8">Chỉ người dùng đã đăng nhập mới có thể đăng bán tài liệu.</p>
          <Link to="/"><Button className="rounded-none bg-primary text-primary-foreground font-heading uppercase tracking-widest"><ArrowLeft className="mr-2 h-4 w-4" />Về trang chủ</Button></Link>
        </div>
        <Footer />
      </div>
    )
  }

  const set = (field) => (e) => setForm(prev => ({ ...prev, [field]: e.target.value }))

  // ── Image helpers ──────────────────────────────────────────────────────────

  /** Thêm ảnh URL ngoài (không upload lên server) */
  const addImageUrl = () => {
    const url = imageUrl.trim()
    if (!url) return
    if (form.images.length >= 5) { setError('Tối đa 5 ảnh'); return }
    if (form.images.some(img => img.imageId === url)) { setError('Ảnh này đã được thêm'); return }
    setForm(prev => ({
      ...prev,
      images: [...prev.images, { imageId: url, preview: url, uploading: false }],
    }))
    setImageUrl('')
    setError('')
  }
  /** Upload ảnh từ máy lên backend → lưu image_id */
  const addImageFile = async (e) => {
    const files = Array.from(e.target.files || [])
    const remaining = 5 - form.images.length
    const toAdd = files.slice(0, remaining)
    e.target.value = ''

    if (files.length > remaining) {
      setError(`Chỉ thêm được ${remaining} ảnh nữa (tối đa 5)`)
    }

    // Placeholder uploading
    const placeholders = toAdd.map(file => ({
      imageId: null,
      preview: URL.createObjectURL(file),
      uploading: true,
      _file: file,
    }))

    setForm(prev => ({
      ...prev,
      images: [...prev.images, ...placeholders].slice(0, 5),
    }))

    // Upload từng file
    for (const placeholder of placeholders) {
      try {
        const { image_id } = await uploadImage(placeholder._file)
        setForm(prev => ({
          ...prev,
          images: prev.images.map(img =>
            img === placeholder
              ? { imageId: image_id, preview: buildImageUrl(image_id), uploading: false }
              : img
          ),
        }))
      } catch (err) {
        setError(`Upload ảnh thất bại: ${err.message}`)
        // Xóa placeholder lỗi
        setForm(prev => ({
          ...prev,
          images: prev.images.filter(img => img !== placeholder),
        }))
      }
    }
  }

  const removeImage = (idx) => {
    setForm(prev => ({ ...prev, images: prev.images.filter((_, i) => i !== idx) }))
  }

  // ── Submit ────────────────────────────────────────────────────────────────

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (!form.itemName.trim())    { setError('Vui lòng nhập tên tài liệu'); return }
    if (!form.category)           { setError('Vui lòng chọn phân loại'); return }
    if (!form.condition)          { setError('Vui lòng chọn tình trạng'); return }
    if (form.images.length === 0) { setError('Vui lòng tải lên ít nhất 1 hình ảnh'); return }
    if (form.images.some(img => img.uploading)) {
      setError('Vui lòng chờ ảnh upload xong'); return
    }

    setIsSubmitting(true)
    try {
      await createListing(currentUser.id, {
        item_name:        form.itemName.trim(),
        item_price:       form.itemPrice === '' ? 0 : parseFloat(form.itemPrice) || 0,
        item_description: form.itemDescription.trim() || null,
        category:         form.category,
        condition:        form.condition,
        subject:          form.subject.trim() || null,
        university:       form.university || null,
        keywords:         form.keywords.trim() || null,
        images:           form.images.map(img => img.imageId),  // ← chỉ gửi image_id
      })
      setSuccess(true)
    } catch (err) {
      setError(err.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  // ── Success screen ─────────────────────────────────────────────────────────

  if (success) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="max-w-[100rem] mx-auto px-6 md:px-[80px] py-[120px] text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 border-2 border-amber-500 mb-8">
            <Clock className="h-10 w-10 text-amber-500" />
          </div>
          <h2 className="font-heading text-4xl uppercase mb-4">Gửi bài thành công!</h2>
          <p className="font-paragraph text-muted-foreground mb-3 max-w-lg mx-auto">
            Bài đăng của bạn đã được gửi và đang <span className="text-amber-500 font-semibold">chờ Admin kiểm duyệt</span>.
          </p>
          <p className="font-paragraph text-sm text-muted-foreground/60 mb-10 max-w-lg mx-auto">
            Sau khi được duyệt, tài liệu sẽ tự động hiển thị công khai trên trang chủ.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/tai-khoan">
              <Button className="rounded-none bg-primary text-primary-foreground font-heading uppercase tracking-widest">
                Xem bài đăng của tôi
              </Button>
            </Link>
            <Button variant="outline"
              onClick={() => {
                setSuccess(false)
                setForm({ itemName: '', itemPrice: '', images: [], itemDescription: '', category: '', condition: '', subject: '', university: currentUser?.university || '', keywords: '' })
                setImageUrl('')
              }}
              className="rounded-none border-secondary hover:border-primary hover:text-primary font-heading uppercase tracking-widest">
              Đăng bài khác
            </Button>
          </div>
        </div>
        <Footer />
      </div>
    )
  }

  // ── Form ──────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="max-w-[80rem] mx-auto px-6 md:px-[80px] py-[60px]">
        <div className="mb-10">
          <Link to="/"><Button variant="outline" className="border-secondary text-foreground hover:border-primary hover:text-primary rounded-none font-paragraph"><ArrowLeft className="mr-2 h-4 w-4" />Quay về</Button></Link>
        </div>

        <div className="mb-12 pb-8 border-b border-secondary">
          <h2 className="font-heading text-sm uppercase tracking-widest text-muted-foreground mb-3">[ Đăng bán ]</h2>
          <h1 className="font-heading text-5xl md:text-6xl uppercase tracking-tighter">Đăng tài liệu</h1>
          <div className="mt-6 flex items-start gap-3 px-4 py-3 bg-amber-500/10 border border-amber-500/30 max-w-xl">
            <Clock className="h-4 w-4 text-amber-500 flex-shrink-0 mt-0.5" />
            <p className="font-paragraph text-sm text-amber-700">
              Bài đăng sẽ được Admin kiểm duyệt trước khi hiển thị công khai.
            </p>
          </div>
        </div>

        {error && (
          <div className="mb-6 px-4 py-3 bg-red-500/10 border border-red-500/30 text-red-500 font-paragraph text-sm">{error}</div>
        )}

        <form onSubmit={handleSubmit} className="grid grid-cols-12 gap-8">
          <div className="col-span-12 lg:col-span-8 space-y-6">

            <div className="space-y-2">
              <label className="font-heading text-xs uppercase tracking-widest text-muted-foreground">Tên tài liệu <span className="text-red-500">*</span></label>
              <Input value={form.itemName} onChange={set('itemName')} placeholder="VD: Giáo trình Giải tích 1 - Bách Khoa" required
                className="h-12 rounded-none border-secondary focus-visible:ring-primary font-paragraph bg-transparent" />
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="font-heading text-xs uppercase tracking-widest text-muted-foreground">Phân loại <span className="text-red-500">*</span></label>
                <select value={form.category} onChange={set('category')} required
                  className="w-full h-12 rounded-none border border-secondary bg-transparent font-paragraph text-sm px-3 text-foreground focus:outline-none focus:ring-1 focus:ring-primary">
                  <option value="">-- Chọn phân loại --</option>
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <label className="font-heading text-xs uppercase tracking-widest text-muted-foreground">Tình trạng <span className="text-red-500">*</span></label>
                <select value={form.condition} onChange={set('condition')} required
                  className="w-full h-12 rounded-none border border-secondary bg-transparent font-paragraph text-sm px-3 text-foreground focus:outline-none focus:ring-1 focus:ring-primary">
                  <option value="">-- Chọn tình trạng --</option>
                  {CONDITIONS.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="font-heading text-xs uppercase tracking-widest text-muted-foreground">Tên môn học</label>
                <Input value={form.subject} onChange={set('subject')} placeholder="VD: Giải tích, Lập trình C++"
                  className="h-12 rounded-none border-secondary focus-visible:ring-primary font-paragraph bg-transparent" />
              </div>
              <div className="space-y-2">
                <label className="font-heading text-xs uppercase tracking-widest text-muted-foreground">Giá (VNĐ)</label>
                <Input type="number" min="0" value={form.itemPrice} onChange={set('itemPrice')} placeholder="0 = Miễn phí"
                  className="h-12 rounded-none border-secondary focus-visible:ring-primary font-paragraph bg-transparent" />
              </div>
            </div>

            <div className="space-y-2">
              <label className="font-heading text-xs uppercase tracking-widest text-muted-foreground">Trường đại học</label>
              <select value={form.university} onChange={set('university')}
                className="w-full h-12 rounded-none border border-secondary bg-transparent font-paragraph text-sm px-3 text-foreground focus:outline-none focus:ring-1 focus:ring-primary">
                <option value="">-- Chọn trường --</option>
                {UNIVERSITIES.map(u => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>

            <div className="space-y-2">
              <label className="font-heading text-xs uppercase tracking-widest text-muted-foreground">Mô tả chi tiết</label>
              <textarea value={form.itemDescription} onChange={set('itemDescription')} rows={5}
                placeholder="Mô tả tình trạng sách, nội dung, lý do bán..."
                className="w-full rounded-none border border-secondary bg-transparent font-paragraph text-sm px-3 py-3 text-foreground focus:outline-none focus:ring-1 focus:ring-primary resize-none" />
            </div>

            {/* ── Image upload ─────────────────────────────────────────────── */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="font-heading text-xs uppercase tracking-widest text-muted-foreground">
                  Hình ảnh tài liệu <span className="text-red-500">*</span>
                </label>
                <span className={`font-paragraph text-xs ${form.images.length === 0 ? 'text-red-400' : 'text-muted-foreground'}`}>
                  {form.images.length}/5 ảnh{form.images.length === 0 ? ' (bắt buộc)' : ''}
                </span>
              </div>

              {form.images.length > 0 && (
                <div className="flex flex-wrap gap-3">
                  {form.images.map((img, idx) => (
                    <div key={idx} className="relative w-24 h-24 border border-secondary overflow-hidden group">
                      {img.uploading ? (
                        <div className="w-full h-full flex items-center justify-center bg-muted">
                          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                        </div>
                      ) : (
                        <img src={img.preview} alt={`Ảnh ${idx + 1}`}
                          className="w-full h-full object-cover"
                          onError={e => e.target.style.display = 'none'} />
                      )}
                      {idx === 0 && !img.uploading && (
                        <span className="absolute bottom-0 left-0 right-0 text-center bg-primary/80 text-primary-foreground font-heading text-[9px] uppercase tracking-widest py-0.5">
                          Ảnh bìa
                        </span>
                      )}
                      <button type="button" onClick={() => removeImage(idx)}
                        className="absolute top-1 right-1 w-5 h-5 bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500">
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                  {form.images.length < 5 && (
                    <button type="button" onClick={() => fileInputRef.current?.click()}
                      className="w-24 h-24 border border-dashed border-secondary flex flex-col items-center justify-center gap-1 text-muted-foreground hover:border-primary hover:text-primary transition-colors">
                      <ImagePlus className="h-5 w-5" />
                      <span className="font-heading text-[9px] uppercase tracking-widest">Thêm</span>
                    </button>
                  )}
                </div>
              )}

              {form.images.length < 5 && (
                <div className="space-y-2">
                  <div>
                    <input ref={fileInputRef} type="file" accept="image/*" multiple
                      className="hidden" onChange={addImageFile} />
                    <button type="button" onClick={() => fileInputRef.current?.click()}
                      className="flex items-center gap-2 px-4 h-10 border border-secondary font-heading text-xs uppercase tracking-widest text-muted-foreground hover:border-primary hover:text-primary transition-colors">
                      <Upload className="h-4 w-4" />Tải ảnh từ máy
                    </button>
                  </div>
                  <div className="flex gap-2">
                    <Input value={imageUrl} onChange={e => setImageUrl(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addImageUrl() } }}
                      placeholder="Hoặc dán URL ảnh rồi nhấn Thêm..."
                      className="h-10 rounded-none border-secondary focus-visible:ring-primary font-paragraph bg-transparent text-sm" />
                    <button type="button" onClick={addImageUrl}
                      className="px-4 h-10 border border-secondary font-heading text-xs uppercase tracking-widest text-muted-foreground hover:border-primary hover:text-primary transition-colors whitespace-nowrap">
                      Thêm
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <label className="font-heading text-xs uppercase tracking-widest text-muted-foreground">Từ khóa</label>
              <Input value={form.keywords} onChange={set('keywords')} placeholder="VD: giải tích toán vi tích phân"
                className="h-12 rounded-none border-secondary focus-visible:ring-primary font-paragraph bg-transparent" />
              <p className="font-paragraph text-xs text-muted-foreground">Các từ khóa giúp người khác tìm kiếm dễ hơn</p>
            </div>

            <Button type="submit" disabled={isSubmitting || form.images.some(img => img.uploading)}
              className="w-full h-14 rounded-none bg-primary text-primary-foreground hover:bg-primary/90 font-heading uppercase tracking-widest text-sm">
              {isSubmitting ? 'Đang gửi...' : 'Gửi bài đăng'}
            </Button>
          </div>

          <div className="col-span-12 lg:col-span-4">
            <div className="sticky top-32 border border-secondary p-6 space-y-4">
              <h3 className="font-heading text-sm uppercase tracking-widest text-muted-foreground">Quy trình đăng bài</h3>
              <ul className="space-y-4 font-paragraph text-sm text-muted-foreground">
                {['Điền đầy đủ các trường thông tin bắt buộc và nhấn "Gửi bài đăng".',
                  'Bài đăng vào hàng chờ duyệt để Admin kiểm duyệt nội dung.',
                  'Sau khi được duyệt, bài hiển thị công khai trên trang chủ.',
                  'Nếu bị từ chối, bạn sẽ nhận được lý do và có thể chỉnh sửa lại.',
                ].map((text, i) => (
                  <li key={i} className="flex gap-3 items-start">
                    <span className="w-6 h-6 flex-shrink-0 flex items-center justify-center border border-secondary text-muted-foreground font-heading text-xs">{i + 1}</span>
                    <span>{text}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </form>
      </div>
      <Footer />
    </div>
  )
}