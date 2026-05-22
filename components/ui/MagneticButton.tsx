'use client'
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion'
import { useRef, type ReactNode, type ButtonHTMLAttributes, type MouseEvent } from 'react'
import { cn } from '@/lib/utils'

interface MagneticButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'onAnimationStart' | 'onAnimationEnd' | 'onDragStart' | 'onDragEnd' | 'onDrag'> {
  children: ReactNode
  /** Intensidade do "pull" — quanto maior, mais o botão acompanha o cursor. Default: 0.35 */
  strength?: number
  /** Raio em px no qual o efeito magnético começa a agir. Default: 80 */
  radius?: number
}

/**
 * Botão com micro-physics: puxa ligeiramente em direção ao cursor.
 * Usa useMotionValue + useSpring (FORA do React render cycle) pra zero re-renders.
 *
 * Skill design-taste-frontend §4: "Magnetic Micro-physics. CRITICAL: NEVER use
 * React useState. Use EXCLUSIVELY useMotionValue and useTransform outside the
 * React render cycle to prevent performance collapse on mobile."
 */
export function MagneticButton({
  children,
  className,
  strength = 0.35,
  radius = 80,
  ...props
}: MagneticButtonProps) {
  const ref = useRef<HTMLButtonElement>(null)
  const x = useMotionValue(0)
  const y = useMotionValue(0)

  // Spring physics — não pula direto pro destino, "amolece" o tracking
  const springX = useSpring(x, { stiffness: 150, damping: 18, mass: 0.4 })
  const springY = useSpring(y, { stiffness: 150, damping: 18, mass: 0.4 })

  // Children também movem um pouco, mas com força menor (sensação de "peso interno")
  const childX = useTransform(springX, (v) => v * 0.5)
  const childY = useTransform(springY, (v) => v * 0.5)

  const handleMouseMove = (e: MouseEvent<HTMLButtonElement>) => {
    if (!ref.current) return
    const rect = ref.current.getBoundingClientRect()
    const cx = rect.left + rect.width / 2
    const cy = rect.top + rect.height / 2
    const dx = e.clientX - cx
    const dy = e.clientY - cy
    const dist = Math.sqrt(dx * dx + dy * dy)

    if (dist < radius + Math.max(rect.width, rect.height) / 2) {
      x.set(dx * strength)
      y.set(dy * strength)
    } else {
      x.set(0)
      y.set(0)
    }
  }

  const handleMouseLeave = () => {
    x.set(0)
    y.set(0)
  }

  return (
    <motion.button
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{ x: springX, y: springY }}
      className={cn(className)}
      {...(props as any)}
    >
      <motion.span style={{ x: childX, y: childY, display: 'inline-flex', alignItems: 'center', gap: '0.375rem' }}>
        {children}
      </motion.span>
    </motion.button>
  )
}
