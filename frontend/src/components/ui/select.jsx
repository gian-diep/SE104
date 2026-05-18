/**
 * Native <select> styled to match Wix Vibe design. No Radix UI needed.
 * Same API as shadcn/ui Select so HomePage.jsx works unchanged.
 */
import { Children } from 'react'
import { cn } from '@/lib/utils'

function collectOptions(children) {
  const items = []
  Children.forEach(children, (child) => {
    if (!child) return
    if (child.type === SelectContent) {
      Children.forEach(child.props.children, (item) => {
        if (item && item.props?.value !== undefined) {
          items.push({ value: item.props.value, label: item.props.children })
        }
      })
    }
  })
  return items
}

export function Select({ value, onValueChange, children }) {
  const options = collectOptions(children)
  let placeholder = ''
  let triggerClass = ''
  Children.forEach(children, (child) => {
    if (!child) return
    if (child.type === SelectTrigger) {
      triggerClass = child.props.className || ''
      Children.forEach(child.props.children, (c) => {
        if (c && c.type === SelectValue) placeholder = c.props.placeholder || ''
      })
    }
  })
  return (
    <div className="relative w-full">
      <select
        value={value}
        onChange={(e) => onValueChange?.(e.target.value)}
        className={cn(
          'w-full appearance-none border border-secondary bg-transparent px-3 pr-8 font-paragraph text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer',
          triggerClass
        )}
      >
        {placeholder && <option value="" disabled hidden>{placeholder}</option>}
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
      <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
          <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>
    </div>
  )
}

export function SelectTrigger({ className, children }) { return null }
export function SelectValue({ placeholder }) { return null }
export function SelectContent({ className, children }) { return null }
export function SelectItem({ value, children, className }) { return null }
export function SelectGroup({ children }) { return children }
