import { useState, forwardRef } from 'react'
import { cn } from '@/lib/utils'

const FALLBACK_IMAGE_URL =
  'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=600&q=80'

export const Image = forwardRef(function Image(
  { src, alt, className, width, style, ...props },
  ref
) {
  const [imgSrc, setImgSrc] = useState(src)

  if (!src) {
    return <div ref={ref} className={cn('bg-muted', className)} style={style} {...props} />
  }

  return (
    <img
      ref={ref}
      src={imgSrc || FALLBACK_IMAGE_URL}
      alt={alt || ''}
      className={cn(className)}
      style={style}
      onError={() => setImgSrc(FALLBACK_IMAGE_URL)}
      {...props}
    />
  )
})

Image.displayName = 'Image'
