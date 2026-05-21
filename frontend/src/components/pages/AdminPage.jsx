import { useState, useEffect, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Shield, CheckCircle, XCircle, Clock, Users, FileText,
  AlertTriangle, Eye, LogOut, BarChart3,
  Ban, Trash2, Star, RefreshCw, Search,
  BookOpen, ClipboardList, Banknote, User, Flag, ExternalLink,
  UserCircle, UserX
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useAuth } from '@/context/AuthContext'
import { API_URL } from '@/lib/Api'
import {
  adminGetListings, adminApproveListing, adminRejectListing, adminDeleteListing,
  adminGetUsers, adminBanUser, adminUnbanUser, adminDeleteUser, adminGetReports
} from '@/lib/Adminapi'
import {
  getReports,
  resolveReport,
} from '@/lib/Reportapi'

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
    <div className={`border p-6 flex items-center gap-5 ${accent ? 'border-primary bg-primary/5' : 'border-secondary'}`}>
      <div className={`w-12 h-12 flex items-center justify-center ${accent ? 'bg-primary/15' : 'bg-secondary/40'}`}>
        <Icon className={`w-6 h-6 ${accent ? 'text-primary' : 'text-muted-foreground'}`} />
      </div>
      <div>
        <p className="font-paragraph text-xs text-muted-foreground uppercase tracking-widest mb-1">{label}</p>
        <p className="font-heading text-3xl text-foreground">{value}</p>
      </div>
    </div>
  )
}

function Badge({ status }) {
  const map = {
    pending:  { label: 'Chờ duyệt',  cls: 'text-amber-600 bg-amber-500/10 border-amber-500/30' },
    approved: { label: 'Đã duyệt',   cls: 'text-green-600 bg-green-500/10 border-green-500/30' },
    rejected: { label: 'Từ chối',    cls: 'text-red-500 bg-red-500/10 border-red-500/30' },
    user:     { label: 'Bình thường', cls: 'text-green-600 bg-green-500/10 border-green-500/30' },
    banned:   { label: 'Đã ban',     cls: 'text-red-600 bg-red-500/10 border-red-500/30' },
  }
  const { label, cls } = map[status] ?? { label: status, cls: 'border-secondary text-muted-foreground' }
  return (
    <span className={`font-heading text-[10px] uppercase tracking-widest px-2 py-1 border ${cls}`}>
      {label}
    </span>
  )
}

function Skeleton() {
  return (
    <div className="space-y-3">
      {[1, 2, 3].map(i => (
        <div key={i} className="border border-secondary p-5 animate-pulse">
          <div className="h-4 bg-secondary/40 rounded w-1/3 mb-2" />
          <div className="h-3 bg-secondary/30 rounded w-1/2" />
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
      <div className="flex flex-wrap border-b border-secondary mb-6">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setFilter(t.id)}
            className={`px-5 py-3 font-heading text-xs uppercase tracking-widest transition-colors flex items-center gap-2
              ${filter === t.id ? 'text-primary border-b-2 border-primary' : 'text-muted-foreground hover:text-foreground'}`}>
            {t.label}
            {t.count > 0 && (
              <span className={`px-2 py-0.5 text-[10px] font-bold rounded-sm
                ${filter === t.id ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground'}`}>
                {t.count}
              </span>
            )}
          </button>
        ))}
        <button onClick={load} className="ml-auto p-3 text-muted-foreground hover:text-primary transition-colors" title="Làm mới">
          <RefreshCw className="h-4 w-4" />
        </button>
      </div>

      <div className="relative mb-6 max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Tìm tên tài liệu, môn học..."
          className="pl-10 h-10 rounded-none border-secondary bg-transparent font-paragraph text-sm" />
      </div>

      {error && (
        <div className="mb-4 px-4 py-3 bg-red-500/10 border border-red-500/30 font-paragraph text-sm text-red-500">
          {error} — <button onClick={load} className="underline">Thử lại</button>
        </div>
      )}

      {loading ? <Skeleton /> : visible.length === 0 ? (
        <div className="py-20 flex flex-col items-center justify-center border border-dashed border-secondary text-center">
          <FileText className="h-10 w-10 text-muted-foreground mb-4 opacity-30" />
          <p className="font-heading text-lg uppercase text-muted-foreground">Không có bài đăng nào</p>
        </div>
      ) : (
        <div className="space-y-4">
          {visible.map(listing => {
            const thumb = listing.images?.[0]
            const isBusy = busy[listing.id]
            return (
              <div key={listing.id} className="border border-secondary hover:border-primary/40 transition-colors">
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
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 border border-secondary bg-secondary/20">
                          <BookOpen className="h-3 w-3" />{listing.subject}
                        </span>
                      )}
                      {listing.condition && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 border border-secondary bg-secondary/20">
                          <ClipboardList className="h-3 w-3" />{listing.condition}
                        </span>
                      )}
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 border border-secondary bg-secondary/20">
                        <Banknote className="h-3 w-3" />{fmtPrice(listing.item_price)}
                      </span>
                    </div>
                    {listing.item_description && (
                      <p className="font-paragraph text-xs text-muted-foreground line-clamp-2">{listing.item_description}</p>
                    )}
                  </div>

                  <div className="col-span-12 md:col-span-3 border-t md:border-t-0 md:border-l border-secondary flex flex-col">
                    <Link to={`/admin/listings/${listing.id}`} 
                      className="flex items-center gap-2 px-4 py-3 font-heading text-xs uppercase tracking-widest text-muted-foreground hover:text-primary hover:bg-primary/5 transition-colors border-b border-secondary">
                      <Eye className="h-3.5 w-3.5" />Xem bài
                    </Link>

                    {listing.status === 'pending' && (
                      <>
                        <button onClick={() => approve(listing.id)} disabled={isBusy}
                          className="flex items-center gap-2 px-4 py-3 font-heading text-xs uppercase tracking-widest text-green-600 hover:bg-green-500/10 transition-colors border-b border-secondary disabled:opacity-50">
                          <CheckCircle className="h-3.5 w-3.5" />{isBusy ? 'Đang xử lý...' : 'Duyệt bài'}
                        </button>

                        {rejectOpen[listing.id] ? (
                          <div className="p-3 border-b border-secondary space-y-2">
                            <textarea
                              placeholder="Lý do từ chối *"
                              value={rejectReason[listing.id] || ''}
                              onChange={e => setRejectReason(p => ({ ...p, [listing.id]: e.target.value }))}
                              rows={2}
                              className="w-full text-xs font-paragraph border border-secondary bg-transparent px-2 py-1.5 resize-none focus:outline-none focus:ring-1 focus:ring-red-500/50 text-foreground" />
                            <div className="flex gap-2">
                              <button onClick={() => reject(listing.id)} disabled={isBusy}
                                className="flex-1 py-1.5 bg-red-500 text-white font-heading text-[10px] uppercase tracking-widest hover:bg-red-600 transition-colors disabled:opacity-50">
                                Xác nhận
                              </button>
                              <button onClick={() => setRejectOpen(p => ({ ...p, [listing.id]: false }))}
                                className="px-3 py-1.5 border border-secondary font-heading text-[10px] uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors">
                                Hủy
                              </button>
                            </div>
                          </div>
                        ) : (
                          <button onClick={() => setRejectOpen(p => ({ ...p, [listing.id]: true }))}
                            className="flex items-center gap-2 px-4 py-3 font-heading text-xs uppercase tracking-widest text-red-500 hover:bg-red-500/10 transition-colors border-b border-secondary">
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
                      className="flex items-center gap-2 px-4 py-3 font-heading text-xs uppercase tracking-widest text-muted-foreground hover:text-red-500 hover:bg-red-500/10 transition-colors disabled:opacity-50">
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
                    📝
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
function ReportCard({ report, onResolve }) {
  const resolved = report.status === 'resolved'
  const rating = Number(report.reported_user_rating ?? 0)
  const isHighRisk = rating < 2 && !resolved
 
  return (
    <div
      className={`
        relative overflow-hidden border transition-all duration-200
        ${resolved
          ? 'border-secondary opacity-60'
          : isHighRisk
            ? 'border-red-500/40 bg-red-500/[0.03]'
            : 'border-secondary hover:border-primary/30'
        }
      `}
    >
      {/* High-risk accent bar */}
      {isHighRisk && (
        <div className="absolute left-0 top-0 bottom-0 w-1 bg-red-500" />
      )}
 
      <div className="p-5 pl-6">
        {/* Header row */}
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="flex items-start gap-3 min-w-0">
            {/* Flag icon */}
            <div
              className={`
                mt-0.5 w-8 h-8 flex-shrink-0 flex items-center justify-center rounded-sm
                ${isHighRisk && !resolved
                  ? 'bg-red-500/15 text-red-500'
                  : 'bg-secondary/60 text-muted-foreground'
                }
              `}
            >
              <Flag className="w-4 h-4" />
            </div>
 
            <div className="min-w-0">
              {/* Reason + detail label */}
              <div className="mb-1">
                <span className="text-[10px] font-heading uppercase tracking-widest text-muted-foreground mr-2">
                  Lý do:
                </span>
                <span className="font-heading text-sm uppercase tracking-wide text-foreground leading-snug">
                  {report.reason}
                </span>
              </div>
 
              {/* Reported user */}
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs text-muted-foreground">
                  Người bị report:
                </span>
                <span className="text-xs font-medium text-foreground">
                  {report.reported_username}
                </span>
                <span className="text-muted-foreground/40 text-xs">·</span>
                <RatingStars value={rating} />
              </div>
            </div>
          </div>
 
          {/* Status pill */}
          <div className="flex-shrink-0">
            <ReportStatusPill resolved={resolved} />
          </div>
        </div>
 
        {/* Divider */}
        <div className="border-t border-secondary/60 mb-4" />
        {/* Divider */}
        <div className="border-t border-secondary/60 mb-4" />

        {/* Report detail */}
        {report.detail && (
          <div className="mb-4">
            <p className="text-[11px] font-heading uppercase tracking-widest text-muted-foreground mb-2">
              Nội dung báo cáo
            </p>

            <div className="border border-secondary bg-secondary/10 px-4 py-3">
              <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                {report.detail}
              </p>
            </div>
          </div>
        )}
        
        {/* Action row */}
        <div className="flex items-center gap-2 flex-wrap">
          {report.listing_id && (
            <Link
              to={`/listings/${report.listing_id}`}
              target="_blank"
              className="
                inline-flex items-center gap-1.5
                px-3 py-1.5 border border-secondary
                text-[11px] font-heading uppercase tracking-widest
                text-muted-foreground hover:text-foreground hover:border-foreground/30
                transition-colors duration-150
              "
            >
              <ExternalLink className="w-3 h-3" />
              Xem bài đăng
            </Link>
          )}
 
          <Link
            to={`/nguoi-dung/${report.reported_user_id}`}
            target="_blank"
            className="
              inline-flex items-center gap-1.5
              px-3 py-1.5 border border-secondary
              text-[11px] font-heading uppercase tracking-widest
              text-muted-foreground hover:text-foreground hover:border-foreground/30
              transition-colors duration-150
            "
          >
            <UserCircle className="w-3 h-3" />
            Xem tài khoản
          </Link>
 
          {!resolved && (
            <button
              onClick={() => onResolve(report.id)}
              className="
                ml-auto inline-flex items-center gap-1.5
                px-3 py-1.5
                border border-green-500/40 bg-green-500/5
                text-[11px] font-heading uppercase tracking-widest text-green-600
                hover:bg-green-500/10 hover:border-green-500/60
                transition-all duration-150
              "
            >
              <CheckCircle className="w-3 h-3" />
              Đánh dấu xử lý
            </button>
          )}
        </div>
      </div>
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
        <div className="flex items-center gap-1 border border-secondary p-0.5">
          {[
            { id: 'all', label: 'Tất cả' },
            { id: 'pending', label: 'Chờ xử lý' },
            { id: 'resolved', label: 'Đã xử lý' },
          ].map(f => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={`
                px-4 py-1.5 text-[11px] font-heading uppercase tracking-widest transition-colors duration-150
                ${filter === f.id
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground'
                }
              `}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>
 
      {/* Report list */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3 text-muted-foreground border border-dashed border-secondary">
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
            className="pl-10 h-10 rounded-none border-secondary bg-transparent font-paragraph text-sm" />
        </div>
        <button onClick={load} className="p-2 text-muted-foreground hover:text-primary transition-colors" title="Làm mới">
          <RefreshCw className="h-4 w-4" />
        </button>
      </div>

      {error && (
        <div className="mb-4 px-4 py-3 bg-red-500/10 border border-red-500/30 font-paragraph text-sm text-red-500">
          {error} — <button onClick={load} className="underline">Thử lại</button>
        </div>
      )}

      <div className="border border-secondary">
        <div className="hidden md:grid grid-cols-12 gap-0 border-b border-secondary bg-secondary/20 px-4 py-3">
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
              className={`grid grid-cols-12 gap-0 px-4 py-4 items-center ${i < filtered.length - 1 ? 'border-b border-secondary' : ''} hover:bg-secondary/10 transition-colors`}>
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
                <Link
                  to={`/nguoi-dung/${user.id}`}
                  target="_blank"
                  title="Xem hồ sơ"
                  className="p-2 text-muted-foreground hover:text-primary transition-colors"
                >
                  <UserCircle className="h-4 w-4" />
                </Link>
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

                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white shadow-sm text-xl">
                    👤
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
                <p className="text-xs leading-relaxed text-amber-800">
                  ⚠️ Hành động này không thể hoàn tác và toàn bộ dữ liệu liên quan có thể bị mất.
                </p>
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
    { id: 'moderation', label: 'Kiểm duyệt', icon: FileText,      badge: stats.pending },
    { id: 'reports',    label: 'Báo cáo',     icon: AlertTriangle, badge: reportCount   },
    { id: 'users',      label: 'Người dùng',  icon: Users,         badge: userCount     },
    ]

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-secondary bg-background sticky top-0 z-50">
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
        <div className="mb-10 pb-8 border-b border-secondary">
          <p className="font-heading text-xs uppercase tracking-widest text-muted-foreground mb-3">[ Quản trị hệ thống ]</p>
          <h1 className="font-heading text-5xl md:text-6xl uppercase tracking-tighter">Admin Panel</h1>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
          <StatCard icon={Clock}       label="Chờ duyệt"     value={stats.pending}  accent={stats.pending > 0} />
          <StatCard icon={CheckCircle} label="Đã duyệt"      value={stats.approved} />
          <StatCard icon={XCircle}     label="Từ chối"       value={stats.rejected} />
          <StatCard icon={BarChart3}   label="Tổng bài đăng" value={stats.total} />
        </div>

        <div className="flex border-b border-secondary mb-8">
          {TABS.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-6 py-4 font-heading text-sm uppercase tracking-widest transition-colors
                ${activeTab === tab.id ? 'text-primary border-b-2 border-primary' : 'text-muted-foreground hover:text-foreground'}`}>
              <tab.icon className="h-4 w-4" />
              {tab.label}
              {tab.badge > 0 && (
                <span className={`px-2 py-0.5 text-[10px] font-bold rounded-sm
                  ${activeTab === tab.id ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground'}`}>
                  {tab.badge}
                </span>
              )}
            </button>
          ))}
        </div>

        {activeTab === 'moderation' && (<ModerationTab onStatsChange={handleListingsLoaded}/>)}
        {activeTab === 'reports' && (<ReportTab />)}
        {activeTab === 'users' && (<UsersTab />)}
      </div>
    </div>
  )
}