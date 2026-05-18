import { useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'

export function ScrollToTop() {
  const location = useLocation()
  const prevLocationRef = useRef(null)

  useEffect(() => {
    const isSamePage = prevLocationRef.current === location.pathname

    if (location.hash) {
      setTimeout(() => {
        const element = document.getElementById(location.hash.slice(1))
        if (element) {
          element.scrollIntoView({ behavior: 'smooth' })
        }
      }, 100)
    } else {
      window.scrollTo({
        top: 0,
        left: 0,
        behavior: isSamePage ? 'smooth' : 'auto',
      })
    }

    prevLocationRef.current = location.pathname
  }, [location])

  return null
}
