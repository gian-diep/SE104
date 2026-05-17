# BookCycle — Vite React JSX

Academic book marketplace. Converted from Wix Vibe (TSX) to Vite + React JSX thuần.

## Cài đặt & chạy

```bash
npm install
npm run dev
```

## Cấu trúc

```
src/
├── components/
│   ├── pages/
│   │   ├── HomePage.jsx          # Trang chủ: hero, manifesto, marketplace grid
│   │   └── ListingDetailPage.jsx # Trang chi tiết listing
│   ├── ui/
│   │   ├── button.jsx            # Button component (shadcn-style)
│   │   ├── image.jsx             # Image với fallback
│   │   ├── input.jsx             # Input component
│   │   ├── loading-spinner.jsx   # Loading spinner
│   │   └── select.jsx            # Select dropdown (Radix UI)
│   ├── Header.jsx
│   ├── Footer.jsx
│   └── Router.jsx
├── data/
│   └── listings.js               # ← THAY BẰNG API THỰC Ở ĐÂY
├── lib/
│   ├── utils.js                  # cn() helper
│   └── scroll-to-top.jsx
└── styles/
    └── global.css
```

## Kết nối backend

Toàn bộ data được abstract vào `src/data/listings.js`. Khi bạn có backend, chỉ cần sửa 2 hàm:

```js
// src/data/listings.js

export async function getListings({ limit = 50, skip = 0 } = {}) {
  // Thay bằng fetch của bạn:
  const res = await fetch(`/api/listings?limit=${limit}&skip=${skip}`)
  return res.json()
  // Expected shape: { items: [], hasNext: bool, nextSkip: number }
}

export async function getListingById(id) {
  // Thay bằng fetch của bạn:
  const res = await fetch(`/api/listings/${id}`)
  return res.json()
  // Expected shape: { _id, itemName, itemPrice, itemImage, ... }
}
```

## Schema listing

```js
{
  _id: string,
  itemName: string,
  itemPrice: number,        // 0 = Free
  itemImage: string,        // URL ảnh
  itemDescription: string,
  condition: string,        // 'Like New' | 'Very Good' | 'Good' | 'Fair'
  category: string,         // 'Textbook' | 'Equipment' | 'Supplies' | 'Book'
  subject: string,          // 'Mathematics' | 'Computer Science' | ...
  keywords: string,
  sellerContactEmail: string,
  transactionType: string,  // 'Sell' | 'Trade' | 'Free'
}
```

## Stack

- Vite + React 18
- Tailwind CSS (màu gốc giữ nguyên: primary #009688)
- Framer Motion (parallax hero, staggered grid, scroll animations)
- React Router v6
- Radix UI Select
- Lucide React icons
- Roboto font (Google Fonts)
