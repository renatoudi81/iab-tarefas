'use client'
import { useRef, useState, type ReactNode, type MouseEvent } from 'react'
import { cn } from '@/lib/utils'

interface SpotlightCardProps {
  children: ReactNode
  className?: string
  /** Cor do spotlight (default: azul do projeto) */
  color?: string
  /** Raio do spotlight em px (default: 350) */
  radius?: number
  /** Intensidade do brilho 0-1 (default: 0.10) */
  intensity?: number
}

/**
 * Card com borda que ilumina dinamicamente onde o mouse está.
 * Skill design-taste-frontend: "Spotlight Border Card — Card borders that
 * illuminate dynamically under the cursor."
 *
 * Implementação: pseudo-overlay com radial-gradient seguindo as coordenadas
 * do mouse via CSS custom properties. Zero re-renders no React.
 */
export function SpotlightCard({
  children,
  className,
  color = '#2563EB',
  radius = 350,
  intensity = 0.10,
}: SpotlightCardProps) {
  const ref = useRef<HTMLDivElement>(null)
  const [active, setActive] = useState(false)

  const handleMouseMove = (e: MouseEvent<HTMLDivElement>) => {
    if (!ref.current) return
    const rect = ref.current.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    ref.current.style.setProperty('--mouse-x', `${x}px`)
    ref.current.style.setProperty('--mouse-y', `${y}px`)
  }

  return (
    <div
      ref={ref}
      onMouseEnter={() => setActive(true)}
      onMouseLeave={() => setActive(false)}
      onMouseMove={handleMouseMove}
      className={cn('relative isolate overflow-hidden', className)}
      style={
        {
          '--spot-color': color,
          '--spot-radius': `${radius}px`,
          '--spot-intensity': intensity,
        } as React.CSSProperties
      }
    >
      {/* Spotlight overlay — segue o mouse, fade in/out smooth */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 transition-opacity duration-300"
        style={{
          opacity: active ? 1 : 0,
          background: `radial-gradient(var(--spot-radius) circle at var(--mouse-x) var(--mouse-y), color-mix(in srgb, var(--spot-color) calc(var(--spot-intensity) * 100%), transparent), transparent 40%)`,
        }}
      />
      {/* Inner border highlight on hover (1px ring premium) */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 rounded-[inherit] transition-opacity duration-300"
        style={{
          opacity: active ? 1 : 0,
          boxShadow: 'inset 0 0 0 1px color-mix(in srgb, var(--spot-color) 30%, transparent)',
        }}
      />
      <div className="relative">{children}</div>
    </div>
  )
}
