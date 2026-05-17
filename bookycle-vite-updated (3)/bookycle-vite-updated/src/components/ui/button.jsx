import { forwardRef } from 'react'
import { cn } from '@/lib/utils'

const buttonVariants = {
  default: 'bg-primary text-primary-foreground hover:bg-primary/90',
  destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
  outline: 'border border-secondary bg-transparent hover:border-primary hover:text-primary',
  secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
  ghost: 'hover:bg-muted hover:text-foreground',
  link: 'text-primary underline-offset-4 hover:underline',
}

const buttonSizes = {
  default: 'h-10 px-4 py-2',
  sm: 'h-9 px-3 text-sm',
  lg: 'h-11 px-8',
  icon: 'h-10 w-10',
}

export const Button = forwardRef(function Button(
  { className, variant = 'default', size = 'default', children, ...props },
  ref
) {
  return (
    <button
      ref={ref}
      className={cn(
        'inline-flex items-center justify-center whitespace-nowrap font-paragraph text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50',
        buttonVariants[variant] || buttonVariants.default,
        buttonSizes[size] || buttonSizes.default,
        className
      )}
      {...props}
    >
      {children}
    </button>
  )
})

Button.displayName = 'Button'
