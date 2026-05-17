import { createBrowserRouter, RouterProvider, Navigate, Outlet } from 'react-router-dom'
import { ScrollToTop } from '@/lib/scroll-to-top'
import HomePage from '@/components/pages/HomePage'
import ListingDetailPage from '@/components/pages/ListingDetailPage'
import CreateListingPage from '@/components/pages/CreateListingPage'
import MessagesPage from '@/components/pages/MessagesPage'
import AccountPage from '@/components/pages/AccountPage'
import AdminPage from '@/components/pages/AdminPage'
import { Home } from 'lucide-react'

function Layout() {
  return (
    <>
      <ScrollToTop />
      <Outlet />
    </>
  )
}

function ErrorPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center">
        <h1 className="font-heading text-6xl text-foreground uppercase mb-4">404</h1>
        <p className="font-paragraph text-muted-foreground mb-8">Trang không tồn tại.</p>
        <a href="/" className="font-heading text-primary uppercase tracking-widest text-sm hover:text-foreground transition-colors">← Về trang chủ</a>
      </div>
    </div>
  )
}

const router = createBrowserRouter([
  {
    path: '/',
    element: <Layout />,
    errorElement: <ErrorPage />,
    children: [
      { index: true, element: <HomePage /> },
      {path: 'listings', element: <HomePage />},
      { path: 'listings/:id', element: <ListingDetailPage /> },
      { path: 'dang-ban', element: <CreateListingPage /> },
      { path: 'tin-nhan', element: <MessagesPage /> },
      { path: 'tai-khoan', element: <AccountPage /> },
      { path: 'admin', element: <AdminPage /> },
      { path: '*', element: <Navigate to="/" replace /> },
    ],
  },
])

export default function AppRouter() {
  return <RouterProvider router={router} />
}