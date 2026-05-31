import { createBrowserRouter, RouterProvider, Navigate, Outlet } from 'react-router-dom'
import { ScrollToTop } from '@/lib/scroll-to-top'
import { lazy, Suspense } from 'react'
import { Home } from 'lucide-react'
import AuthModal from '@/components/modals/AuthModal'

// Lazy load tất cả pages — mỗi page chỉ tải khi user navigate tới
const HomePage          = lazy(() => import('@/components/pages/HomePage'))
const ListingDetailPage = lazy(() => import('@/components/pages/ListingDetailPage'))
const CreateListingPage = lazy(() => import('@/components/pages/CreateListingPage'))
const MessagesPage      = lazy(() => import('@/components/pages/MessagesPage'))
const AccountPage       = lazy(() => import('@/components/pages/AccountPage'))
const AdminPage         = lazy(() => import('@/components/pages/AdminPage'))
const UserProfilePage   = lazy(() => import('@/components/pages/UserProfilePage'))

function PageLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  )
}

function Layout() {
  return (
    <>
      <ScrollToTop />
      <Suspense fallback={<PageLoader />}>
        <Outlet />
      </Suspense>
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

function LoginPage() {
  return <AuthModal isOpen={true} defaultTab="login" onClose={() => window.history.back()} />
}

function RegisterPage() {
  return <AuthModal isOpen={true} defaultTab="register" onClose={() => window.history.back()} />
}

const router = createBrowserRouter([
  {
    path: '/',
    element: <Layout />,
    errorElement: <ErrorPage />,
    children: [
      { index: true, element: <HomePage /> },
      { path: 'listings', element: <HomePage /> },
      { path: 'listings/:id', element: <ListingDetailPage /> },
      { path: 'dang-ban', element: <CreateListingPage /> },
      { path: 'tin-nhan', element: <MessagesPage /> },
      { path: 'tai-khoan', element: <AccountPage /> },
      { path: 'admin', element: <AdminPage /> },
      { path: 'nguoi-dung/:id', element: <UserProfilePage /> },
      { path: 'login', element: <LoginPage /> },
      { path: 'register', element: <RegisterPage /> },
      { path: 'admin/listings/:id', element: <ListingDetailPage /> },
      { path: '*', element: <Navigate to="/" replace /> },
    ],
  },
])

export default function AppRouter() {
  return <RouterProvider router={router} />
}