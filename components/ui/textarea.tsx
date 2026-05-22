import * as React from 'react'
import { cn } from '@/lib/utils'

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        className={cn(
          'flex min-h-[80px] w-full rounded-[var(--radius)] border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-3 py-2 text-sm shadow-sm',
          'placeholder:text-[hsl(var(--muted-foreground))]',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring))]',
          'disabled:cursor-not-allowed disabled:opacity-50',
          'resize-vertical',
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Textarea.displayName = 'Textarea'

export { Textarea }
