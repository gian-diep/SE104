// ── Danh sách từ cấm ─────────────────────────────────────────────────────────

const BAD_WORDS = [
  // Tục tĩu / nhạy cảm (tiếng Việt)
  'đéo', 'địt', 'lồn', 'cặc', 'buồi', 'chịch', 'đụ', 'má mày', 'con chó',
  'đồ chó', 'óc chó', 'ngu vl', 'ngu vcl', 'vãi lồn', 'vãi',
  'vcl', 'đmm', 'đmcs', 'clm', 'clgt',
  // Tục tĩu (tiếng Anh)
  'fuck', 'shit', 'bitch', 'asshole', 'bastard', 'dick', 'pussy', 'cock',

  'kiếm tiền online', 'làm giàu nhanh', 'thu nhập khủng',
  // Không liên quan tài liệu học
  'bán quần áo', 'bán giày', 'bán mỹ phẩm', 'bán điện thoại',
  'bán xe', 'bán nhà', 'cho thuê', 'dịch vụ',
  'escort', 'massage', 'dịch vụ người lớn',
  'cờ bạc', 'cá độ', 'cá cược', 'lô đề', 'xổ số',
]

// Normalize: bỏ dấu, lowercase, bỏ ký tự đặc biệt giữa chữ
function normalize(str) {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')   // bỏ dấu tiếng Việt
    .replace(/[^a-z0-9\s]/g, ' ')      // ký tự đặc biệt → space
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Kiểm tra nội dung bài đăng
 * @param {{ item_name, item_description, keywords, subject, university }} fields
 * @returns {{ ok: boolean, violations: string[] }}
 */
export function checkContent(fields) {
  const combined = [
    fields.item_name        || '',
    fields.item_description || '',
    fields.keywords         || '',
    fields.subject          || '',
  ].join(' ')

  const normalized = normalize(combined)
  const violations = BAD_WORDS.filter(word => normalized.includes(normalize(word)))

  return {
    ok: violations.length === 0,
    violations,
  }
}