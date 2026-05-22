"use client"

import * as React from 'react'
import * as TooltipPrimitive from '@radix-ui/react-tooltip'
import { cn } from '@/lib/utils'

const TooltipProvider = TooltipPrimitive.Provider
const Tooltip = TooltipPrimitive.Root
const TooltipTrigger = TooltipPrimitive.Trigger

const TooltipContent = React.forwardRef<
  React.ElementRef<typeof TooltipPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Content>
>(({ className, sideOffset = 6, ...props }, ref) => (
  <TooltipPrimitive.Portal>
    <TooltipPrimitive.Content
      ref={ref}
      sideOffset={sideOffset}
      className={cn(
        'z-[200] overflow-hidden rounded-md bg-[#18181B] px-2.5 py-1.5 text-[0.72rem] font-medium text-white shadow-[0_4px_12px_-2px_rgba(0,0,0,0.25)] border border-white/[0.06]',
        'animate-in fade-in-0 zoom-in-95',
        'data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95',
        'data-[side=bottom]:slide-in-from-top-1 data-[side=top]:slide-in-from-bottom-1',
        'data-[side=left]:slide-in-from-right-1 data-[side=right]:slide-in-from-left-1',
        className
      )}
      {...props}
    />
  </TooltipPrimitive.Portal>
))
TooltipContent.displayName = TooltipPrimitive.Content.displayName

/**
 * Wrapper conveniente para tooltips em ícones-só.
 * Uso: <IconTooltip label="Notificações" side="bottom"><BtnTrigger /></IconTooltip>
 */
interface IconTooltipProps {
  label: string
  children: React.ReactNode
  side?: 'top' | 'right' | 'bottom' | 'left'
  shortcut?: string
}

function IconTooltip({ label, children, side = 'bottom', shortcut }: IconTooltipProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent side={side}>
        <span className="inline-flex items-center gap-1.5">
          {label}
          {shortcut && (
            <kbd className="font-mono text-[0.62rem] bg-white/[0.08] border border-white/[0.12] px-1 py-[1px] rounded text-white/80">
              {shortcut}
            </kbd>
          )}
        </span>
      </TooltipContent>
    </Tooltip>
  )
}

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider, IconTooltip }
