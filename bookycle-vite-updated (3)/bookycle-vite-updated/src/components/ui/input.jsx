import { forwardRef } from 'react'
import { cn } from '@/lib/utils'

export const Input = forwardRef(function Input({ className, type = 'text', ...props }, ref) {
  return (
    <input
      ref={ref}
      type={type}
      className={cn(
        'flex w-full border border-secondary bg-transparent px-3 py-2 text-sm font-paragraph text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:border-primary disabled:cursor-not-allowed disabled:opacity-50',
        className
      )}
      {...props}
    />
  )
})

Input.displayName = 'Input'
