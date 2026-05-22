"use client"

import * as React from 'react'
import { Drawer } from 'vaul'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

type SheetSide = 'left' | 'right' | 'top' | 'bottom'

interface SheetProps {
  children: React.ReactNode
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

const Sheet = ({ children, open, onOpenChange }: SheetProps) => (
  <Drawer.Root open={open} onOpenChange={onOpenChange} direction="right">
    {children}
  </Drawer.Root>
)

const SheetTrigger = Drawer.Trigger
const SheetClose = Drawer.Close
const SheetPortal = Drawer.Portal

const SheetOverlay = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <Drawer.Overlay
    ref={ref}
    className={cn('fixed inset-0 z-50 bg-black/50 backdrop-blur-sm', className)}
    {...props}
  />
))
SheetOverlay.displayName = 'SheetOverlay'

interface SheetContentProps extends React.HTMLAttributes<HTMLDivElement> {
  side?: SheetSide
}

const SheetContent = React.forwardRef<HTMLDivElement, SheetContentProps>(
  ({ side = 'right', className, children, ...props }, ref) => {
    const sideClasses: Record<SheetSide, string> = {
      right: 'inset-y-0 right-0 h-full w-[520px] border-l',
      left: 'inset-y-0 left-0 h-full w-[520px] border-r',
      top: 'inset-x-0 top-0 w-full border-b',
      bottom: 'inset-x-0 bottom-0 w-full border-t',
    }

    return (
      <SheetPortal>
        <SheetOverlay />
        <Drawer.Content
          ref={ref}
          className={cn(
            'fixed z-50 bg-white dark:bg-[hsl(var(--card))] border-[hsl(var(--border))] p-6 shadow-xl',
            'flex flex-col overflow-y-auto',
            sideClasses[side],
            className
          )}
          {...props}
        >
          <Drawer.Close className="absolute right-4 top-4 rounded-sm opacity-70 transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))]">
            <X className="h-4 w-4" />
            <span className="sr-only">Fechar</span>
          </Drawer.Close>
          {children}
        </Drawer.Content>
      </SheetPortal>
    )
  }
)
SheetContent.displayName = 'SheetContent'

const SheetHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('flex flex-col space-y-2 text-center sm:text-left mb-4', className)} {...props} />
)
SheetHeader.displayName = 'SheetHeader'

const SheetFooter = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn('flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2 mt-auto pt-4', className)}
    {...props}
  />
)
SheetFooter.displayName = 'SheetFooter'

const SheetTitle = React.forwardRef<HTMLHeadingElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h2
      ref={ref}
      className={cn('text-lg font-semibold text-[hsl(var(--foreground))]', className)}
      {...props}
    />
  )
)
SheetTitle.displayName = 'SheetTitle'

const SheetDescription = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => (
    <p
      ref={ref}
      className={cn('text-sm text-[hsl(var(--muted-foreground))]', className)}
      {...props}
    />
  )
)
SheetDescription.displayName = 'SheetDescription'

export {
  Sheet,
  SheetPortal,
  SheetOverlay,
  SheetTrigger,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetFooter,
  SheetTitle,
  SheetDescription,
}
