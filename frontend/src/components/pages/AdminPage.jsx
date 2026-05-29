import { useState, useEffect, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Shield, CheckCircle, XCircle, Clock, Users, FileText,
  AlertTriangle, Eye, LogOut, BarChart3,
  Ban, Trash2, Star, RefreshCw, Search,
  BookOpen, ClipboardList, Banknote, User, Flag, ExternalLink,
  UserCircle, UserX, MessageSquareWarning, ThumbsUp, ThumbsDown,
  ShieldX, ShieldAlert, X
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useAuth } from '@/context/AuthContext'
import { API_URL } from '@/lib/Api.js'
import {
  adminGetListings, adminApproveListing, adminRejectListing, adminDeleteListing,
  adminGetUsers, adminBanUser, adminUnbanUser, adminDeleteUser, adminGetReports
} from '@/lib/Adminapi.js'
import { getReports, resolveReport, punishUserFromReport } from '@/lib/Reportapi.js'
import { getAppeals, reviewAppeal } from '@/lib/Appealapi.js'
// ── Helpers ───────────────────────────────────────────────────────────────────
function getImageUrl(imageId) {
  if (!imageId) return null
  if (imageId.startsWith('http')) return imageId
  return `${API_URL}/images/${imageId}`
}

function fmtPrice(p) {
  return p === 0 ? 'Miễn phí' : `${Number(p).toLocaleString('vi-VN')}đ`
}

// ── Shared UI ─────────────────────────────────────────────────────────────────
function StatCard({ icon: Icon, label, value, accent }) {
  return (
    <div className={`rounded-2xl border p-5 flex items-center gap-4 shadow-soft transition-all ${accent ? 'border-primary/30 bg-primary/5' : 'border-teal-100 bg-white'}`}>
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${accent ? 'bg-primary/15' : 'bg-teal-50'}`}>
        <Icon className={`w-5 h-5 ${accent ? 'text-primary' : 'text-teal-500'}`} />
      </div>
      <div>
        <p className="font-paragraph text-xs text-muted-foreground uppercase tracking-widest mb-0.5">{label}</p>
        <p className="font-heading text-2xl font-bold text-foreground">{value}</p>
      </div>
    </div>
  )
}

function Badge({ status }) {
  const map = {
    pending:  { label: 'Chờ duyệt',  cls: 'text-amber-600 bg-amber-50 border-amber-200' },
    approved: { label: 'Đã duyệt',   cls: 'text-emerald-600 bg-emerald-50 border-emerald-200' },
    rejected: { label: 'Từ chối',    cls: 'text-red-500 bg-red-50 border-red-200' },
    user:     { label: 'Bình thường', cls: 'text-emerald-600 bg-emerald-50 border-emerald-200' },
    banned:   { label: 'Đã ban',     cls: 'text-red-600 bg-red-50 border-red-200' },
  }
  const { label, cls } = map[status] ?? { label: status, cls: 'border-teal-100 text-muted-foreground' }
  return (
    <span className={`inline-flex items-center gap-1 font-heading text-[10px] uppercase tracking-wide px-2.5 py-1 rounded-full border ${cls}`}>
      {label}
    </span>
  )
}

function Skeleton() {
  return (
    <div className="space-y-3">
      {[1, 2, 3].map(i => (
        <div key={i} className="rounded-2xl border border-teal-100 bg-white p-5 animate-pulse shadow-soft">
          <div className="h-4 bg-teal-50 rounded-lg w-1/3 mb-2" />
          <div className="h-3 bg-teal-50/70 rounded-lg w-1/2" />
        </div>
      ))}
    </div>
  )
}

// ══════════════════════════════════════════════════════════
// TAB 1 — Kiểm duyệt bài đăng
// ══════════════════════════════════════════════════════════
function ModerationTab({ onStatsChange }) {
  const [listings, setListings]         = useState([])
  const [filter, setFilter]             = useState('pending')
  const [search, setSearch]             = useState('')
  const [loading, setLoading]           = useState(true)
  const [rejectOpen, setRejectOpen]     = useState({})
  const [rejectReason, setRejectReason] = useState({})
  const [busy, setBusy]                 = useState({})
  const [error, setError]               = useState('')
  const [deleteModal, setDeleteModal] = useState({
    open: false,
    listingId: null,
    listingName: '',
  })
  const load = useCallback(async () => {
    setLoading(true); setError('')
    try {
      const data = await adminGetListings({ limit: 200 })
      setListings(data)
      onStatsChange(data)
    } catch (e) { setError(e.message) }
    finally { setLoading(false) }
  }, [onStatsChange])

  useEffect(() => { load() }, [load])

  const visible = listings.filter(l => {
    const matchStatus = filter === 'all' ? true : l.status === filter
    const q = search.toLowerCase()
    const matchSearch = !q || l.item_name?.toLowerCase().includes(q) || l.subject?.toLowerCase().includes(q)
    return matchStatus && matchSearch
  })

  const TABS = [
    { id: 'pending',  label: 'Chờ duyệt',  count: listings.filter(l => l.status === 'pending').length },
    { id: 'approved', label: 'Đã duyệt',   count: listings.filter(l => l.status === 'approved').length },
    { id: 'rejected', label: 'Từ chối',    count: listings.filter(l => l.status === 'rejected').length },
    { id: 'all',      label: 'Tất cả',     count: listings.length },
  ]

  const approve = async (id) => {
    setBusy(p => ({ ...p, [id]: true }))
    try { await adminApproveListing(id); await load() }
    catch (e) { alert('Lỗi: ' + e.message) }
    finally { setBusy(p => ({ ...p, [id]: false })) }
  }

  const reject = async (id) => {
    const reason = rejectReason[id]?.trim()
    if (!reason) { alert('Vui lòng nhập lý do từ chối!'); return }
    setBusy(p => ({ ...p, [id]: true }))
    try {
      await adminRejectListing(id, reason)
      setRejectOpen(p => ({ ...p, [id]: false }))
      setRejectReason(p => ({ ...p, [id]: '' }))
      await load()
    } catch (e) { alert('Lỗi: ' + e.message) }
    finally { setBusy(p => ({ ...p, [id]: false })) }
  }

  const deleteListing = async () => {
    const id = deleteModal.listingId
    if (!id) return

    setBusy(p => ({ ...p, [id]: true }))

    try {
      await adminDeleteListing(id)
      await load()

      setDeleteModal({
        open: false,
        listingId: null,
        listingName: '',
      })
    } catch (e) {
      alert('Lỗi: ' + e.message)
    } finally {
      setBusy(p => ({ ...p, [id]: false }))
    }
  }

  return (
    <div>
      <div className="flex flex-wrap gap-1.5 mb-6">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setFilter(t.id)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl font-heading text-xs font-semibold transition-all ${
              filter === t.id ? 'bg-teal-gradient text-white shadow-btn' : 'bg-white border border-teal-100 text-muted-foreground hover:text-foreground shadow-soft'
            }`}>
            {t.label}
            {t.count > 0 && (
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${filter === t.id ? 'bg-white/20 text-white' : 'bg-primary text-white'}`}>
                {t.count}
              </span>
            )}
          </button>
        ))}
        <button onClick={load} className="ml-auto p-2.5 rounded-xl border border-teal-100 bg-white text-muted-foreground hover:text-primary transition-colors shadow-soft" title="Làm mới">
          <RefreshCw className="h-4 w-4" />
        </button>
      </div>

      <div className="relative mb-6 max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Tìm tên tài liệu, môn học..."
          className="pl-10 h-11 rounded-xl border-teal-100 bg-white font-paragraph text-sm shadow-soft" />
      </div>

      {error && (
        <div className="mb-4 px-4 py-3 rounded-xl bg-red-50 border border-red-200 font-paragraph text-sm text-red-600">
          {error} — <button onClick={load} className="underline">Thử lại</button>
        </div>
      )}

      {loading ? <Skeleton /> : visible.length === 0 ? (
        <div className="py-20 flex flex-col items-center justify-center rounded-2xl border border-dashed border-teal-200 bg-white text-center">
          <FileText className="h-10 w-10 text-muted-foreground mb-4 opacity-30" />
          <p className="font-heading text-lg uppercase text-muted-foreground">Không có bài đăng nào</p>
        </div>
      ) : (
        <div className="space-y-4">
          {visible.map(listing => {
            const thumb = listing.images?.[0]
            const isBusy = busy[listing.id]
            return (
              <div key={listing.id} className="bg-white rounded-2xl border border-teal-100 hover:shadow-card shadow-soft overflow-hidden transition-all">
                <div className="grid grid-cols-12 gap-0">
                  {thumb && (
                    <div className="col-span-2 hidden md:block">
                      <div className="h-full min-h-[120px] overflow-hidden">
                        <img src={getImageUrl(thumb)} alt={listing.item_name}
                          className="w-full h-full object-cover"
                          onError={e => e.target.style.display = 'none'} />
                      </div>
                    </div>
                  )}

                  <div className={`${thumb ? 'col-span-12 md:col-span-7' : 'col-span-12 md:col-span-9'} p-5`}>
                    <div className="flex flex-wrap items-start gap-3 mb-2">
                      <h3 className="font-heading text-base uppercase leading-tight">{listing.item_name}</h3>
                      <Badge status={listing.status} />
                    </div>
                    <div className="flex flex-wrap gap-2 text-xs font-paragraph text-muted-foreground mb-2">
                      <span className="inline-flex items-center gap-1"><User className="h-3 w-3" />Seller #{listing.seller_id}</span>
                      {listing.subject && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-teal-50 text-teal-700 border border-teal-100">
                          <BookOpen className="h-3 w-3" />{listing.subject}
                        </span>
                      )}
                      {listing.condition && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-surface border border-border">
                          <ClipboardList className="h-3 w-3" />{listing.condition}
                        </span>
                      )}
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 border border-amber-100">
                        <Banknote className="h-3 w-3" />{fmtPrice(listing.item_price)}
                      </span>
                    </div>
                    {listing.item_description && (
                      <p className="font-paragraph text-xs text-muted-foreground line-clamp-2">{listing.item_description}</p>
                    )}
                  </div>

                  <div className="col-span-12 md:col-span-3 border-t md:border-t-0 md:border-l border-teal-100 flex flex-col">
                    <Link to={`/admin/listings/${listing.id}`} 
                      className="flex items-center gap-2 px-4 py-3 font-heading text-xs uppercase tracking-widest text-muted-foreground hover:text-primary hover:bg-teal-50 transition-colors border-b border-teal-100">
                      <Eye className="h-3.5 w-3.5" />Xem bài
                    </Link>

                    {listing.status === 'pending' && (
                      <>
                        <button onClick={() => approve(listing.id)} disabled={isBusy}
                          className="flex items-center gap-2 px-4 py-3 font-heading text-xs uppercase tracking-widest text-emerald-600 hover:bg-emerald-50 transition-colors border-b border-teal-100 disabled:opacity-50">
                          <CheckCircle className="h-3.5 w-3.5" />{isBusy ? 'Đang xử lý...' : 'Duyệt bài'}
                        </button>

                        {rejectOpen[listing.id] ? (
                          <div className="p-3 border-b border-teal-100 space-y-2">
                            <textarea
                              placeholder="Lý do từ chối *"
                              value={rejectReason[listing.id] || ''}
                              onChange={e => setRejectReason(p => ({ ...p, [listing.id]: e.target.value }))}
                              rows={2}
                              className="w-full text-xs font-paragraph border border-teal-100 bg-surface rounded-xl px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-primary/30 text-foreground" />
                            <div className="flex gap-2">
                              <button onClick={() => reject(listing.id)} disabled={isBusy}
                                className="flex-1 py-2 rounded-xl bg-red-500 text-white font-heading text-[10px] uppercase tracking-widest hover:bg-red-600 transition-colors disabled:opacity-50">
                                Xác nhận
                              </button>
                              <button onClick={() => setRejectOpen(p => ({ ...p, [listing.id]: false }))}
                                className="px-3 py-2 rounded-xl border border-teal-100 font-heading text-[10px] uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors">
                                Hủy
                              </button>
                            </div>
                          </div>
                        ) : (
                          <button onClick={() => setRejectOpen(p => ({ ...p, [listing.id]: true }))}
                            className="flex items-center gap-2 px-4 py-3 font-heading text-xs uppercase tracking-widest text-red-500 hover:bg-red-50 transition-colors border-b border-teal-100">
                            <XCircle className="h-3.5 w-3.5" />Từ chối
                          </button>
                        )}
                      </>
                    )}

                    <button
                        onClick={() =>
                          setDeleteModal({
                            open: true,
                            listingId: listing.id,
                            listingName: listing.item_name,
                          })
                        } disabled={isBusy}
                      className="flex items-center gap-2 px-4 py-3 font-heading text-xs uppercase tracking-widest text-muted-foreground hover:text-red-500 hover:bg-red-50 transition-colors disabled:opacity-50">
                      <Trash2 className="h-3.5 w-3.5" />Xóa bài
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
      {deleteModal.open && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="relative w-full max-w-md overflow-hidden rounded-[2rem] border border-red-100 bg-white shadow-[0_20px_60px_rgba(0,0,0,0.18)] animate-in zoom-in-95 duration-200">

            {/* Glow effect */}
            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-red-400 via-rose-500 to-red-500" />

            {/* Header */}
            <div className="relative px-7 pt-7 pb-5 border-b border-red-100 bg-gradient-to-b from-red-50/70 to-white">
              <div className="flex items-start gap-4">

                {/* Icon */}
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-red-100 shadow-sm">
                  <Trash2 className="h-7 w-7 text-red-500" />
                </div>

                {/* Title */}
                <div className="flex-1">
                  <h3 className="font-heading text-xl uppercase tracking-wide text-gray-900">
                    Xóa bài đăng
                  </h3>

                  <p className="mt-1 text-sm text-muted-foreground leading-relaxed">
                    Bài đăng sẽ bị xóa vĩnh viễn và không thể khôi phục.
                  </p>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="px-7 py-6">
              <p className="text-sm text-gray-600">
                Bạn có chắc muốn xóa bài đăng này không?
              </p>

              <div className="mt-4 rounded-2xl border border-red-100 bg-red-50/50 p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white shadow-sm">
                    <FileText className="h-5 w-5 text-red-400" />
                  </div>

                  <div className="min-w-0">
                    <p className="text-xs uppercase tracking-widest text-red-500 font-semibold">
                      Bài đăng sẽ bị xóa
                    </p>

                    <p className="truncate font-heading text-sm uppercase text-gray-900">
                      {deleteModal.listingName}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 border-t border-gray-100 bg-gray-50/60 px-7 py-5">

              <button
                onClick={() =>
                  setDeleteModal({
                    open: false,
                    listingId: null,
                    listingName: '',
                  })
                }
                className="rounded-xl border border-gray-200 bg-white px-5 py-2.5 text-sm font-heading uppercase tracking-wider text-gray-600 transition-all hover:scale-[1.02] hover:border-gray-300 hover:bg-gray-50 hover:text-gray-900"
              >
                Hủy
              </button>

              <button
                onClick={deleteListing}
                disabled={busy[deleteModal.listingId]}
                className="rounded-xl bg-red-500 px-5 py-2.5 text-sm font-heading uppercase tracking-wider text-white shadow-lg shadow-red-500/20 transition-all hover:scale-[1.02] hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {busy[deleteModal.listingId]
                  ? 'Đang xóa...'
                  : 'Xóa bài'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Rating Stars (Report tab only) ─────────────────────────────────────────
function RatingStars({ value }) {
  const rating = Number(value ?? 0)
  const filled = Math.round(rating)
 
  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={`w-3 h-3 ${
            i < filled
              ? 'fill-amber-400 text-amber-400'
              : 'text-muted-foreground/30'
          }`}
        />
      ))}
      <span className="ml-1 text-xs font-mono text-amber-500 font-medium">
        {rating.toFixed(1)}
      </span>
    </div>
  )
}
 
// ─── Report Status Pill ───────────────────────────────────────────────────────
function ReportStatusPill({ resolved }) {
  return resolved ? (
    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-heading uppercase tracking-widest bg-green-500/10 text-green-600 border border-green-500/20">
      <CheckCircle className="w-3 h-3" />
      Đã xử lý
    </span>
  ) : (
    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-heading uppercase tracking-widest bg-amber-500/10 text-amber-600 border border-amber-500/20">
      <Clock className="w-3 h-3" />
      Chờ xử lý
    </span>
  )
}
// ─── Report Card ──────────────────────────────────────────────────────────────
function ReportCard({ report, onResolve, onPunish }) {
  const resolved = report.status === 'resolved'
  const rating = Number(report.reported_user_rating ?? 0)
  const isHighRisk = rating < 2 && !resolved
 
  // State cho modal xử phạt
  const [punishOpen, setPunishOpen] = useState(false)
  const [punishAction, setPunishAction] = useState('')
  const [punishNote, setPunishNote] = useState('')
  const [punishBusy, setPunishBusy] = useState(false)
 
  const handlePunish = async () => {
    if (!punishAction) {
      alert('Vui lòng chọn hành động')
      return
    }

    setPunishBusy(true)

    try {
      await punishUserFromReport(
        report.id,
        punishAction,
        punishNote
      )

      setPunishOpen(false)
      setPunishNote('')
      setPunishAction('')

      onPunish?.(report.id)
    } catch (e) {
      alert('Lỗi: ' + e.message)
    } finally {
      setPunishBusy(false)
    }
  }
 
  // Hiển thị trạng thái ban hiện tại của người bị report
  const getBanLabel = () => {
    if (report.reported_user_status === 'banned') {
      if (report.reported_user_ban_until) {
        const until = new Date(report.reported_user_ban_until)
        return `Đang bị ban đến ${until.toLocaleDateString('vi-VN')}`
      }
      return 'Đang bị ban vĩnh viễn'
    }
    return null
  }
  const banLabel = getBanLabel()
 
  return (
    <div
      className={`
        relative overflow-hidden rounded-2xl border shadow-soft transition-all duration-200
        ${resolved
          ? 'border-teal-100 bg-white opacity-60'
          : isHighRisk
            ? 'border-red-200 bg-red-50/30'
            : 'border-teal-100 bg-white hover:shadow-card'
        }
      `}
    >
      {isHighRisk && (
        <div className="absolute left-0 top-0 bottom-0 w-1 bg-red-500" />
      )}
 
      <div className="p-5 pl-6">
        {/* Header row */}
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="flex items-start gap-3 min-w-0">
            <div
              className={`
                mt-0.5 w-8 h-8 flex-shrink-0 flex items-center justify-center rounded-xl
                ${isHighRisk && !resolved
                  ? 'bg-red-100 text-red-500'
                  : 'bg-teal-50 text-teal-500'
                }
              `}
            >
              <Flag className="w-4 h-4" />
            </div>
 
            <div className="min-w-0">
              <div className="mb-1">
                <span className="text-[10px] font-heading uppercase tracking-widest text-muted-foreground mr-2">
                  Lý do:
                </span>
                <span className="font-heading text-sm uppercase tracking-wide text-foreground leading-snug">
                  {report.reason}
                </span>
              </div>
 
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs text-muted-foreground">Người bị report:</span>
                <span className="text-xs font-medium text-foreground">{report.reported_username}</span>
                <span className="text-muted-foreground/40 text-xs">·</span>
                <RatingStars value={rating} />
                {/* Hiển thị trạng thái ban hiện tại */}
                {banLabel && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-heading uppercase tracking-widest bg-red-500/10 text-red-600 border border-red-500/20">
                    <Ban className="w-3 h-3" />
                    {banLabel}
                  </span>
                )}
              </div>
            </div>
          </div>
 
          <div className="flex-shrink-0">
            <ReportStatusPill resolved={resolved} />
          </div>
        </div>
 
        <div className="border-t border-teal-100 mb-4" />
 
        {/* Report detail */}
        {report.detail && (
          <div className="mb-4">
            <p className="text-[11px] font-heading uppercase tracking-widest text-muted-foreground mb-2">
              Nội dung báo cáo
            </p>
            <div className="rounded-xl border border-teal-100 bg-teal-50/30 px-4 py-3">
              <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                {report.detail}
              </p>
            </div>
          </div>
        )}
 
        {/* Admin note nếu có */}
        {report.admin_note && (
          <div className="mb-4 px-3 py-2 rounded-xl border border-blue-100 bg-blue-50/50">
            <p className="text-[10px] font-heading uppercase tracking-widest text-muted-foreground mb-1">Ghi chú admin</p>
            <p className="text-xs text-foreground">{report.admin_note}</p>
          </div>
        )}
 
        {/* Action row */}
        <div className="flex items-center gap-2 flex-wrap">
          {report.listing_id && (
            <Link
              to={`/listings/${report.listing_id}`}
              target="_blank"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-teal-100 bg-white text-[11px] font-heading uppercase tracking-widest text-muted-foreground hover:text-primary hover:border-primary/30 shadow-soft transition-colors duration-150"
            >
              <ExternalLink className="w-3 h-3" />
              Xem bài đăng
            </Link>
          )}
 
          <Link
            to={`/nguoi-dung/${report.reported_user_id}`}
            target="_blank"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-teal-100 bg-white text-[11px] font-heading uppercase tracking-widest text-muted-foreground hover:text-primary hover:border-primary/30 shadow-soft transition-colors duration-150"
          >
            <UserCircle className="w-3 h-3" />
            Xem tài khoản
          </Link>
 
          {/* [THAY ĐỔI 1] Nút xử phạt */}
          {!resolved && (
            <button
              onClick={() => setPunishOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-amber-200 bg-amber-50 text-[11px] font-heading uppercase tracking-widest text-amber-600 hover:bg-amber-100 transition-all duration-150"
            >
              <AlertTriangle className="w-3 h-3" />
              Xử phạt
            </button>
          )}
 
          {!resolved && (
            <button
              onClick={() => onResolve(report.id)}
              className="ml-auto inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-emerald-200 bg-emerald-50 text-[11px] font-heading uppercase tracking-widest text-emerald-600 hover:bg-emerald-100 transition-all duration-150"
            >
              <CheckCircle className="w-3 h-3" />
              Đánh dấu xử lý
            </button>
          )}
        </div>
      </div>
 
      {/* [THAY ĐỔI 1] Modal xử phạt */}
      {punishOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-md p-4">
          <div className="relative w-full max-w-md overflow-hidden rounded-2xl border border-orange-100 bg-white shadow-2xl">
            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-orange-400 via-red-500 to-orange-500" />
 
            <div className="px-7 pt-7 pb-5 border-b border-orange-100">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-orange-100">
                  <AlertTriangle className="h-6 w-6 text-orange-500" />
                </div>
                <div>
                  <h3 className="font-heading text-lg uppercase tracking-wide text-gray-900">Xử phạt người dùng</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Tài khoản: <span className="font-medium text-foreground">{report.reported_username}</span>
                  </p>
                </div>
              </div>
            </div>
 
            <div className="px-7 py-6 space-y-4">
              {/* Chọn hành động */}
              <div>
                <p className="text-xs font-heading uppercase tracking-widest text-muted-foreground mb-3">
                  Chọn hình thức xử phạt
                </p>

                <div className="space-y-2">
                  {[
                    {
                      value: 'warn',
                      label: 'Gửi cảnh cáo',
                      desc: 'Không hạn chế tài khoản, chỉ ghi nhận vi phạm',
                      icon: AlertTriangle,
                      iconClass: 'text-yellow-500',
                    },
                    {
                      value: 'ban_7days',
                      label: 'Ban 7 ngày',
                      desc: 'Tài khoản bị hạn chế trong 7 ngày',
                      icon: ShieldAlert,
                      iconClass: 'text-orange-500',
                    },
                    {
                      value: 'ban_permanent',
                      label: 'Ban vĩnh viễn',
                      desc: 'Tài khoản bị khoá không thời hạn',
                      icon: ShieldX,
                      iconClass: 'text-red-500',
                    },
                  ].map(opt => {
                    const Icon = opt.icon

                    return (
                      <label
                        key={opt.value}
                        className={`flex items-start gap-3 p-3 border rounded-xl cursor-pointer transition-all ${
                          punishAction === opt.value
                            ? 'border-orange-400 bg-orange-50'
                            : 'border-gray-200 hover:border-orange-200 hover:bg-orange-50/50'
                        }`}
                      >
                        <input
                          type="radio"
                          name="punishAction"
                          value={opt.value}
                          checked={punishAction === opt.value}
                          onChange={() => setPunishAction(opt.value)}
                          className="mt-1"
                        />

                        <div className="flex items-start gap-3">
                          <div className="w-9 h-9 rounded-lg bg-white border border-gray-200 flex items-center justify-center shrink-0">
                            <Icon className={`w-4 h-4 ${opt.iconClass}`} />
                          </div>

                          <div>
                            <p className="text-sm font-heading uppercase tracking-wide text-gray-900">
                              {opt.label}
                            </p>

                            <p className="text-xs text-gray-500 mt-0.5">
                              {opt.desc}
                            </p>
                          </div>
                        </div>
                      </label>
                    )
                  })}
                </div>
              </div>
 
              {/* Ghi chú */}
              <div>
                <p className="text-xs font-heading uppercase tracking-widest text-muted-foreground mb-2">
                  Ghi chú nội bộ <span className="text-muted-foreground/50">(tuỳ chọn)</span>
                </p>
                <textarea
                  value={punishNote}
                  onChange={e => setPunishNote(e.target.value)}
                  placeholder="Lý do xử phạt, bằng chứng vi phạm..."
                  rows={3}
                  className="w-full text-sm border border-teal-100 rounded-xl px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-primary/30 bg-surface font-paragraph"
                />
              </div>
            </div>
 
            <div className="flex gap-3 border-t border-gray-100 bg-gray-50/60 px-7 py-5">
              <button
                onClick={() => { setPunishOpen(false); setPunishAction(''); setPunishNote('') }}
                className="flex-1 rounded-xl border border-gray-200 bg-white px-5 py-2.5 text-sm font-heading uppercase tracking-wider text-gray-600 hover:bg-gray-50"
              >
                Hủy
              </button>
              <button
                onClick={handlePunish}
                disabled={!punishAction || punishBusy}
                className="flex-1 rounded-xl bg-orange-500 px-5 py-2.5 text-sm font-heading uppercase tracking-wider text-white shadow-lg shadow-orange-500/20 hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {punishBusy ? 'Đang xử lý...' : 'Xác nhận'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
 
// ─── Report Tab ───────────────────────────────────────────────────────────────
function ReportTab() {
  const [reports, setReports] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all') // 'all' | 'pending' | 'resolved'
  
  const load = useCallback(async () => {
    setLoading(true)
 
    try {
      const data = await getReports()
 
      setReports(
        data.sort((a, b) => {
          const ratingA = a.reported_user_rating ?? 0
          const ratingB = b.reported_user_rating ?? 0
 
          if (ratingA !== ratingB) {
            return ratingA - ratingB
          }
 
          return (
            new Date(b.created_at) -
            new Date(a.created_at)
          )
        })
      )
    } catch (err) {
      console.error(err)
      setReports([])
    } finally {
      setLoading(false)
    }
  }, [])
 
  useEffect(() => {
    load()
  }, [load])
 
  const updateStatus = async (reportId) => {
    await resolveReport(reportId)
 
    setReports(prev =>
      prev.map(r =>
        r.id === reportId
          ? { ...r, status: 'resolved' }
          : r
      )
    )
  }

  const handlePunish = (reportId) => {
    setReports(prev =>
      prev.map(r =>
        r.id === reportId ? { ...r, status: 'resolved' } : r
      )
    )
  }
 
  const pendingCount = reports.filter(r => r.status !== 'resolved').length
  const resolvedCount = reports.filter(r => r.status === 'resolved').length
 
  const filtered = reports.filter(r => {
    if (filter === 'pending') return r.status !== 'resolved'
    if (filter === 'resolved') return r.status === 'resolved'
    return true
  })
 
  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 gap-3 text-muted-foreground">
        <RefreshCw className="w-4 h-4 animate-spin" />
        <span className="text-sm font-heading uppercase tracking-widest">
          Đang tải...
        </span>
      </div>
    )
  }
 
  return (
    <div>
      {/* Summary bar */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
        <div className="flex items-center gap-4 text-xs font-heading uppercase tracking-widest text-muted-foreground">
          <span>
            <span className="text-foreground font-medium">{reports.length}</span> báo cáo
          </span>
          <span className="text-muted-foreground/30">|</span>
          <span className="text-amber-600">
            <span className="font-medium">{pendingCount}</span> chờ xử lý
          </span>
          <span className="text-muted-foreground/30">|</span>
          <span className="text-green-600">
            <span className="font-medium">{resolvedCount}</span> đã xử lý
          </span>
        </div>
 
        {/* Filter pills */}
        <div className="flex items-center gap-1.5">
          {[
            { id: 'all', label: 'Tất cả' },
            { id: 'pending', label: 'Chờ xử lý' },
            { id: 'resolved', label: 'Đã xử lý' },
          ].map(f => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={`px-4 py-2 rounded-xl text-[11px] font-heading uppercase tracking-widest transition-all ${
                filter === f.id
                  ? 'bg-teal-gradient text-white shadow-btn'
                  : 'bg-white border border-teal-100 text-muted-foreground hover:text-foreground shadow-soft'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>
 
      {/* Report list */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3 text-muted-foreground rounded-2xl border border-dashed border-teal-200 bg-white">
          <Flag className="w-8 h-8 opacity-20" />
          <p className="text-sm font-heading uppercase tracking-widest opacity-50">
            Không có báo cáo nào
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(report => (
            <ReportCard
              key={report.id}
              report={report}
              onResolve={updateStatus}
              onPunish={handlePunish}
            />
          ))}
        </div>
      )}
    </div>
  )
}
// ══════════════════════════════════════════════════════════
// TAB 2 — Quản lý người dùng
// ══════════════════════════════════════════════════════════
function UsersTab() {
  const [users, setUsers]     = useState([])
  const [search, setSearch]   = useState('')
  const [loading, setLoading] = useState(true)
  const [busy, setBusy]       = useState({})
  const [error, setError]     = useState('')
  const [selectedUser, setSelectedUser] = useState(null)
  const [deleteModal, setDeleteModal] = useState({
    open: false,
    userId: null,
    userName: '',
  })

  const load = useCallback(async () => {
    setLoading(true); setError('')
    try { setUsers(await adminGetUsers()) }
    catch (e) { setError(e.message) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const filtered = users.filter(u => {
    const q = search.toLowerCase()
    return !q || u.username?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q) || u.university?.toLowerCase().includes(q)
  })

  const ban = async (userId) => {
    if (!confirm('Ban user này?')) return
    setBusy(p => ({ ...p, [userId]: true }))
    try { await adminBanUser(userId); await load() }
    catch (e) { alert('Lỗi: ' + e.message) }
    finally { setBusy(p => ({ ...p, [userId]: false })) }
  }

  const unban = async (userId) => {
    setBusy(p => ({ ...p, [userId]: true }))
    try { await adminUnbanUser(userId); await load() }
    catch (e) { alert('Lỗi: ' + e.message) }
    finally { setBusy(p => ({ ...p, [userId]: false })) }
  }

  const deleteUser = async () => {
    const userId = deleteModal.userId
    if (!userId) return

    setBusy(prev => ({
      ...prev,
      [userId]: true,
    }))

    try {
      await adminDeleteUser(userId)

      await load()

      setDeleteModal({
        open: false,
        userId: null,
        userName: '',
      })
    } catch (e) {
      alert('Lỗi: ' + (e?.message || 'Không thể xóa người dùng'))
    } finally {
      setBusy(prev => ({
        ...prev,
        [userId]: false,
      }))
    }
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Tìm theo tên, email, trường..."
            className="pl-10 h-11 rounded-xl border-teal-100 bg-white font-paragraph text-sm shadow-soft" />
        </div>
        <button onClick={load} className="p-2.5 rounded-xl border border-teal-100 bg-white text-muted-foreground hover:text-primary transition-colors shadow-soft" title="Làm mới">
          <RefreshCw className="h-4 w-4" />
        </button>
      </div>

      {error && (
        <div className="mb-4 px-4 py-3 rounded-xl bg-red-50 border border-red-200 font-paragraph text-sm text-red-600">
          {error} — <button onClick={load} className="underline">Thử lại</button>
        </div>
      )}

      <div className="rounded-2xl border border-teal-100 bg-white shadow-soft overflow-hidden">
        <div className="hidden md:grid grid-cols-12 gap-0 border-b border-teal-100 bg-teal-50/50 px-4 py-3">
          <div className="col-span-4 font-heading text-xs uppercase tracking-widest text-muted-foreground">Người dùng</div>
          <div className="col-span-3 font-heading text-xs uppercase tracking-widest text-muted-foreground">Trường</div>
          <div className="col-span-2 font-heading text-xs uppercase tracking-widest text-muted-foreground">Trạng thái</div>
          <div className="col-span-1 font-heading text-xs uppercase tracking-widest text-muted-foreground">Bài đăng</div>
          <div className="col-span-2 font-heading text-xs uppercase tracking-widest text-muted-foreground text-right">Hành động</div>
        </div>

        {loading ? (
          <div className="p-8"><Skeleton /></div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center">
            <p className="font-paragraph text-muted-foreground">Không tìm thấy người dùng</p>
          </div>
        ) : (
          filtered.map((user, i) => (
            <div key={user.id}
              className={`grid grid-cols-12 gap-0 px-4 py-4 items-center ${i < filtered.length - 1 ? 'border-b border-teal-100' : ''} hover:bg-teal-50/30 transition-colors`}>
              <div className="col-span-12 md:col-span-4 mb-2 md:mb-0">
                <p className="font-heading text-sm uppercase">{user.username}</p>
                <p className="font-paragraph text-xs text-muted-foreground">{user.email}</p>
                <div className="flex items-center gap-1 mt-1">
                  <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                  <span className="font-paragraph text-xs text-muted-foreground">
                    {user.rating?.toFixed(1) ?? '0.0'} ({user.rating_count ?? 0})
                  </span>
                </div>
              </div>
              <div className="col-span-12 md:col-span-3 mb-2 md:mb-0">
                <p className="font-paragraph text-xs text-muted-foreground">{user.university || '—'}</p>
              </div>
              <div className="col-span-6 md:col-span-2">
                <Badge status={user.role === 'banned' ? 'banned' : 'user'} />
              </div>
              <div className="col-span-6 md:col-span-1">
                <p className="font-paragraph text-xs text-muted-foreground">{user.listing_count ?? 0} bài</p>
              </div>
              <div className="col-span-12 md:col-span-2 flex items-center gap-1 justify-end">
                <button
                  onClick={() => setSelectedUser(user)}
                  title="Xem chi tiết"
                  className="p-2 text-muted-foreground hover:text-primary transition-colors"
                >
                  <UserCircle className="h-4 w-4" />
                </button>
                {user.role === 'banned' ? (
                  <button onClick={() => unban(user.id)} disabled={busy[user.id]}
                    title="Unban" className="p-2 text-muted-foreground hover:text-green-500 transition-colors disabled:opacity-50">
                    <CheckCircle className="h-4 w-4" />
                  </button>
                ) : (
                  <button onClick={() => ban(user.id)} disabled={busy[user.id]}
                    title="Ban" className="p-2 text-muted-foreground hover:text-orange-500 transition-colors disabled:opacity-50">
                    <Ban className="h-4 w-4" />
                  </button>
                )}
                <button
                  onClick={() =>
                    setDeleteModal({
                      open: true,
                      userId: user.id,
                      userName: user.username,
                    })
                  }
                  disabled={busy[user.id]}
                  title="Xóa user"
                  className="p-2 text-muted-foreground hover:text-red-500 transition-colors disabled:opacity-50"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
      <p className="font-paragraph text-xs text-muted-foreground mt-3 text-right">{filtered.length} người dùng</p>
      {deleteModal.open && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="relative w-full max-w-md overflow-hidden rounded-[2rem] border border-red-100 bg-white shadow-[0_20px_60px_rgba(0,0,0,0.18)] animate-in zoom-in-95 duration-200">

            {/* Accent */}
            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-red-400 via-rose-500 to-red-500" />

            {/* Body */}
            <div className="px-7 pt-8 pb-6 text-center">

              {/* Icon */}
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-[1.4rem] bg-red-100 shadow-sm">
                <UserX className="h-8 w-8 text-red-500" />
              </div>

              {/* Title */}
              <h3 className="mt-5 font-heading text-2xl uppercase tracking-wide text-gray-900">
                Xóa người dùng
              </h3>

              {/* Description */}
              <p className="mt-2 text-sm leading-relaxed text-gray-500">
                Bạn có chắc chắn muốn xóa tài khoản này không?
              </p>

              {/* User Card */}
              <div className="mt-5 rounded-[1.5rem] border border-red-100 bg-red-50/50 p-4 text-left">
                <div className="flex items-center gap-3">

                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white shadow-sm">
                    <User className="h-6 w-6 text-red-400" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-red-500">
                      Người dùng sẽ bị xóa
                    </p>

                    <p className="truncate font-heading text-sm uppercase text-gray-900">
                      {deleteModal.userName}
                    </p>
                  </div>
                </div>
              </div>

              {/* Warning */}
              <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-left">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                  <p className="text-xs leading-relaxed text-amber-800">
                    Hành động này không thể hoàn tác và toàn bộ dữ liệu liên quan có thể bị mất.
                  </p>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 border-t border-gray-100 bg-gray-50/60 px-7 py-5">
              <button
                onClick={() =>
                  setDeleteModal({
                    open: false,
                    userId: null,
                    userName: '',
                  })
                }
                className="flex-1 rounded-xl border border-gray-200 bg-white px-5 py-3 text-sm font-heading uppercase tracking-wider text-gray-600 transition-all hover:border-gray-300 hover:bg-gray-50 hover:text-gray-900"
              >
                Hủy
              </button>

              <button
                onClick={deleteUser}
                disabled={busy[deleteModal.userId]}
                className="flex-1 rounded-xl bg-red-500 px-5 py-3 text-sm font-heading uppercase tracking-wider text-white shadow-lg shadow-red-500/20 transition-all hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {busy[deleteModal.userId]
                  ? 'Đang xóa...'
                  : 'Xóa'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Admin User Detail Modal ── */}
      {selectedUser && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
            onClick={() => setSelectedUser(null)}
          />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ type: 'spring', damping: 28, stiffness: 280 }}
              className="pointer-events-auto w-[95vw] max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden border border-teal-100"
            >
              {/* Header */}
              <div className="px-6 py-5 flex items-center justify-between bg-teal-gradient">
                <div>
                  <p className="font-heading text-white/70 text-xs uppercase tracking-widest mb-0.5">Chi tiết tài khoản</p>
                  <h2 className="font-heading text-white font-bold text-base">{selectedUser.username}</h2>
                </div>
                <button
                  onClick={() => setSelectedUser(null)}
                  className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors"
                >
                  <X className="h-4 w-4 text-white" />
                </button>
              </div>

              {/* Body */}
              <div className="px-6 py-5 space-y-4">
                {/* Avatar + basic info */}
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-full overflow-hidden bg-teal-50 flex items-center justify-center font-heading text-lg font-black text-primary flex-shrink-0">
                    {selectedUser.avatar_url ? (
                      <img src={selectedUser.avatar_url.startsWith('http') ? selectedUser.avatar_url : `${API_URL}/avatars/${selectedUser.avatar_url}`} alt={selectedUser.username} className="w-full h-full object-cover" />
                    ) : (
                      selectedUser.username?.[0]?.toUpperCase()
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="font-heading text-base font-bold text-foreground truncate">{selectedUser.username}</p>
                    <p className="font-paragraph text-sm text-muted-foreground truncate">{selectedUser.email}</p>
                    {selectedUser.university && (
                      <p className="font-paragraph text-xs text-muted-foreground mt-0.5 truncate">{selectedUser.university}</p>
                    )}
                  </div>
                </div>

                {/* Stats row */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-teal-50 rounded-xl p-3 text-center">
                    <p className="font-heading text-lg font-black text-primary">{selectedUser.listing_count ?? 0}</p>
                    <p className="font-paragraph text-xs text-muted-foreground">Bài đăng</p>
                  </div>
                  <div className="bg-amber-50 rounded-xl p-3 text-center">
                    <p className="font-heading text-lg font-black text-amber-600">{selectedUser.rating?.toFixed(1) ?? '0.0'}</p>
                    <p className="font-paragraph text-xs text-muted-foreground">Đánh giá</p>
                  </div>
                  <div className="bg-surface rounded-xl p-3 text-center">
                    <p className="font-heading text-lg font-black text-foreground">{selectedUser.rating_count ?? 0}</p>
                    <p className="font-paragraph text-xs text-muted-foreground">Lượt đánh giá</p>
                  </div>
                </div>

                {/* Status */}
                <div className="flex items-center justify-between px-4 py-3 rounded-xl border border-teal-100 bg-surface">
                  <span className="font-heading text-xs font-semibold uppercase tracking-widest text-muted-foreground">Trạng thái</span>
                  <Badge status={selectedUser.role === 'banned' ? 'banned' : 'user'} />
                </div>

                {/* Join date */}
                {selectedUser.created_at && (
                  <div className="flex items-center justify-between px-4 py-3 rounded-xl border border-teal-100 bg-surface">
                    <span className="font-heading text-xs font-semibold uppercase tracking-widest text-muted-foreground">Ngày tham gia</span>
                    <span className="font-paragraph text-sm text-foreground">
                      {new Date(selectedUser.created_at).toLocaleDateString('vi-VN')}
                    </span>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="px-6 pb-6 flex gap-3">
                {selectedUser.role === 'banned' ? (
                  <button
                    onClick={async () => {
                      await unban(selectedUser.id)
                      setSelectedUser(prev => prev ? { ...prev, role: 'user' } : null)
                    }}
                    disabled={busy[selectedUser.id]}
                    className="flex-1 h-11 rounded-xl bg-emerald-500 text-white font-heading font-semibold text-sm flex items-center justify-center gap-2 hover:bg-emerald-600 transition-colors disabled:opacity-60"
                  >
                    <CheckCircle className="h-4 w-4" />Gỡ cấm
                  </button>
                ) : (
                  <button
                    onClick={async () => {
                      if (!confirm('Ban user này?')) return
                      await ban(selectedUser.id)
                      setSelectedUser(prev => prev ? { ...prev, role: 'banned' } : null)
                    }}
                    disabled={busy[selectedUser.id]}
                    className="flex-1 h-11 rounded-xl bg-orange-500 text-white font-heading font-semibold text-sm flex items-center justify-center gap-2 hover:bg-orange-600 transition-colors disabled:opacity-60"
                  >
                    <Ban className="h-4 w-4" />Cấm tài khoản
                  </button>
                )}
                <a
                  href={`/nguoi-dung/${selectedUser.id}`}
                  target="_blank"
                  rel="noreferrer"
                  className="h-11 px-4 rounded-xl border border-teal-100 font-heading font-semibold text-sm text-foreground hover:border-primary hover:text-primary transition-colors flex items-center gap-2"
                >
                  <ExternalLink className="h-4 w-4" />Hồ sơ
                </a>
                <button
                  onClick={() => setSelectedUser(null)}
                  className="h-11 px-4 rounded-xl border border-teal-100 font-heading text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Đóng
                </button>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </div>
  )
}

// ══════════════════════════════════════════════════════════
// APPEAL TAB
// ══════════════════════════════════════════════════════════
function AppealTab({ onCountChange }) {
  const [appeals, setAppeals] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all') // 'all' | 'pending' | 'approved' | 'rejected'
  const [reviewOpen, setReviewOpen] = useState({})
  const [reviewNote, setReviewNote] = useState({})
  const [busy, setBusy] = useState({})
  const [error, setError] = useState('')

  const load = async () => {
    setLoading(true)
    try {
      const data = await getAppeals()
      setAppeals(data)
      onCountChange?.(data.filter(a => a.status === 'pending').length)
    } catch {
      setError('Không thể tải danh sách khiếu nại')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const handleReview = async (appealId, action) => {
    setBusy(b => ({ ...b, [appealId]: true }))
    try {
      await reviewAppeal(appealId, { action, note: reviewNote[appealId] || '' })
      setAppeals(prev => prev.map(a =>
        a.id === appealId ? { ...a, status: action === 'approve' ? 'approved' : 'rejected', admin_note: reviewNote[appealId] || '' } : a
      ))
      onCountChange?.(appeals.filter(a => a.status === 'pending' && a.id !== appealId).length)
      setReviewOpen(r => ({ ...r, [appealId]: false }))
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(b => ({ ...b, [appealId]: false }))
    }
  }

  const filtered = filter === 'all' ? appeals : appeals.filter(a => a.status === filter)

  const STATUS_STYLES = {
    pending:  { bg: 'bg-amber-50 text-amber-700 border border-amber-200',    label: 'Đang chờ' },
    approved: { bg: 'bg-emerald-50 text-emerald-700 border border-emerald-200', label: 'Đã chấp thuận' },
    rejected: { bg: 'bg-red-50 text-red-700 border border-red-200',            label: 'Đã từ chối' },
  }

  if (loading) return (
    <div className="flex justify-center items-center py-20">
      <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="space-y-6">
      {error && (
        <div className="px-4 py-3 rounded-xl bg-red-50 border border-red-200 font-paragraph text-sm text-red-600">{error}</div>
      )}

      {/* Filter bar */}
      <div className="flex items-center gap-3 flex-wrap">
        {[
          { id: 'all',      label: 'Tất cả',        count: appeals.length },
          { id: 'pending',  label: 'Chờ xét duyệt', count: appeals.filter(a => a.status === 'pending').length },
          { id: 'approved', label: 'Đã chấp thuận', count: appeals.filter(a => a.status === 'approved').length },
          { id: 'rejected', label: 'Đã từ chối',    count: appeals.filter(a => a.status === 'rejected').length },
        ].map(f => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-heading transition-all
              ${filter === f.id ? 'bg-teal-gradient text-white shadow-btn' : 'bg-white text-muted-foreground hover:text-foreground border border-teal-100 shadow-soft'}`}
          >
            {f.label}
            {f.count > 0 && (
              <span className={`text-xs font-bold px-1.5 py-0.5 rounded-full ${filter === f.id ? 'bg-white/20 text-white' : 'bg-primary text-white'}`}>
                {f.count}
              </span>
            )}
          </button>
        ))}
        <button onClick={load} className="ml-auto flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-teal-100 text-sm text-muted-foreground hover:text-primary shadow-soft transition-colors">
          <RefreshCw className="h-3.5 w-3.5" /> Làm mới
        </button>
      </div>

      {/* Empty state */}
      {filtered.length === 0 && (
        <div className="text-center py-20 text-muted-foreground font-paragraph">
          <MessageSquareWarning className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">Không có khiếu nại nào</p>
        </div>
      )}

      {/* Appeal cards */}
      <div className="space-y-4">
        {filtered.map(appeal => {
          const st = STATUS_STYLES[appeal.status] || STATUS_STYLES.pending
          const isPending = appeal.status === 'pending'
          const isOpen = reviewOpen[appeal.id]

          return (
            <div key={appeal.id} className="bg-white border border-teal-100 rounded-2xl overflow-hidden shadow-soft hover:shadow-card transition-all">
              <div className="p-6 space-y-4">
                {/* Header */}
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    {appeal.avatar_url ? (
                      <img src={appeal.avatar_url} className="w-10 h-10 rounded-full object-cover" alt="" />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <UserCircle className="h-5 w-5 text-primary" />
                      </div>
                    )}
                    <div>
                      <p className="font-heading font-semibold text-sm text-foreground">{appeal.username}</p>
                      <p className="font-paragraph text-xs text-muted-foreground">{appeal.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`text-xs font-heading font-semibold px-3 py-1 rounded-full uppercase tracking-wide ${st.bg}`}>{st.label}</span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(appeal.created_at).toLocaleDateString('vi-VN')}
                    </span>
                  </div>
                </div>

                {/* Ban info */}
                <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-red-50 border border-red-100">
                  <Ban className="h-3.5 w-3.5 text-red-500 shrink-0" />
                  <p className="font-paragraph text-xs text-red-700">
                    {appeal.ban_until
                      ? <>Bị khóa đến <span className="font-semibold">{new Date(appeal.ban_until).toLocaleDateString('vi-VN')}</span></>
                      : 'Bị khóa vĩnh viễn'}
                  </p>
                </div>

                {/* Reason */}
                <div>
                  <p className="font-heading text-xs uppercase tracking-widest text-muted-foreground mb-1.5">Nội dung khiếu nại</p>
                  <p className="font-paragraph text-sm text-foreground leading-relaxed whitespace-pre-wrap">{appeal.reason}</p>
                </div>

                {/* Admin note nếu đã xử lý */}
                {appeal.admin_note && (
                  <div className="px-4 py-3 rounded-xl bg-blue-50 border border-blue-100">
                    <p className="font-heading text-xs uppercase tracking-widest text-blue-600 mb-1">Phản hồi Admin</p>
                    <p className="font-paragraph text-sm text-blue-800">{appeal.admin_note}</p>
                  </div>
                )}

                {/* Actions */}
                {isPending && (
                  <div>
                    {!isOpen ? (
                      <button
                        onClick={() => setReviewOpen(r => ({ ...r, [appeal.id]: true }))}
                        className="px-5 py-2.5 rounded-xl bg-primary text-primary-foreground font-heading text-xs uppercase tracking-widest hover:opacity-90 transition-opacity shadow-btn"
                      >
                        Xem xét khiếu nại
                      </button>
                    ) : (
                      <div className="space-y-3 pt-2 border-t border-teal-100">
                        <div className="space-y-1.5">
                          <label className="font-heading text-xs uppercase tracking-widest text-muted-foreground">
                            Ghi chú phản hồi (tuỳ chọn)
                          </label>
                          <textarea
                            value={reviewNote[appeal.id] || ''}
                            onChange={e => setReviewNote(n => ({ ...n, [appeal.id]: e.target.value }))}
                            placeholder="Nhập lý do chấp thuận hoặc từ chối..."
                            rows={3}
                            className="w-full rounded-xl border border-teal-100 bg-surface font-paragraph text-sm px-4 py-3 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
                          />
                        </div>
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => handleReview(appeal.id, 'approve')}
                            disabled={busy[appeal.id]}
                            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-green-600 text-white font-heading text-xs uppercase tracking-widest hover:bg-green-700 transition-colors disabled:opacity-60"
                          >
                            <ThumbsUp className="h-3.5 w-3.5" />
                            {busy[appeal.id] ? 'Đang xử lý...' : 'Chấp thuận & Gỡ ban'}
                          </button>
                          <button
                            onClick={() => handleReview(appeal.id, 'reject')}
                            disabled={busy[appeal.id]}
                            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-red-600 text-white font-heading text-xs uppercase tracking-widest hover:bg-red-700 transition-colors disabled:opacity-60"
                          >
                            <ThumbsDown className="h-3.5 w-3.5" />
                            {busy[appeal.id] ? 'Đang xử lý...' : 'Từ chối'}
                          </button>
                          <button
                            onClick={() => setReviewOpen(r => ({ ...r, [appeal.id]: false }))}
                            className="px-4 py-2.5 rounded-xl border border-teal-100 text-muted-foreground font-heading text-xs uppercase tracking-widest hover:text-foreground transition-colors"
                          >
                            Huỷ
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════
// MAIN
// ══════════════════════════════════════════════════════════
  export default function AdminPage() {
    const { currentUser, logout, isLoading } = useAuth()
    const navigate = useNavigate()

    const [activeTab, setActiveTab] = useState('moderation')
    const [stats, setStats] = useState({
      pending: 0,
      approved: 0,
      rejected: 0,
      total: 0
    })
    const [reportCount, setReportCount] = useState(0)  // ← THÊM
    const [userCount, setUserCount]     = useState(0)  // ← THÊM
    const [appealCount, setAppealCount] = useState(0)  // ← THÊM

    const handleListingsLoaded = useCallback((listings) => {
      setStats({
        pending:  listings.filter(l => l.status === 'pending').length,
        approved: listings.filter(l => l.status === 'approved').length,
        rejected: listings.filter(l => l.status === 'rejected').length,
        total:    listings.length,
      })
    }, [])

    useEffect(() => {
      getReports()
        .then(data => setReportCount(data.filter(r => r.status !== 'resolved').length))
        .catch(() => {})
      getAppeals()
        .then(data => setAppealCount(data.filter(a => a.status === 'pending').length))
        .catch(() => {})
      adminGetUsers()
        .then(data => setUserCount(data.length))
        .catch(() => {})
      adminGetListings({ limit: 200 })
        .then(data => setStats({
          pending:  data.filter(l => l.status === 'pending').length,
          approved: data.filter(l => l.status === 'approved').length,
          rejected: data.filter(l => l.status === 'rejected').length,
          total:    data.length,
        }))
        .catch(() => {})
    }, [])

    useEffect(() => {
      if (isLoading) return

      if (!currentUser) {
        navigate('/')
        return
      }

      if (currentUser.role !== 'admin') {
        navigate('/')
        return
      }
    }, [currentUser, isLoading, navigate])

    if (isLoading) {
      return null
    }

    if (!currentUser || currentUser.role !== 'admin') {
      return null
    }


  const TABS = [
    { id: 'moderation', label: 'Kiểm duyệt', icon: FileText,              badge: stats.pending },
    { id: 'reports',    label: 'Báo cáo',     icon: AlertTriangle,         badge: reportCount   },
    { id: 'appeals',    label: 'Khiếu nại',   icon: MessageSquareWarning,  badge: appealCount   },
    { id: 'users',      label: 'Người dùng',  icon: Users,                 badge: userCount     },
    ]

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-teal-100 bg-background sticky top-0 z-50 shadow-soft">
        <div className="max-w-[120rem] mx-auto px-6 md:px-12 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/" className="font-heading text-xl uppercase text-foreground hover:text-primary transition-colors">Bookycle</Link>
            <span className="text-secondary font-paragraph">/</span>
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              <span className="font-heading text-sm uppercase tracking-widest text-primary">Admin</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="font-paragraph text-sm text-muted-foreground hidden md:block">
              {currentUser.username}
            </span>

            {/* Nút về trang người dùng */}
            <Link
              to="/"
              className="
                flex items-center gap-2
                px-4 py-2.5 rounded-xl
                bg-primary/10 border border-primary/20
                text-primary
                font-heading text-xs uppercase tracking-widest
                hover:bg-primary hover:text-primary-foreground
                hover:border-primary
                transition-all duration-200
                shadow-soft hover:shadow-card
              "
            >
              <ExternalLink className="h-4 w-4" />
              Về trang người dùng
            </Link>

            {/* Logout */}
            <button
              onClick={() => { logout(); navigate('/') }}
              className="
                flex items-center gap-2
                px-4 py-2.5 rounded-xl
                bg-primary/10 border border-primary/20
                text-primary
                font-heading text-xs uppercase tracking-widest
                hover:bg-primary hover:text-primary-foreground
                hover:border-primary
                transition-all duration-200
                shadow-soft hover:shadow-card
              "
            >
              <LogOut className="h-4 w-4" />
              Đăng xuất
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-[120rem] mx-auto px-6 md:px-12 py-10">
        <div className="mb-8">
          <div className="inline-flex items-center gap-2 bg-teal-50 text-primary px-3 py-1.5 rounded-full border border-teal-200 text-xs font-heading font-semibold uppercase tracking-wide mb-3">
            <Shield className="w-3.5 h-3.5" />
            Quản trị hệ thống
          </div>
          <h1 className="font-heading text-4xl md:text-5xl font-black tracking-tighter text-foreground">ADMIN PANEL</h1>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
          <StatCard icon={Clock}       label="Chờ duyệt"     value={stats.pending}  accent={stats.pending > 0} />
          <StatCard icon={CheckCircle} label="Đã duyệt"      value={stats.approved} />
          <StatCard icon={XCircle}     label="Từ chối"       value={stats.rejected} />
          <StatCard icon={BarChart3}   label="Tổng bài đăng" value={stats.total} />
        </div>

        <div className="flex gap-1.5 flex-wrap mb-8 p-1.5 bg-white rounded-2xl border border-teal-100 shadow-soft w-fit">
          {TABS.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-heading text-sm font-semibold transition-all ${
                activeTab === tab.id ? 'bg-teal-gradient text-white shadow-btn' : 'text-muted-foreground hover:text-foreground hover:bg-surface'
              }`}>
              <tab.icon className="h-4 w-4" />
              {tab.label}
              {tab.badge > 0 && (
                <span className={`px-1.5 py-0.5 text-[10px] font-bold rounded-full ${
                  activeTab === tab.id ? 'bg-white/20 text-white' : 'bg-primary text-white'
                }`}>
                  {tab.badge}
                </span>
              )}
            </button>
          ))}
        </div>

        {activeTab === 'moderation' && (<ModerationTab onStatsChange={handleListingsLoaded}/>)}
        {activeTab === 'reports' && (<ReportTab />)}
        {activeTab === 'appeals' && (<AppealTab onCountChange={setAppealCount} />)}
        {activeTab === 'users' && (<UsersTab />)}
      </div>
    </div>
  )
}