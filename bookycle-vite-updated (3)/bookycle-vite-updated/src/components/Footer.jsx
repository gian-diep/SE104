import { BookOpen, Mail } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import AuthModal from '@/components/modals/AuthModal'
import { Image } from '@/components/ui/image'
import logo from '@/logo.png'

export default function Footer() {
  return (
    <footer className="w-full bg-background border-t border-secondary">
      <div className="max-w-[100rem] mx-auto px-6 md:px-[80px] py-[80px]">
        <div className="grid grid-cols-12 gap-[48px]">
          <div className="col-span-12 lg:col-span-4">
            <div className="flex items-center gap-[12px] mb-[24px]">
              <Image src={logo} alt="BookCycle Logo" className="w-9 h-9 object-contain"/>
              <span className="font-heading text-2xl text-foreground font-bold uppercase">
                Bookycle
              </span>
            </div>
          </div>

          <div className="col-span-12 sm:col-span-6 lg:col-span-4">
            <h3 className="font-heading text-lg text-foreground font-semibold mb-[24px] uppercase">
              Truy cập nhanh
            </h3>
            <ul className="space-y-[16px]">
              <li>
                <a
                  href="/#search"
                  className="font-paragraph text-base text-muted-foreground hover:text-primary transition-colors duration-200"
                >
                  Tìm kiếm tài liệu
                </a>
              </li>
              <li>
                <Link
                  to="/login"
                  className="font-paragraph text-base text-muted-foreground hover:text-primary transition-colors duration-200"
                >
                  Đăng nhập
                </Link>
              </li>
            </ul>
          </div>

          <div className="col-span-12 sm:col-span-6 lg:col-span-4">
            <h3 className="font-heading text-lg text-foreground font-semibold mb-[24px] uppercase">
              Contact
            </h3>
            <div className="flex items-center gap-[12px] mb-[16px]">
              <Mail className="h-5 w-5 text-primary" />
              <a
                href="mailto:info@bookycle.com"
                className="font-paragraph text-base text-muted-foreground hover:text-primary transition-colors duration-200"
              >
                info@bookycle.com
              </a>
            </div>
          </div>
        </div>

        <div className="border-t border-secondary mt-[48px] pt-[32px]">
          <p className="font-paragraph text-sm text-muted-foreground text-center">
            © {new Date().getFullYear()} Bookycle. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  )
}
