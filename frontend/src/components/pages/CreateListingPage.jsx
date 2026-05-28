import { useState, useRef } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { ArrowLeft, Upload, Clock, X, ImagePlus, Loader2, PlusCircle, CheckCircle, BookOpen } from 'lucide-react'
import { Input } from '@/components/ui/input'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import { useAuth } from '@/context/AuthContext'
import { createListing } from '@/lib/Listingapi.js'
import { uploadImage, buildImageUrl } from '@/lib/Imageapi.js'

const CATEGORIES = ['Tài liệu photo', 'Tài liệu online', 'Tài liệu viết tay', 'Giáo trình', 'Sách']
const CONDITIONS = ['Mới', 'Như mới', 'Tốt', 'Khá tốt', 'Trung bình']
const UNIVERSITIES = [
  'Đại học Bách Khoa TP.HCM', 'Đại học Kinh Tế TP.HCM',
  'Đại học Khoa học Tự nhiên', 'Đại học Công nghệ Thông tin',
  'Đại học Sư phạm TP.HCM', 'Đại học Luật TP.HCM',
  'Đại học Y Dược TP.HCM', 'Đại học Nông Lâm TP.HCM',
  'Đại học Mở TP.HCM', 'Trường khác',
]

const SUBJECTS = [
  'An toàn thông tin',
  'Bài chế học',
  'Bảo vệ thực vật',
  'Bệnh học ngoại khoa',
  'Bệnh học nội khoa',
  'Chăn nuôi học',
  'Chẩn đoán hình ảnh',
  'Chủ nghĩa xã hội khoa học',
  'Cơ học kỹ thuật',
  'Cơ học lượng tử',
  'Cơ sở dữ liệu',
  'Công nghệ phần mềm',
  'Công nghệ thực phẩm',
  'Công pháp quốc tế',
  'Cấu trúc dữ liệu và giải thuật',
  'DevOps',
  'Dược liệu học',
  'Dược lý học',
  'Đại số tuyến tính',
  'Điều dưỡng cơ bản',
  'Điện tử cơ bản',
  'Điện tử số',
  'Điện toán đám mây',
  'Đầu tư tài chính',
  'Đồ họa máy tính',
  'Giải phẫu học',
  'Giải tích 1',
  'Giải tích 2',
  'Giải tích 3',
  'Giáo dục học',
  'Hành vi tổ chức',
  'Hệ điều hành',
  'Hệ quản trị cơ sở dữ liệu',
  'Hóa học đại cương',
  'Hóa hữu cơ',
  'Hóa lý',
  'Hóa phân tích',
  'Hóa sinh',
  'Hóa vô cơ',
  'Học máy',
  'Kế toán đại cương',
  'Kế toán tài chính',
  'Kế toán quản trị',
  'Khoa học đất',
  'Kinh doanh quốc tế',
  'Kinh tế chính trị Mác-Lênin',
  'Kinh tế lượng',
  'Kinh tế vĩ mô',
  'Kinh tế vi mô',
  'Kiểm thử phần mềm',
  'Kiến trúc máy tính',
  'Kỹ thuật cơ khí',
  'Kỹ thuật điện',
  'Kỹ thuật lập trình',
  'Lâm nghiệp đại cương',
  'Lập trình C',
  'Lập trình hướng đối tượng',
  'Lập trình Java',
  'Lập trình Python',
  'Lịch sử Đảng Cộng sản Việt Nam',
  'Lý luận nhà nước và pháp luật',
  'Lý thuyết mạch',
  'Luật dân sự',
  'Luật hành chính',
  'Luật hiến pháp',
  'Luật hình sự',
  'Luật hôn nhân và gia đình',
  'Luật lao động',
  'Luật quốc tế',
  'Luật thương mại',
  'Luật tố tụng hình sự',
  'Marketing căn bản',
  'Marketing quốc tế',
  'Mạng máy tính',
  'Mô phôi học',
  'Nhập môn lập trình',
  'Nhúng hệ thống',
  'Nhiệt động lực học',
  'Pháp luật đại cương',
  'Phát triển ứng dụng di động',
  'Phát triển ứng dụng web',
  'Phương pháp dạy học Hóa',
  'Phương pháp dạy học Lý',
  'Phương pháp dạy học tiếng Anh',
  'Phương pháp dạy học Toán',
  'Phương pháp dạy học Văn',
  'Phương trình vi phân',
  'Quản trị doanh nghiệp',
  'Quản trị học',
  'Quản trị nhân lực',
  'Sinh học đại cương',
  'Sinh lý học',
  'Sinh thái học',
  'Sức bền vật liệu',
  'Thị giác máy tính',
  'Thống kê kinh tế',
  'Thương mại điện tử',
  'Thủy sản đại cương',
  'Tiếng Anh',
  'Tài chính doanh nghiệp',
  'Tâm lý học giáo dục',
  'Tín hiệu và hệ thống',
  'Toán ứng dụng',
  'Triết học Mác-Lênin',
  'Trí tuệ nhân tạo',
  'Trồng trọt học',
  'Tư pháp quốc tế',
  'Tư tưởng Hồ Chí Minh',
  'Vi điều khiển',
  'Vi sinh vật học',
  'Vật lý đại cương A1',
  'Vật lý đại cương A2',
  'Vật lý lý thuyết',
  'Xác suất thống kê',
  'Xử lý ngôn ngữ tự nhiên',
  'Khác',
]

function FormLabel({ children, required }) {
  return (
    <label className="font-heading text-xs font-semibold uppercase tracking-widest text-muted-foreground flex items-center gap-1">
      {children}
      {required && <span className="text-red-400">*</span>}
    </label>
  )
}

function SelectField({ value, onChange, options, placeholder, required }) {
  const sentinel = options[options.length - 1]
  const CUSTOM_SENTINELS = ['Khác', 'Trường khác']
  const supportsCustom = CUSTOM_SENTINELS.includes(sentinel)

  // customMode: true khi đang nhập tay, false khi chọn từ list
  const [customMode, setCustomMode] = useState(false)

  // Nếu value từ bên ngoài không nằm trong list → vào custom mode (khi load lại bài đã lưu)
  const isCustom = supportsCustom && (customMode || (value !== '' && !options.includes(value)))

  const handleSelectChange = (e) => {
    if (supportsCustom && e.target.value === sentinel) {
      setCustomMode(true)
      onChange({ target: { value: '' } })
    } else {
      setCustomMode(false)
      onChange(e)
    }
  }

  const handleCustomInput = (e) => {
    onChange(e)
  }

  return (
    <div className="space-y-2">
      <select
        value={isCustom ? sentinel : value}
        onChange={handleSelectChange}
        required={required && !isCustom}
        className="w-full h-11 rounded-xl border border-teal-100 bg-surface font-paragraph text-sm px-3 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
      >
        <option value="">{placeholder}</option>
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
      {isCustom && (
        <input
          type="text"
          value={value}
          onChange={handleCustomInput}
          required={required}
          placeholder={`Nhập ${sentinel === 'Trường khác' ? 'tên trường' : 'tên môn học'}...`}
          autoFocus
          className="w-full h-11 rounded-xl border border-teal-100 bg-surface font-paragraph text-sm px-3 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
        />
      )}
    </div>
  )
}

export default function CreateListingPage() {
  const { currentUser } = useAuth()
  const navigate = useNavigate()
  const [success, setSuccess] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')

  const [form, setForm] = useState({
    itemName: '',
    itemPrice: '',
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
        <div className="max-w-[100rem] mx-auto px-6 md:px-16 py-32 text-center">
          <div className="w-20 h-20 rounded-3xl bg-teal-50 flex items-center justify-center mx-auto mb-6">
            <BookOpen className="w-10 h-10 text-teal-300" />
          </div>
          <h2 className="font-heading text-2xl font-bold mb-3 text-foreground">Bạn chưa đăng nhập</h2>
          <p className="font-paragraph text-muted-foreground mb-8">Chỉ người dùng đã đăng nhập mới có thể đăng bán tài liệu.</p>
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

  const set = (field) => (e) => setForm(prev => ({ ...prev, [field]: e.target.value }))

  const addImageUrl = () => {
    const url = imageUrl.trim()
    if (!url) return
    if (form.images.length >= 5) { setError('Tối đa 5 ảnh'); return }
    if (form.images.some(img => img.imageId === url)) { setError('Ảnh này đã được thêm'); return }
    setForm(prev => ({ ...prev, images: [...prev.images, { imageId: url, preview: url, uploading: false }] }))
    setImageUrl(''); setError('')
  }

  const addImageFile = async (e) => {
    const files = Array.from(e.target.files || [])
    const remaining = 5 - form.images.length
    const toAdd = files.slice(0, remaining)
    e.target.value = ''
    if (files.length > remaining) setError(`Chỉ thêm được ${remaining} ảnh nữa (tối đa 5)`)

    const placeholders = toAdd.map(file => ({
      imageId: null, preview: URL.createObjectURL(file), uploading: true, _file: file,
    }))
    setForm(prev => ({ ...prev, images: [...prev.images, ...placeholders].slice(0, 5) }))

    for (const placeholder of placeholders) {
      try {
        const { image_id } = await uploadImage(placeholder._file)
        setForm(prev => ({
          ...prev,
          images: prev.images.map(img =>
            img === placeholder ? { imageId: image_id, preview: buildImageUrl(image_id), uploading: false } : img
          ),
        }))
      } catch (err) {
        setError(`Upload ảnh thất bại: ${err.message}`)
        setForm(prev => ({ ...prev, images: prev.images.filter(img => img !== placeholder) }))
      }
    }
  }

  const removeImage = (idx) => setForm(prev => ({ ...prev, images: prev.images.filter((_, i) => i !== idx) }))

  const handleSubmit = async (e) => {
    e.preventDefault(); setError('')
    if (!form.itemName.trim())    { setError('Vui lòng nhập tên tài liệu'); return }
    if (!form.category)           { setError('Vui lòng chọn phân loại'); return }
    if (!form.condition)          { setError('Vui lòng chọn tình trạng'); return }
    if (form.images.length === 0) { setError('Vui lòng tải lên ít nhất 1 hình ảnh'); return }
    if (form.images.some(img => img.uploading)) { setError('Vui lòng chờ ảnh upload xong'); return }

    setIsSubmitting(true)
    try {
      await createListing(currentUser.id, {
        item_name:        form.itemName.trim(),
        item_price:       form.itemPrice === '' ? 0 : parseFloat(form.itemPrice) || 0,
        item_description: form.itemDescription.trim() || null,
        category:         form.category,
        condition:        form.condition,
        subject:          form.subject || null,
        university:       form.university || null,
        keywords:         form.keywords.trim() || null,
        images:           form.images.map(img => img.imageId),
      })
      setSuccess(true)
    } catch (err) {
      setError(err.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="max-w-[100rem] mx-auto px-6 md:px-16 py-32 text-center">
          <div className="w-24 h-24 rounded-3xl bg-amber-50 border-2 border-amber-200 flex items-center justify-center mx-auto mb-6 shadow-card">
            <Clock className="h-12 w-12 text-amber-500" />
          </div>
          <h2 className="font-heading text-3xl font-black tracking-tight text-foreground mb-3">Gửi bài thành công!</h2>
          <p className="font-paragraph text-muted-foreground mb-2 max-w-lg mx-auto">
            Bài đăng đang <span className="text-amber-500 font-semibold">chờ Admin kiểm duyệt</span>.
          </p>
          <p className="font-paragraph text-sm text-muted-foreground/60 mb-10 max-w-lg mx-auto">
            Sau khi được duyệt, tài liệu sẽ tự động hiển thị công khai trên trang chủ.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link to="/tai-khoan">
              <button className="inline-flex items-center gap-2 bg-teal-gradient text-white px-6 py-3 rounded-xl font-heading font-semibold text-sm shadow-btn hover:shadow-card-hover hover:-translate-y-0.5 transition-all">
                <BookOpen className="w-4 h-4" />Xem bài đăng của tôi
              </button>
            </Link>
            <button
              onClick={() => {
                setSuccess(false)
                setForm({ itemName: '', itemPrice: '', images: [], itemDescription: '', category: '', condition: '', subject: '', university: currentUser?.university || '', keywords: '' })
                setImageUrl('')
              }}
              className="inline-flex items-center gap-2 bg-white border border-teal-200 text-primary px-6 py-3 rounded-xl font-heading font-semibold text-sm shadow-soft hover:shadow-card hover:-translate-y-0.5 transition-all"
            >
              <PlusCircle className="w-4 h-4" />Đăng bài khác
            </button>
          </div>
        </div>
        <Footer />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="max-w-[80rem] mx-auto px-6 md:px-16 py-10">
        <div className="mb-8">
          <Link to="/">
            <button className="inline-flex items-center gap-2 font-paragraph text-sm text-muted-foreground hover:text-primary transition-colors bg-white border border-teal-100 px-4 py-2 rounded-xl shadow-soft hover:shadow-card">
              <ArrowLeft className="h-4 w-4" />Quay về
            </button>
          </Link>
        </div>

        <div className="mb-10">
          <div className="inline-flex items-center gap-2 bg-teal-50 text-primary px-3 py-1.5 rounded-full border border-teal-200 text-xs font-heading font-semibold uppercase tracking-wide mb-3">
            <PlusCircle className="w-3.5 h-3.5" />
            Đăng bán
          </div>
          <h1 className="font-heading text-4xl md:text-5xl font-black tracking-tighter text-foreground mb-4">ĐĂNG TÀI LIỆU</h1>
          <div className="flex items-start gap-3 px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl max-w-xl">
            <Clock className="h-4 w-4 text-amber-500 flex-shrink-0 mt-0.5" />
            <p className="font-paragraph text-sm text-amber-700">
              Bài đăng sẽ được Admin kiểm duyệt trước khi hiển thị công khai.
            </p>
          </div>
        </div>

        {error && (
          <div className="mb-6 px-4 py-3 bg-red-50 border border-red-200 text-red-600 font-paragraph text-sm rounded-xl flex items-center gap-2">
            <span className="text-red-400">⚠</span>{error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="grid grid-cols-12 gap-8">
          {/* Main form */}
          <div className="col-span-12 lg:col-span-8 space-y-5">

            <div className="bg-white rounded-2xl border border-teal-100 shadow-soft p-6 space-y-5">
              <h3 className="font-heading text-sm font-bold uppercase tracking-wide text-foreground border-b border-teal-50 pb-3">Thông tin cơ bản</h3>

              <div className="space-y-1.5">
                <FormLabel required>Tên tài liệu</FormLabel>
                <Input value={form.itemName} onChange={set('itemName')} placeholder="VD: Giáo trình Giải tích 1 - Bách Khoa" required
                  className="h-11 rounded-xl border-teal-100 focus-visible:ring-primary font-paragraph bg-surface text-sm" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <FormLabel required>Phân loại</FormLabel>
                  <SelectField value={form.category} onChange={set('category')} options={CATEGORIES} placeholder="-- Chọn loại --" required />
                </div>
                <div className="space-y-1.5">
                  <FormLabel required>Tình trạng</FormLabel>
                  <SelectField value={form.condition} onChange={set('condition')} options={CONDITIONS} placeholder="-- Tình trạng --" required />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <FormLabel>Môn học</FormLabel>
                  <SelectField value={form.subject} onChange={set('subject')} options={SUBJECTS} placeholder="-- Chọn tên môn học --" customLabel="Khác" />
                </div>
                <div className="space-y-1.5">
                  <FormLabel>Giá (VNĐ)</FormLabel>
                  <Input type="number" min="0" value={form.itemPrice} onChange={set('itemPrice')} placeholder="0 = Miễn phí"
                    className="h-11 rounded-xl border-teal-100 focus-visible:ring-primary font-paragraph bg-surface text-sm" />
                </div>
              </div>

              <div className="space-y-1.5">
                <FormLabel>Trường đại học</FormLabel>
                <SelectField value={form.university} onChange={set('university')} options={UNIVERSITIES} placeholder="-- Chọn trường --" customLabel="Trường khác" />
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-teal-100 shadow-soft p-6 space-y-5">
              <h3 className="font-heading text-sm font-bold uppercase tracking-wide text-foreground border-b border-teal-50 pb-3">Mô tả & Hình ảnh</h3>

              <div className="space-y-1.5">
                <FormLabel>Mô tả chi tiết</FormLabel>
                <textarea value={form.itemDescription} onChange={set('itemDescription')} rows={4}
                  placeholder="Mô tả tình trạng, nội dung, lý do bán..."
                  className="w-full rounded-xl border border-teal-100 bg-surface font-paragraph text-sm px-3 py-3 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none transition-all" />
              </div>

              {/* Image upload */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <FormLabel required>Hình ảnh tài liệu</FormLabel>
                  <span className={`font-paragraph text-xs ${form.images.length === 0 ? 'text-red-400' : 'text-muted-foreground'}`}>
                    {form.images.length}/5 ảnh
                  </span>
                </div>

                {form.images.length > 0 && (
                  <div className="flex flex-wrap gap-3">
                    {form.images.map((img, idx) => (
                      <div key={idx} className="relative w-24 h-24 rounded-xl border border-teal-100 overflow-hidden group shadow-soft">
                        {img.uploading ? (
                          <div className="w-full h-full flex items-center justify-center bg-surface">
                            <Loader2 className="h-5 w-5 animate-spin text-primary" />
                          </div>
                        ) : (
                          <img src={img.preview} alt={`Ảnh ${idx + 1}`} className="w-full h-full object-cover"
                            onError={e => e.target.style.display = 'none'} />
                        )}
                        {idx === 0 && !img.uploading && (
                          <span className="absolute bottom-0 left-0 right-0 text-center bg-primary/80 text-white font-heading text-[9px] uppercase tracking-widest py-0.5">
                            Ảnh bìa
                          </span>
                        )}
                        <button type="button" onClick={() => removeImage(idx)}
                          className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500">
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                    {form.images.length < 5 && (
                      <button type="button" onClick={() => fileInputRef.current?.click()}
                        className="w-24 h-24 rounded-xl border-2 border-dashed border-teal-200 flex flex-col items-center justify-center gap-1 text-muted-foreground hover:border-primary hover:text-primary hover:bg-teal-50 transition-all">
                        <ImagePlus className="h-5 w-5" />
                        <span className="font-heading text-[9px] uppercase tracking-widest">Thêm</span>
                      </button>
                    )}
                  </div>
                )}

                {form.images.length < 5 && (
                  <div className="space-y-2">
                    <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={addImageFile} />
                    <button type="button" onClick={() => fileInputRef.current?.click()}
                      className="flex items-center gap-2 px-4 h-10 rounded-xl border border-teal-200 font-heading text-xs font-semibold uppercase tracking-wide text-muted-foreground hover:border-primary hover:text-primary hover:bg-teal-50 transition-all">
                      <Upload className="h-4 w-4" />Tải ảnh từ máy
                    </button>
                    <div className="flex gap-2">
                      <Input value={imageUrl} onChange={e => setImageUrl(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addImageUrl() } }}
                        placeholder="Hoặc dán URL ảnh..."
                        className="h-10 rounded-xl border-teal-100 focus-visible:ring-primary font-paragraph bg-surface text-sm" />
                      <button type="button" onClick={addImageUrl}
                        className="px-4 h-10 rounded-xl border border-teal-200 font-heading text-xs font-semibold text-muted-foreground hover:border-primary hover:text-primary hover:bg-teal-50 transition-all whitespace-nowrap">
                        Thêm
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-1.5">
                <FormLabel>Từ khóa</FormLabel>
                <Input value={form.keywords} onChange={set('keywords')} placeholder="VD: giải tích toán vi tích phân"
                  className="h-11 rounded-xl border-teal-100 focus-visible:ring-primary font-paragraph bg-surface text-sm" />
                <p className="font-paragraph text-xs text-muted-foreground">Các từ khóa giúp người khác tìm kiếm dễ hơn</p>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting || form.images.some(img => img.uploading)}
              className="w-full h-14 rounded-2xl bg-teal-gradient text-white font-heading font-bold text-sm shadow-btn hover:shadow-card-hover hover:-translate-y-0.5 transition-all duration-200 disabled:opacity-60 disabled:translate-y-0"
            >
              {isSubmitting ? 'Đang gửi...' : 'Gửi bài đăng'}
            </button>
          </div>

          {/* Sidebar */}
          <div className="col-span-12 lg:col-span-4">
            <div className="sticky top-32 bg-white rounded-2xl border border-teal-100 shadow-soft p-6 space-y-5">
              <h3 className="font-heading text-sm font-bold uppercase tracking-wide text-foreground border-b border-teal-50 pb-3">Quy trình đăng bài</h3>
              <ul className="space-y-4">
                {[
                  'Điền đầy đủ các trường bắt buộc và nhấn "Gửi bài đăng".',
                  'Bài đăng vào hàng chờ để Admin kiểm duyệt nội dung.',
                  'Sau khi được duyệt, bài hiển thị công khai trên trang chủ.',
                  'Nếu bị từ chối, bạn có thể chỉnh sửa lại bài đăng.',
                ].map((text, i) => (
                  <li key={i} className="flex gap-3 items-start font-paragraph text-sm text-muted-foreground">
                    <div className="w-6 h-6 rounded-lg bg-teal-50 border border-teal-200 flex-shrink-0 flex items-center justify-center font-heading text-xs font-bold text-primary">
                      {i + 1}
                    </div>
                    <span className="pt-0.5">{text}</span>
                  </li>
                ))}
              </ul>

              <div className="bg-amber-50 rounded-xl border border-amber-200 p-4 flex items-start gap-3">
                <Clock className="h-4 w-4 text-amber-500 flex-shrink-0 mt-0.5" />
                <p className="font-paragraph text-xs text-amber-700 leading-relaxed">
                  Thời gian kiểm duyệt thường trong vòng 24 giờ làm việc.
                </p>
              </div>
            </div>
          </div>
        </form>
      </div>
      <Footer />
    </div>
  )
}